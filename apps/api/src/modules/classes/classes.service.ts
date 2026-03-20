import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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
        teacher: {
          select: {
            id: true,
            teacherId: true,
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

  async updateClass(classId: number, dto: UpdateClassDto, userId?: number) {
    const existingClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { id: true, teacherId: true, name: true } },
        program: { select: { id: true, name: true } },
      },
    });

    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    // If only isIncluded is being toggled (existing behavior), skip audit
    const isManualEdit = dto.teacherId !== undefined
      || dto.grade !== undefined
      || dto.programId !== undefined;

    if (!isManualEdit) {
      return this.prisma.class.update({
        where: { id: classId },
        data: { isIncluded: dto.isIncluded },
        include: {
          school: { select: { id: true, schoolCode: true, name: true } },
          program: { select: { id: true, name: true } },
          teacher: { select: { id: true, teacherId: true, name: true } },
        },
      });
    }

    if (!userId) {
      throw new Error('userId is required for manual class edits');
    }

    const auditEntries: Array<{
      entityType: 'CLASS';
      entityId: number;
      action: 'CLASS_EDIT';
      userId: number;
      fieldName: string;
      oldValue: string;
      newValue: string;
    }> = [];

    const updateData: Record<string, unknown> = {
      isManuallyEdited: true,
    };

    if (dto.isIncluded !== undefined) {
      updateData.isIncluded = dto.isIncluded;
    }

    // Handle grade change
    if (dto.grade !== undefined && dto.grade !== existingClass.grade) {
      auditEntries.push({
        entityType: 'CLASS',
        entityId: classId,
        action: 'CLASS_EDIT',
        userId,
        fieldName: 'grade',
        oldValue: String(existingClass.grade ?? ''),
        newValue: String(dto.grade ?? ''),
      });
      updateData.grade = dto.grade;
    }

    // Handle program change
    if (dto.programId !== undefined && dto.programId !== existingClass.programId) {
      const newProgram = dto.programId
        ? await this.prisma.program.findUnique({ where: { id: dto.programId } })
        : null;

      auditEntries.push({
        entityType: 'CLASS',
        entityId: classId,
        action: 'CLASS_EDIT',
        userId,
        fieldName: 'program',
        oldValue: existingClass.program?.name ?? '',
        newValue: newProgram?.name ?? '',
      });
      updateData.programId = dto.programId;
    }

    // Handle teacher reassignment
    if (dto.teacherId !== undefined && dto.teacherId !== existingClass.teacherId) {
      let newTeacherName = '';
      if (dto.teacherId) {
        const newTeacher = await this.prisma.teacher.findUnique({
          where: { id: dto.teacherId },
        });
        if (!newTeacher) {
          throw new NotFoundException('Teacher not found');
        }
        newTeacherName = newTeacher.name;
      }

      auditEntries.push({
        entityType: 'CLASS',
        entityId: classId,
        action: 'CLASS_EDIT',
        userId,
        fieldName: 'teacher',
        oldValue: existingClass.teacher?.name ?? '',
        newValue: newTeacherName,
      });
      updateData.teacherId = dto.teacherId;
    }

    if (auditEntries.length === 0 && !dto.isIncluded) {
      return this.prisma.class.findUnique({
        where: { id: classId },
        include: {
          school: { select: { id: true, schoolCode: true, name: true } },
          program: { select: { id: true, name: true } },
          teacher: { select: { id: true, teacherId: true, name: true } },
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.class.update({
        where: { id: classId },
        data: updateData,
        include: {
          school: { select: { id: true, schoolCode: true, name: true } },
          program: { select: { id: true, name: true } },
          teacher: { select: { id: true, teacherId: true, name: true } },
        },
      });

      if (auditEntries.length > 0) {
        await this.auditService.logMultipleManualEdits(auditEntries, tx);
      }

      return updated;
    });
  }

  async getTeachers() {
    return this.prisma.teacher.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getClassEditHistory(classId: number) {
    return this.auditService.getManualEditLogs('CLASS', classId);
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
