import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@Controller('me')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  async getMe(
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: { authorization?: string } },
  ) {
    // If mock auth, fetch user by ID
    if (user.mockAuth) {
      const fullUser = await this.authService.getUserById(user.id);
      if (!fullUser) {
        throw new Error('User not found');
      }
      return fullUser;
    }

    // If JWT auth, validate and upsert user
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    const fullUser = await this.authService.validateAndGetUser(
      user.externalAuthId,
      user.email,
      accessToken,
    );

    return fullUser;
  }
}
