import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { Membership } from '../entities/membership.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EventsService } from '../events/events.service';
import { DomainEventType } from '../events/event-types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Tenant) private tenants: Repository<Tenant>,
    @InjectRepository(Membership) private memberships: Repository<Membership>,
    @InjectRepository(RefreshToken) private refreshTokens: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokens: Repository<PasswordResetToken>,
    private events: EventsService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const tenant = await this.tenants.findOne({ where: { slug: dto.tenantSlug } });
    if (!tenant) throw new UnauthorizedException('Tenant not found');
    const existing = await this.users.findOne({ where: { tenantId: tenant.id, email: dto.email } });
    if (existing) throw new ConflictException('Email already used');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.users.create({ tenantId: tenant.id, email: dto.email, passwordHash });
    await this.users.save(user);
    const membership = this.memberships.create({
      tenantId: tenant.id,
      userId: user.id,
      role: 'OWNER',
    });
    await this.memberships.save(membership);
    return { user: { id: user.id, email: user.email, tenantId: user.tenantId } };
  }

  async validateUser(tenantSlug: string, email: string, pass: string) {
    const tenant = await this.tenants.findOne({ where: { slug: tenantSlug } });
    if (!tenant) return null;
    const user = await this.users.findOne({ where: { tenantId: tenant.id, email } });
    if (!user || !user.passwordHash) return null;
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (!ok) return null;
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.tenantSlug, dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user);
  }

  me(userId: string) {
    return this.users.findOne({ where: { id: userId }, select: ['id', 'email', 'tenantId'] });
  }

  async invite(tenantId: string, email: string, role: string) {
    const validRoles = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'];
    if (!validRoles.includes(role)) throw new BadRequestException('Invalid role');
    const existingUser = await this.users.findOne({ where: { tenantId, email } });
    if (existingUser) {
      const m = await this.memberships.findOne({ where: { tenantId, userId: existingUser.id } });
      if (m) return { alreadyMember: true };
    }
    const token = crypto.randomBytes(20).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    // create placeholder user if not exists
    let user = existingUser;
    if (!user) {
      user = this.users.create({ tenantId, email });
      await this.users.save(user);
    }
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const assignedRole = (role || 'VIEWER') as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    const membership = this.memberships.create({
      tenantId,
      userId: user.id,
      role: assignedRole,
      status: 'INVITED',
      inviteToken: tokenHash,
      inviteExpiresAt: expiresAt,
    });
    await this.memberships.save(membership);
    this.events.emit({
      type: DomainEventType.INVITE_SENT,
      tenantId,
      occurredAt: new Date(),
  payload: { membershipId: membership.id, email, role: assignedRole },
    });
    return { invited: true, token }; // token would be emailed
  }

  async acceptInvite(rawToken: string, password: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const membership = await this.memberships.findOne({ where: { inviteToken: tokenHash } });
    if (!membership) throw new UnauthorizedException('Invalid invite');
    if (membership.inviteExpiresAt && membership.inviteExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invite expired');
    }
    if (membership.status === 'ACTIVE') throw new ConflictException('Invite already used');
    const user = await this.users.findOne({ where: { id: membership.userId } });
    if (!user) throw new UnauthorizedException('User missing');
    user.passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(user);
    membership.status = 'ACTIVE';
    membership.inviteToken = null;
    membership.inviteExpiresAt = null;
    await this.memberships.save(membership);
    this.events.emit({
      type: DomainEventType.INVITE_ACCEPTED,
      tenantId: membership.tenantId,
      occurredAt: new Date(),
      payload: { membershipId: membership.id, userId: membership.userId },
    });
    return { accepted: true };
  }

  async forgotPassword(tenantSlug: string, email: string) {
    const tenant = await this.tenants.findOne({ where: { slug: tenantSlug } });
    if (!tenant) return { sent: true };
    const user = await this.users.findOne({ where: { tenantId: tenant.id, email } });
    if (!user) return { sent: true };
    const raw = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    // cleanup old
    const old = await this.passwordResetTokens.find({ where: { userId: user.id } });
    for (const o of old) await this.passwordResetTokens.delete(o.id);
    const prt = this.passwordResetTokens.create({
      tenantId: tenant.id,
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.passwordResetTokens.save(prt);
    this.events.emit({
      type: DomainEventType.PASSWORD_RESET_REQUESTED,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { userId: user.id, email },
    });
    return { sent: true, token: raw }; // would email token
  }

  async resetPassword(raw: string, password: string) {
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const prt = await this.passwordResetTokens.findOne({ where: { tokenHash } });
    if (!prt || prt.usedAt || prt.expiresAt.getTime() < Date.now())
      throw new UnauthorizedException('Invalid token');
    const user = await this.users.findOne({ where: { id: prt.userId } });
    if (!user) throw new UnauthorizedException('User missing');
    user.passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(user);
    prt.usedAt = new Date();
    await this.passwordResetTokens.save(prt);
    this.events.emit({
      type: DomainEventType.PASSWORD_RESET_DONE,
      tenantId: prt.tenantId,
      occurredAt: new Date(),
      payload: { userId: user.id },
    });
    return { reset: true };
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, tenantId: user.tenantId, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '15m' });
    // create refresh token random value
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30d
    // optional cleanup of expired tokens for this user
    const old = await this.refreshTokens.find({
      where: { userId: user.id, tenantId: user.tenantId },
    });
    const now = Date.now();
    for (const t of old) {
      if (t.expiresAt && t.expiresAt.getTime() < now) {
        await this.refreshTokens.delete(t.id);
      }
    }
    const rt = this.refreshTokens.create({
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokens.save(rt);
    return {
      accessToken,
      refreshToken: raw,
      user: { id: user.id, email: user.email, tenantId: user.tenantId },
    };
  }

  async refresh(raw: string) {
    if (!raw) throw new UnauthorizedException('No refresh token');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const existing = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (!existing || existing.revokedAt) throw new UnauthorizedException('Invalid refresh token');
    if (existing.expiresAt && existing.expiresAt.getTime() < Date.now())
      throw new UnauthorizedException('Expired');
    const user = await this.users.findOne({ where: { id: existing.userId } });
    if (!user) throw new UnauthorizedException('User missing');
    // rotate: revoke old
    existing.revokedAt = new Date();
    await this.refreshTokens.save(existing);
    return this.issueTokens(user);
  }

  async logout(raw: string) {
    if (!raw) return { revoked: false };
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const existing = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (existing && !existing.revokedAt) {
      existing.revokedAt = new Date();
      await this.refreshTokens.save(existing);
      return { revoked: true };
    }
    return { revoked: false };
  }

  async revokeOne(userId: string, raw: string) {
    if (!raw) throw new BadRequestException('No token');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const rt = await this.refreshTokens.findOne({ where: { tokenHash, userId } });
    if (!rt) throw new NotFoundException('Token not found');
    if (!rt.revokedAt) {
      rt.revokedAt = new Date();
      await this.refreshTokens.save(rt);
    }
    return { revoked: true };
  }

  async revokeAll(userId: string) {
    const tokens = await this.refreshTokens.find({ where: { userId } });
    const now = new Date();
    for (const t of tokens) {
      if (!t.revokedAt) t.revokedAt = now;
    }
    if (tokens.length) await this.refreshTokens.save(tokens);
    return { revoked: tokens.length };
  }
}
