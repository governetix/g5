import { IsUUID, IsIn } from 'class-validator';
import { Role } from '../../common/decorators/roles.decorator';

export class CreateMembershipDto {
  @IsUUID()
  userId!: string;

  @IsIn(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'])
  role!: Role;
}
