import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async validateAndGetUser(externalAuthId: string, email?: string, accessToken?: string) {
    let resolvedEmail = email;

    if (!resolvedEmail && accessToken) {
      const issuer = this.configService.get<string>('AUTH0_ISSUER');

      if (!issuer) {
        throw new UnauthorizedException('Auth0 issuer is not configured');
      }

      const userInfoResponse = await fetch(new URL('userinfo', issuer).toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new UnauthorizedException('Unable to load Auth0 user profile');
      }

      const userInfo = (await userInfoResponse.json()) as {
        email?: string;
      };

      resolvedEmail = userInfo.email;
    }

    if (!resolvedEmail) {
      throw new UnauthorizedException('Authenticated user email is missing from token');
    }

    // Upsert user from Auth0 JWT
    const user = await this.usersService.upsertFromAuth0(externalAuthId, resolvedEmail);
    return this.usersService.getUserWithRoles(user.id);
  }

  async getUserById(userId: number) {
    return this.usersService.getUserWithRoles(userId);
  }
}
