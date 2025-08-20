import { SetMetadata } from '@nestjs/common';
import { Permission } from '../auth/permissions';
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...perms: Permission[]) => SetMetadata(PERMISSIONS_KEY, perms);
