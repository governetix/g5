import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../entities/theme.entity';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@Injectable()
export class ThemesService {
  constructor(@InjectRepository(Theme) private repo: Repository<Theme>) {}

  list(tenantId: string) {
    return this.repo.find({ where: { tenantId } });
  }

  async create(tenantId: string, dto: CreateThemeDto) {
    if (dto.name && (await this.repo.findOne({ where: { tenantId, name: dto.name } }))) {
      throw new Error('Theme name exists');
    }
    const theme = this.repo.create({ tenantId, ...dto, isDefault: false });
    return this.repo.save(theme);
  }

  async update(tenantId: string, id: string, dto: UpdateThemeDto) {
    const theme = await this.repo.findOne({ where: { id, tenantId } });
    if (!theme) throw new NotFoundException();
    Object.assign(theme, dto);
    if (dto.isDefault) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
      theme.isDefault = true;
    }
    return this.repo.save(theme);
  }

  async remove(tenantId: string, id: string) {
    const theme = await this.repo.findOne({ where: { id, tenantId } });
    if (!theme) throw new NotFoundException();
    await this.repo.remove(theme);
    return { deleted: true };
  }
}
