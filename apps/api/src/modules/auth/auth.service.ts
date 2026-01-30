import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateAndGetUser(externalAuthId: string, email: string) {
    // Upsert user from Auth0 JWT
    const user = await this.usersService.upsertFromAuth0(externalAuthId, email);
    return this.usersService.getUserWithRoles(user.id);
  }

  async getUserById(userId: number) {
    return this.usersService.getUserWithRoles(userId);
  }
}
