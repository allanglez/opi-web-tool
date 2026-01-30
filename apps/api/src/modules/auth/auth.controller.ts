import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('me')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

  @Get()
  async getMe(@CurrentUser() user: AuthUser) {
    // If mock auth, fetch user by ID
    if (user.mockAuth) {
      const fullUser = await this.authService.getUserById(user.id);
      if (!fullUser) {
        throw new Error('User not found');
      }
      return fullUser;
    }

    // If JWT auth, validate and upsert user
    const fullUser = await this.authService.validateAndGetUser(
      user.externalAuthId,
      user.email,
    );

    return fullUser;
  }
}
