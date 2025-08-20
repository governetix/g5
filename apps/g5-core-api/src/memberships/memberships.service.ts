import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(@InjectRepository(Membership) private repo: Repository<Membership>) {}

  async list(tenantId: string) {
    return this.repo.find({ where: { tenantId } });
  }

  async add(tenantId: string, dto: CreateMembershipDto, actingRole: string) {
    if (!['OWNER', 'ADMIN'].includes(actingRole)) throw new ForbiddenException();
    const m = this.repo.create({ tenantId, userId: dto.userId, role: dto.role });
    return this.repo.save(m);
  }

  async update(tenantId: string, id: string, dto: UpdateMembershipDto, actingRole: string) {
    const m = await this.repo.findOne({ where: { id, tenantId } });
    if (!m) throw new NotFoundException();
    if (dto.role && actingRole !== 'OWNER') throw new ForbiddenException();
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async remove(tenantId: string, id: string, actingRole: string) {
    const m = await this.repo.findOne({ where: { id, tenantId } });
    if (!m) throw new NotFoundException();
    if (!['OWNER', 'ADMIN'].includes(actingRole)) throw new ForbiddenException();
    await this.repo.remove(m);
    return { deleted: true };
  }

  async findRole(tenantId: string, userId: string) {
    const m = await this.repo.findOne({ where: { tenantId, userId } });
    return m?.role;
  }
}
