/**
 * User Role Constants
 *
 * Defines the role hierarchy and permissions.
 */

export type AppRole = 'OWNER' | 'MANAGER' | 'VIEWER';

export interface RoleInfo {
  label: string;
  description: string;
  permissions: string[];
}

export const USER_ROLES: Record<AppRole, RoleInfo> = {
  OWNER: {
    label: 'Owner',
    description: 'Full access to all features including billing and team management',
    permissions: [
      'Manage billing and subscriptions',
      'Invite and remove team members',
      'Change member roles',
      'Delete workspace',
      'All Manager permissions',
    ],
  },
  MANAGER: {
    label: 'Manager',
    description: 'Can create and manage agents, personas, and knowledge bases',
    permissions: [
      'Create and edit agents',
      'Create and edit personas',
      'Manage knowledge bases',
      'View analytics',
      'Manage channel configurations',
      'All Viewer permissions',
    ],
  },
  VIEWER: {
    label: 'Viewer',
    description: 'Read-only access to view agents, sessions, and analytics',
    permissions: [
      'View agents and configurations',
      'View chat sessions',
      'View leads',
      'View analytics (read-only)',
    ],
  },
};

export const ROLE_HIERARCHY: AppRole[] = ['OWNER', 'MANAGER', 'VIEWER'];

/**
 * Check if a role has at least the minimum required role level
 */
export function hasMinRole(userRole: AppRole, minRole: AppRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const minIndex = ROLE_HIERARCHY.indexOf(minRole);
  return userIndex <= minIndex; // Lower index = higher permission
}

export const ROLE_OPTIONS = Object.entries(USER_ROLES).map(([value, info]) => ({
  value: value as AppRole,
  label: info.label,
  description: info.description,
}));
