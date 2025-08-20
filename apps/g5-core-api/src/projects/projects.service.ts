import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/pagination/pagination.util';
import { PaginationQuery } from '../common/pagination/pagination.dto';
import { Project } from '../entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(Project) private repo: Repository<Project>) {}

  async create(tenantId: string, dto: CreateProjectDto) {
    const existing = await this.repo.findOne({ where: { tenantId, key: dto.key } });
    if (existing) throw new ConflictException('Key already exists');
    const project = this.repo.create({
      tenantId,
      key: dto.key,
      name: dto.name,
      description: dto.description,
    });
    return this.repo.save(project);
  }

  list(tenantId: string, pq?: PaginationQuery) {
    if (!pq) return this.repo.find({ where: { tenantId } });
    const qb = this.repo.createQueryBuilder('p').where('p.tenantId = :tenantId', { tenantId });
    return paginate(qb, pq, 'createdAt');
  }

  async get(tenantId: string, id: string) {
    const project = await this.repo.findOne({ where: { tenantId, id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.get(tenantId, id);
    Object.assign(project, dto);
    return this.repo.save(project);
  }

  async remove(tenantId: string, id: string) {
    const project = await this.get(tenantId, id);
    await this.repo.remove(project);
    return { deleted: true };
  }
}
