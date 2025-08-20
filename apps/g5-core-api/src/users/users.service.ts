import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async findById(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    return { id: user.id, email: user.email, tenantId: user.tenantId };
  }

  async changePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException();
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Invalid current password');
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(user);
    return { changed: true };
  }
}
