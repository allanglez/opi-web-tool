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
    const user = await this.prisma.user.upsert({
      where: { externalAuthId },
      update: {
        lastLoginAt: new Date(),
        email,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
      create: {
        externalAuthId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        isActive: true,
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
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
