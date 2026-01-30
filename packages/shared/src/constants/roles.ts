export const ROLES = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  EVALUATOR: 'EVALUATOR',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
