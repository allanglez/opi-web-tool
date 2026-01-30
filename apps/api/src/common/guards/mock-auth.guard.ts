import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const mockUserId = request.headers['x-mock-user-id'];

    if (!mockUserId) {
      throw new UnauthorizedException('X-Mock-User-Id header is required when AUTH_MOCK=true');
    }

    // Mock user will be populated by the auth service
    request.user = {
      id: parseInt(mockUserId, 10),
      mockAuth: true,
    };

    return true;
  }
}
