import { Controller, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Request } from 'express';

interface AuthedRequest extends Request {
  user?: { sub: string; tenantId: string };
}

@ApiTags('auth')
@ApiBearerAuth('jwt')
@UseGuards(TenantGuard)
@Controller('sessions')
export class SessionsController {
  constructor(@InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>) {}

  @Get()
  @ApiOperation({ summary: 'List active refresh sessions (current user)' })
  async list(@Req() req: AuthedRequest) {
    const userId = req.user!.sub;
    const tenantId = req.user!.tenantId;
    const tokens = await this.refreshRepo.find({ where: { userId, tenantId } });
    return tokens.map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      revokedAt: t.revokedAt,
      active: !t.revokedAt && (!t.expiresAt || t.expiresAt.getTime() > Date.now()),
    }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a specific refresh session by id' })
  async revoke(@Param('id') id: string, @Req() req: AuthedRequest) {
    const userId = req.user!.sub;
    const token = await this.refreshRepo.findOne({ where: { id, userId } });
    if (token && !token.revokedAt) {
      token.revokedAt = new Date();
      await this.refreshRepo.save(token);
    }
    return { revoked: true };
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke all refresh sessions for current user' })
  async revokeAll(@Req() req: AuthedRequest) {
    const userId = req.user!.sub;
    const tokens = await this.refreshRepo.find({ where: { userId } });
    const now = new Date();
    for (const t of tokens) if (!t.revokedAt) t.revokedAt = now;
    if (tokens.length) await this.refreshRepo.save(tokens);
    return { revoked: tokens.length };
  }
}
