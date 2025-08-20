import { Body, Controller, Post, Req, Get, Delete, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppRequest, getUserId } from '../types/request-context';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ register: { limit: 5, ttl: 300 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ login: { limit: 10, ttl: 60 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @Throttle({ refresh: { limit: 30, ttl: 60 } })
  refresh(@Body('refreshToken') token: string) {
    return this.auth.refresh(token);
  }

  @Post('logout')
  @Throttle({ logout: { limit: 30, ttl: 60 } })
  logout(@Body('refreshToken') token: string) {
    return this.auth.logout(token);
  }

  // Revoke a specific refresh token by its raw token
  @UseGuards(JwtAuthGuard)
  @Delete('refresh/:token')
  revokeOne(@Req() req: AppRequest, @Param('token') token: string) {
    const user = req.user!;
    return this.auth.revokeOne(getUserId(user)!, token);
  }

  // Revoke all refresh tokens for current user
  @UseGuards(JwtAuthGuard)
  @Delete('refresh')
  revokeAll(@Req() req: AppRequest) {
    const user = req.user!;
    return this.auth.revokeAll(getUserId(user)!);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AppRequest) {
    const user = req.user!;
    return this.auth.me(getUserId(user)!);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite')
  @Throttle({ invite: { limit: 20, ttl: 3600 } })
  invite(@Req() req: AppRequest, @Body('email') email: string, @Body('role') role: string) {
    return this.auth.invite(req.user!.tenantId, email, role);
  }

  @Post('accept-invite')
  @Throttle({ acceptInvite: { limit: 10, ttl: 3600 } })
  acceptInvite(@Body('token') token: string, @Body('password') password: string) {
    return this.auth.acceptInvite(token, password);
  }

  @Post('forgot-password')
  @Throttle({ forgotPassword: { limit: 5, ttl: 1800 } })
  forgot(@Body('tenantSlug') tenantSlug: string, @Body('email') email: string) {
    return this.auth.forgotPassword(tenantSlug, email);
  }

  @Post('reset-password')
  @Throttle({ resetPassword: { limit: 10, ttl: 600 } })
  reset(@Body('token') token: string, @Body('password') password: string) {
    return this.auth.resetPassword(token, password);
  }
}
