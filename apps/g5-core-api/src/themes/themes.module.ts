import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from '../entities/theme.entity';
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Theme])],
  providers: [ThemesService],
  controllers: [ThemesController],
  exports: [ThemesService],
})
export class ThemesModule {}
