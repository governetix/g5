import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../entities/theme.entity';
import { ThemeSnapshot } from '../entities/theme-snapshot.entity';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { CreateThemeSnapshotDto } from './dto/create-theme-snapshot.dto';
import { RollbackThemeDto } from './dto/rollback-theme.dto';

@Injectable()
export class ThemesService {
  constructor(
    @InjectRepository(Theme) private repo: Repository<Theme>,
    @InjectRepository(ThemeSnapshot) private snapRepo: Repository<ThemeSnapshot>,
  ) {}

  async list(tenantId: string) {
    const themes = await this.repo.find({ where: { tenantId } });
    if (themes.length === 0 && process.env.DEV_AUTO_THEME === 'true') {
      const created = this.repo.create({ tenantId, name: 'Default', isDefault: true });
      await this.repo.save(created);
      return [created];
    }
    return themes;
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

  // --- Snapshots ---
  async listSnapshots(tenantId: string, themeId: string) {
    const theme = await this.repo.findOne({ where: { id: themeId, tenantId } });
    if (!theme) throw new NotFoundException();
    return this.snapRepo.find({ where: { themeId }, order: { version: 'DESC' } });
  }

  async createSnapshot(tenantId: string, themeId: string, dto: CreateThemeSnapshotDto) {
    const theme = await this.repo.findOne({ where: { id: themeId, tenantId } });
    if (!theme) throw new NotFoundException();
    const last = await this.snapRepo.findOne({ where: { themeId }, order: { version: 'DESC' } });
    const version = last ? last.version + 1 : 1;
    const snapshot = this.snapRepo.create({ themeId, version, tokens: dto.tokens, label: dto.label || null });
    const saved = await this.snapRepo.save(snapshot);
    if (dto.activate || !theme.activeSnapshotId) {
      theme.activeSnapshotId = saved.id;
      await this.repo.save(theme);
    }
    return saved;
  }

  async rollback(tenantId: string, themeId: string, dto: RollbackThemeDto) {
    const theme = await this.repo.findOne({ where: { id: themeId, tenantId } });
    if (!theme) throw new NotFoundException();
    const target = await this.snapRepo.findOne({ where: { id: dto.snapshotId, themeId } });
    if (!target) throw new BadRequestException('Snapshot not found for theme');
    // create a new snapshot copying tokens (isRollback true)
    const last = await this.snapRepo.findOne({ where: { themeId }, order: { version: 'DESC' } });
    const version = last ? last.version + 1 : 1;
    const newSnap = this.snapRepo.create({
      themeId,
      version,
      tokens: target.tokens,
      label: `rollback-to:${target.version}`,
      isRollback: true,
    });
    const saved = await this.snapRepo.save(newSnap);
    theme.activeSnapshotId = saved.id;
    await this.repo.save(theme);
    return saved;
  }

  async export(tenantId: string, id: string) {
    const theme = await this.repo.findOne({ where: { id, tenantId } });
    if (!theme) throw new NotFoundException();
    const activeSnap = theme.activeSnapshotId ? await this.snapRepo.findOne({ where: { id: theme.activeSnapshotId } }) : null;
    return {
      name: theme.name,
      tokens: activeSnap?.tokens || {},
    };
  }

  async import(tenantId: string, dto: any) {
    const newTheme = await this.create(tenantId, { name: dto.name });
    const snapshot = await this.createSnapshot(tenantId, newTheme.id, { tokens: dto.tokens, activate: true });
    return {
      theme: newTheme,
      snapshot,
    };
  }
}
