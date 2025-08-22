import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from '../entities/theme.entity';
import { ThemeSnapshot } from '../entities/theme-snapshot.entity';
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Theme, ThemeSnapshot])],
  providers: [ThemesService],
  controllers: [ThemesController],
  exports: [ThemesService],
})
export class ThemesModule {}
