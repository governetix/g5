import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppRequest, getUserId } from '../types/request-context';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdatePasswordDto } from './dto/update-password.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get('me')
  me(@Req() req: AppRequest) {
    const user = req.user!;
    return this.svc.findById(getUserId(user)!);
  }

  @Patch('me/password')
  changePassword(@Req() req: AppRequest, @Body() dto: UpdatePasswordDto) {
    const user = req.user!;
    return this.svc.changePassword(getUserId(user)!, dto);
  }
}
