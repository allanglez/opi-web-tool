import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * ActiveUserGuard ensures that authenticated users have isActive = true.
 * Deactivated users can authenticate via MyYukon but cannot access OPI.
 * This guard runs after authentication guards (JWT or Mock).
 */
@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user is attached (shouldn't happen after auth guard), deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new ForbiddenException(
        'Your account has been deactivated. Please contact an administrator for assistance.',
      );
    }

    return true;
  }
}
