export type UserRole = 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  trainer: 'Trainer',
  athlete: 'Athlete',
  nutritionist: 'Nutritionist',
  head_coach: 'Head Coach',
};

export const ROLE_LABELS_ES: Record<UserRole, string> = {
  admin: 'Administrador',
  trainer: 'Entrenador',
  athlete: 'Atleta',
  nutritionist: 'Nutricionista',
  head_coach: 'Head Coach',
};

export const ROLE_SATELLITE_ACCESS: Record<UserRole, string[]> = {
  admin: ['endurance', 'nutrition'],
  head_coach: ['endurance', 'nutrition'],
  trainer: ['endurance'],
  nutritionist: [],
  athlete: [],
};

export const USER_ROLES: UserRole[] = ['admin', 'trainer', 'athlete', 'nutritionist', 'head_coach'];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return !!value && USER_ROLES.includes(value as UserRole);
}
