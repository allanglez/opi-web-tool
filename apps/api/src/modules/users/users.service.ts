import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByExternalAuthId(externalAuthId: string) {
    return this.prisma.user.findUnique({
      where: { externalAuthId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async upsertFromAuth0(externalAuthId: string, email: string, firstName?: string, lastName?: string) {
    // First, try to find user by externalAuthId
    let user = await this.prisma.user.findUnique({
      where: { externalAuthId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // If not found by externalAuthId, check if a pre-created user exists with this email
    if (!user) {
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      // If a pre-created user exists with this email, link it to the Auth0 account
      if (existingUserByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            externalAuthId,
            lastLoginAt: new Date(),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });
        return user;
      }
    }

    // If user exists by externalAuthId, update login time and profile
    if (user) {
      user = await this.prisma.user.update({
        where: { externalAuthId },
        data: {
          lastLoginAt: new Date(),
          email,
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
      return user;
    }

    // If no user exists, create a new one with PENDING role
    const pendingRole = await this.prisma.role.findUnique({
      where: { name: 'PENDING' },
    });

    user = await this.prisma.user.create({
      data: {
        externalAuthId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        isActive: true,
        userRoles: pendingRole
          ? {
              create: {
                roleId: pendingRole.id,
              },
            }
          : undefined,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return user;
  }

  async getUserWithRoles(userId: number) {
    const user = await this.findById(userId);
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      externalAuthId: user.externalAuthId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      statusChangedAt: user.statusChangedAt,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }

  async listAllWithRoles() {
    const users = await this.prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      statusChangedAt: user.statusChangedAt,
      roles: user.userRoles.map((ur) => ur.role.name),
    }));
  }

  async createUserWithRole(data: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: data.role },
    });

    if (!role) {
      throw new Error(`Role '${data.role}' does not exist`);
    }

    const user = await this.prisma.user.create({
      data: {
        externalAuthId: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        isActive: true,
        userRoles: {
          create: {
            roleId: role.id,
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
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }

  async updateUserWithRole(
    userId: number,
    data: { firstName: string; lastName: string; email: string; role: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: data.role },
    });
    if (!role) {
      throw new Error(`Role '${data.role}' does not exist`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      },
    });

    await this.prisma.userRole.deleteMany({ where: { userId } });
    await this.prisma.userRole.create({
      data: { userId, roleId: role.id },
    });

    return this.getUserWithRoles(userId);
  }

  async setActiveStatus(userId: number, isActive: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        isActive,
        statusChangedAt: new Date(),
      },
    });
    return this.getUserWithRoles(userId);
  }
}
