import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationQuery } from '../common/pagination/pagination.dto';
import { Tenant } from '../entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@InjectRepository(Tenant) private repo: Repository<Tenant>) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    const tenant = this.repo.create({ slug: dto.slug, name: dto.name });
    return this.repo.save(tenant);
  }

  async findAll(pq?: PaginationQuery) {
    if (!pq) return this.repo.find();
    const qb = this.repo.createQueryBuilder('t');
    return paginate(qb, pq, 'createdAt');
  }

  async findBySlug(slug: string) {
    const t = await this.repo.findOne({ where: { slug } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async update(slug: string, dto: UpdateTenantDto) {
    const tenant = await this.findBySlug(slug);
    if (dto.name !== undefined) tenant.name = dto.name;
    return this.repo.save(tenant);
  }

  async setTheme(slug: string, body: Record<string, unknown>) {
    const tenant = await this.findBySlug(slug);
    tenant.themeSettings = body;
    return this.repo.save(tenant);
  }
}
