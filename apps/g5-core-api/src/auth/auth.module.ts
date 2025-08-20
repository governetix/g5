import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionsController } from './sessions.controller';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { Membership } from '../entities/membership.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Membership, RefreshToken, PasswordResetToken]),
    EventsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES') || '15m' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, SessionsController],
  exports: [AuthService],
})
export class AuthModule {}
