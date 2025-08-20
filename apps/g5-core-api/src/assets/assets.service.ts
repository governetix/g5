import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationQuery } from '../common/pagination/pagination.dto';
import { Asset } from '../entities/asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(@InjectRepository(Asset) private repo: Repository<Asset>) {}

  async create(tenantId: string, dto: CreateAssetDto) {
    const exists = await this.repo.findOne({
      where: { tenantId, projectId: dto.projectId, name: dto.name },
    });
    if (exists) throw new ConflictException('Asset name already exists in project');
    const asset = this.repo.create({
      tenantId,
      projectId: dto.projectId,
      name: dto.name,
      type: dto.type as Asset['type'],
      target: dto.target,
    });
    return this.repo.save(asset);
  }

  list(tenantId: string, projectId?: string, pq?: PaginationQuery) {
    if (!pq) return this.repo.find({ where: projectId ? { tenantId, projectId } : { tenantId } });
    const qb = this.repo.createQueryBuilder('a').where('a.tenantId = :tenantId', { tenantId });
    if (projectId) qb.andWhere('a.projectId = :projectId', { projectId });
    return paginate(qb, pq, 'createdAt');
  }

  async get(tenantId: string, id: string) {
    const asset = await this.repo.findOne({ where: { tenantId, id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(tenantId: string, id: string, dto: UpdateAssetDto) {
    const asset = await this.get(tenantId, id);
    if (dto.name !== undefined) asset.name = dto.name;
    if (dto.type !== undefined) asset.type = dto.type as Asset['type'];
    if (dto.target !== undefined) asset.target = dto.target;
    return this.repo.save(asset);
  }

  async remove(tenantId: string, id: string) {
    const asset = await this.get(tenantId, id);
    await this.repo.remove(asset);
    return { deleted: true };
  }
}
