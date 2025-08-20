export type Permission =
  | 'tenant.read'
  | 'tenant.update'
  | 'project.create'
  | 'project.read'
  | 'project.update'
  | 'project.delete'
  | 'theme.manage'
  | 'apikey.manage'
  | 'webhook.manage'
  | 'membership.invite'
  | 'membership.read'
  | 'membership.update'
  | 'audit.read'
  | 'queue.dlq.read'
  | 'queue.dlq.retry'
  | 'metrics.read'
  | 'backup.restore';

export const ALL_PERMISSIONS: Permission[] = [
  'tenant.read',
  'tenant.update',
  'project.create',
  'project.read',
  'project.update',
  'project.delete',
  'theme.manage',
  'apikey.manage',
  'webhook.manage',
  'membership.invite',
  'membership.read',
  'membership.update',
  'audit.read',
  'queue.dlq.read',
  'queue.dlq.retry',
  'metrics.read',
  'backup.restore',
];

export type RoleKey = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  OWNER: [...ALL_PERMISSIONS],
  ADMIN: ALL_PERMISSIONS.filter((p) => p !== 'backup.restore'),
  EDITOR: [
    'project.create',
    'project.read',
    'project.update',
    'theme.manage',
    'webhook.manage',
    'apikey.manage',
    'membership.read',
    'audit.read',
    'metrics.read',
  ],
  VIEWER: [
    'project.read',
    'membership.read',
    'audit.read',
    'metrics.read',
    'tenant.read',
  ],
};

export function roleHasPermission(role: RoleKey, permission: Permission): boolean {
  if (role === 'OWNER') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
