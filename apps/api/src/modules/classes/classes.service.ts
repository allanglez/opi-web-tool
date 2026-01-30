import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async getClasses(cycleId?: number, schoolId?: number, programId?: number) {
    return this.prisma.class.findMany({
      where: {
        ...(cycleId && { cycleId }),
        ...(schoolId && { schoolId }),
        ...(programId && { programId }),
      },
      include: {
        school: {
          select: {
            id: true,
            schoolCode: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            classStudents: true,
          },
        },
      },
      orderBy: [
        { school: { name: 'asc' } },
        { classCode: 'asc' },
      ],
    });
  }

  async updateClass(classId: number, dto: UpdateClassDto) {
    const existingClass = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: dto,
      include: {
        school: {
          select: {
            id: true,
            schoolCode: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async bulkUpdateInclusion(classIds: number[], isIncluded: boolean) {
    return this.prisma.class.updateMany({
      where: {
        id: {
          in: classIds,
        },
      },
      data: {
        isIncluded,
      },
    });
  }
}
