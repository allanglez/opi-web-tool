import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateStudentDto, UpdateStudentEnrollmentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getStudent(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: {
          select: { id: true, schoolCode: true, name: true },
        },
        cycle: {
          select: { id: true, name: true, year: true },
        },
        classStudents: {
          include: {
            class: {
              select: {
                id: true,
                classCode: true,
                courseTitle: true,
                grade: true,
                teacher: { select: { id: true, name: true } },
                program: { select: { id: true, name: true } },
              },
            },
          },
        },
        modifier: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getStudentsByCycle(cycleId: number, schoolId?: number) {
    return this.prisma.student.findMany({
      where: {
        cycleId,
        ...(schoolId && { schoolId }),
      },
      include: {
        school: {
          select: { id: true, schoolCode: true, name: true },
        },
        classStudents: {
          include: {
            class: {
              select: { id: true, classCode: true },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async updateStudent(studentId: number, dto: UpdateStudentDto, userId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: { select: { id: true, name: true } },
        classStudents: {
          include: {
            class: { select: { id: true, classCode: true } },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Track field changes for audit log
    const auditEntries: Array<{
      entityType: 'STUDENT';
      entityId: number;
      action: 'STUDENT_EDIT' | 'STUDENT_SCHOOL_REASSIGNMENT';
      userId: number;
      fieldName: string;
      oldValue: string;
      newValue: string;
    }> = [];

    const updateData: Record<string, unknown> = {
      isManuallyEdited: true,
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
    };

    if (dto.firstName !== undefined && dto.firstName !== student.firstName) {
      auditEntries.push({
        entityType: 'STUDENT',
        entityId: studentId,
        action: 'STUDENT_EDIT',
        userId,
        fieldName: 'first_name',
        oldValue: student.firstName,
        newValue: dto.firstName,
      });
      updateData.firstName = dto.firstName;
    }

    if (dto.middleName !== undefined && dto.middleName !== student.middleName) {
      auditEntries.push({
        entityType: 'STUDENT',
        entityId: studentId,
        action: 'STUDENT_EDIT',
        userId,
        fieldName: 'middle_name',
        oldValue: student.middleName ?? '',
        newValue: dto.middleName ?? '',
      });
      updateData.middleName = dto.middleName;
    }

    if (dto.lastName !== undefined && dto.lastName !== student.lastName) {
      auditEntries.push({
        entityType: 'STUDENT',
        entityId: studentId,
        action: 'STUDENT_EDIT',
        userId,
        fieldName: 'last_name',
        oldValue: student.lastName,
        newValue: dto.lastName,
      });
      updateData.lastName = dto.lastName;
    }

    if (dto.grade !== undefined && dto.grade !== student.grade) {
      auditEntries.push({
        entityType: 'STUDENT',
        entityId: studentId,
        action: 'STUDENT_EDIT',
        userId,
        fieldName: 'grade',
        oldValue: String(student.grade ?? ''),
        newValue: String(dto.grade ?? ''),
      });
      updateData.grade = dto.grade;
    }

    // School reassignment
    if (dto.schoolId !== undefined && dto.schoolId !== student.schoolId) {
      const newSchool = await this.prisma.school.findUnique({
        where: { id: dto.schoolId },
      });

      if (!newSchool) {
        throw new BadRequestException('Target school not found');
      }

      auditEntries.push({
        entityType: 'STUDENT',
        entityId: studentId,
        action: 'STUDENT_SCHOOL_REASSIGNMENT',
        userId,
        fieldName: 'school_id',
        oldValue: `${student.school.name} (${student.schoolId})`,
        newValue: `${newSchool.name} (${newSchool.id})`,
      });

      updateData.schoolId = dto.schoolId;
    }

    if (auditEntries.length === 0) {
      return this.getStudent(studentId);
    }

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: updateData,
      });

      // If school changed, remove class enrollments from old school
      if (dto.schoolId !== undefined && dto.schoolId !== student.schoolId) {
        const oldSchoolClassIds = student.classStudents
          .map((cs) => cs.class.id);

        if (oldSchoolClassIds.length > 0) {
          // Log each enrollment removal
          for (const cs of student.classStudents) {
            await this.auditService.logManualEdit(
              'STUDENT',
              studentId,
              'STUDENT_CLASS_ENROLLMENT_REMOVE',
              userId,
              'class_enrollment',
              cs.class.classCode,
              undefined,
              tx,
            );
          }

          await tx.classStudent.deleteMany({
            where: {
              studentId,
              classId: { in: oldSchoolClassIds },
            },
          });
        }
      }

      // Log all field changes
      await this.auditService.logMultipleManualEdits(auditEntries, tx);
    });

    return this.getStudent(studentId);
  }

  async updateStudentEnrollment(
    studentId: number,
    dto: UpdateStudentEnrollmentDto,
    userId: number,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        classStudents: {
          include: {
            class: {
              select: { id: true, classCode: true, schoolId: true, cycleId: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Add to classes
      if (dto.addClassIds?.length) {
        // Validate classes belong to same cycle and school
        const classes = await tx.class.findMany({
          where: {
            id: { in: dto.addClassIds },
            cycleId: student.cycleId,
            schoolId: student.schoolId,
          },
        });

        if (classes.length !== dto.addClassIds.length) {
          throw new BadRequestException(
            'Some classes do not exist or belong to a different cycle/school',
          );
        }

        for (const cls of classes) {
          // Use upsert to avoid duplicate key errors
          await tx.classStudent.upsert({
            where: {
              classId_studentId: {
                classId: cls.id,
                studentId,
              },
            },
            create: { classId: cls.id, studentId },
            update: {},
          });

          await this.auditService.logManualEdit(
            'STUDENT',
            studentId,
            'STUDENT_CLASS_ENROLLMENT_ADD',
            userId,
            'class_enrollment',
            undefined,
            cls.classCode,
            tx,
          );
        }
      }

      // Remove from classes
      if (dto.removeClassIds?.length) {
        const classesToRemove = student.classStudents
          .filter((cs) => dto.removeClassIds!.includes(cs.classId));

        for (const cs of classesToRemove) {
          await tx.classStudent.delete({
            where: {
              classId_studentId: {
                classId: cs.classId,
                studentId,
              },
            },
          });

          await this.auditService.logManualEdit(
            'STUDENT',
            studentId,
            'STUDENT_CLASS_ENROLLMENT_REMOVE',
            userId,
            'class_enrollment',
            cs.class.classCode,
            undefined,
            tx,
          );
        }
      }

      // Mark student as manually edited
      await tx.student.update({
        where: { id: studentId },
        data: {
          isManuallyEdited: true,
          lastModifiedBy: userId,
          lastModifiedAt: new Date(),
        },
      });
    });

    return this.getStudent(studentId);
  }

  async getStudentEditHistory(studentId: number) {
    return this.auditService.getManualEditLogs('STUDENT', studentId);
  }
}
