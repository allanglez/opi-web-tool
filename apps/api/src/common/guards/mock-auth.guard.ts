import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
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

    // Use provided user ID or default to first admin user
    let userId: number;
    if (mockUserId) {
      userId = parseInt(mockUserId, 10);
    } else {
      // Find first admin user in database
      const adminUser = await this.prisma.user.findFirst({
        where: {
          isActive: true,
          userRoles: {
            some: {
              role: {
                name: 'ADMIN',
              },
            },
          },
        },
      });

      if (!adminUser) {
        // If no admin exists, use user ID 1 as fallback
        userId = 1;
      } else {
        userId = adminUser.id;
      }
    }

    // Fetch full user data with roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user) {
      request.user = {
        id: user.id,
        externalAuthId: user.externalAuthId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        roles: user.userRoles.map((ur) => ur.role.name),
        mockAuth: true,
      };
    } else {
      // Fallback mock user if database lookup fails
      request.user = {
        id: userId,
        externalAuthId: 'mock-user',
        email: 'admin@mock.local',
        firstName: 'Mock',
        lastName: 'Admin',
        isActive: true,
        roles: ['ADMIN'],
        mockAuth: true,
      };
    }

    return true;
  }
}
