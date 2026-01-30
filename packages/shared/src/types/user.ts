import { Role } from '../constants';

export interface User {
  id: number;
  externalAuthId: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  roles: Role[];
}
