import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) { }

  async getActiveCycle() {
    const cycle = await this.prisma.assessmentCycle.findFirst({
      where: { isActive: true },
      include: {
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!cycle) {
      return null;
    }

    return {
      ...cycle,
      isApproved: !!cycle.dataApprovedAt,
    };
  }

  async createCycle(dto: CreateCycleDto, _userId: number) {
    const existingActive = await this.prisma.assessmentCycle.findFirst({
      where: { isActive: true },
    });

    if (existingActive) {
      throw new BadRequestException('An active cycle already exists. Deactivate it first.');
    }

    const startsOn = new Date(dto.startsOn);
    const endsOn = new Date(dto.endsOn);

    if (endsOn <= startsOn) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.assessmentCycle.create({
      data: {
        name: dto.name,
        year: dto.year,
        startsOn,
        endsOn,
        isActive: true,
      },
    });
  }

  async updateCycle(cycleId: number, dto: UpdateCycleDto) {
    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    if (cycle.dataApprovedAt) {
      throw new BadRequestException('Cannot edit a cycle that has already been approved');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startsOn !== undefined) data.startsOn = new Date(dto.startsOn);
    if (dto.endsOn !== undefined) data.endsOn = new Date(dto.endsOn);

    if (data.startsOn && data.endsOn && (data.endsOn as Date) <= (data.startsOn as Date)) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.assessmentCycle.update({
      where: { id: cycleId },
      data,
    });
  }

  async approveCycle(cycleId: number, userId: number) {
    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    if (cycle.dataApprovedAt) {
      throw new BadRequestException('Cycle data is already approved');
    }

    const ingestionLogs = await this.prisma.ingestionLog.findMany({
      take: 1,
    });

    if (ingestionLogs.length === 0) {
      throw new BadRequestException('Cannot approve cycle without any ingestion data');
    }

    return this.prisma.assessmentCycle.update({
      where: { id: cycleId },
      data: {
        dataApprovedAt: new Date(),
        dataApprovedBy: userId,
      },
      include: {
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async checkCycleApproval() {
    const cycle = await this.prisma.assessmentCycle.findFirst({
      where: { isActive: true },
    });

    if (!cycle) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'No active cycle exists',
        error: 'CYCLE_NOT_APPROVED',
      });
    }

    if (!cycle.dataApprovedAt) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Cycle data has not been approved by an administrator',
        error: 'CYCLE_NOT_APPROVED',
      });
    }

    return cycle;
  }

  async getIngestionStatus(cycleId: number) {
    const cycle = await this.prisma.assessmentCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    const logs = await this.prisma.ingestionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const counts = await this.prisma.$transaction([
      this.prisma.school.count(),
      this.prisma.program.count(),
      this.prisma.class.count({ where: { cycleId } }),
      this.prisma.student.count({ where: { cycleId } }),
      this.prisma.classStudent.count(),
    ]);

    return {
      cycle,
      logs,
      counts: {
        schools: counts[0],
        programs: counts[1],
        classes: counts[2],
        students: counts[3],
        enrollments: counts[4],
      },
    };
  }
}
