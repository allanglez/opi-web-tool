import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MockAuthGuard } from '../../common/guards/mock-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('me')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(
    // Use MockAuthGuard if AUTH_MOCK=true, otherwise JwtAuthGuard
    process.env.AUTH_MOCK === 'true' ? MockAuthGuard : JwtAuthGuard,
  )
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
