import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from '../entities/feature-flag.entity';

@Injectable()
export class FeatureFlagsService {
  constructor(@InjectRepository(FeatureFlag) private repo: Repository<FeatureFlag>) {}

  list() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async upsert(key: string, enabled: boolean, description?: string) {
    let ff = await this.repo.findOne({ where: { key } });
    if (!ff) {
      ff = this.repo.create({ key, enabled, description });
    } else {
      ff.enabled = enabled;
      if (description !== undefined) ff.description = description;
    }
    return this.repo.save(ff);
  }
}
