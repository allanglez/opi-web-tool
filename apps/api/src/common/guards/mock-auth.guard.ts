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
    const mockRoleHeader = request.headers['x-mock-role'];
    const mockRole =
      typeof mockRoleHeader === 'string' && mockRoleHeader.trim().length > 0
        ? mockRoleHeader.trim().toUpperCase()
        : undefined;

    let user =
      mockRole
        ? await this.prisma.user.findFirst({
            where: {
              isActive: true,
              userRoles: {
                some: {
                  role: {
                    name: mockRole,
                  },
                },
              },
            },
            include: {
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          })
        : null;

    // Use provided user ID or default to first admin user
    let userId: number;
    if (user) {
      userId = user.id;
    } else if (mockUserId) {
      userId = parseInt(mockUserId, 10);
    } else {
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
        userId = 1;
      } else {
        userId = adminUser.id;
      }
    }

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    }

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
      request.user = {
        id: userId,
        externalAuthId: 'mock-user',
        email: `${(mockRole || 'admin').toLowerCase()}@mock.local`,
        firstName: 'Mock',
        lastName: mockRole || 'Admin',
        isActive: true,
        roles: [mockRole || 'ADMIN'],
        mockAuth: true,
      };
    }

    return true;
  }
}
