import { IsIn, IsOptional } from 'class-validator';
import { Role } from '../../common/decorators/roles.decorator';

export class UpdateMembershipDto {
  @IsOptional()
  @IsIn(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'])
  role?: Role;
}
