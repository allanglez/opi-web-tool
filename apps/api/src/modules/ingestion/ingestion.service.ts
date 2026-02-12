import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkIngestSchoolsDto } from './dto/ingest-school.dto';
import { BulkIngestProgramsDto } from './dto/ingest-program.dto';
import { BulkIngestClassesDto } from './dto/ingest-class.dto';
import { BulkIngestStudentsDto } from './dto/ingest-student.dto';
import { BulkIngestClassStudentsDto } from './dto/ingest-class-student.dto';
import { IngestionResultDto } from './dto/ingestion-result.dto';

@Injectable()
export class IngestionService {
  constructor(private prisma: PrismaService) { }

  async ingestSchools(dto: BulkIngestSchoolsDto): Promise<IngestionResultDto> {
    const startTime = Date.now();
    const errors: Array<{ index: number; error: string }> = [];
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < dto.schools.length; i++) {
      const school = dto.schools[i];
      try {
        const existing = await this.prisma.school.findUnique({
          where: { schoolCode: school.schoolCode },
        });

        await this.prisma.school.upsert({
          where: { schoolCode: school.schoolCode },
          create: {
            schoolCode: school.schoolCode,
            name: school.name,
            district: school.district,
            schoolType: school.schoolType,
            contactName: school.contactName,
            contactEmail: school.contactEmail,
            contactPhone: school.contactPhone,
          },
          update: {
            name: school.name,
            district: school.district,
            schoolType: school.schoolType,
            contactName: school.contactName,
            contactEmail: school.contactEmail,
            contactPhone: school.contactPhone,
          },
        });

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch (error) {
        errors.push({ index: i, error: (error as Error).message });
      }
    }

    const duration = Date.now() - startTime;

    await this.prisma.ingestionLog.create({
      data: {
        entityType: 'schools',
        recordsTotal: dto.schools.length,
        recordsUpserted: inserted + updated,
        recordsFailed: errors.length,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      entityType: 'schools',
      recordsTotal: dto.schools.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration,
    };
  }

  async ingestPrograms(dto: BulkIngestProgramsDto): Promise<IngestionResultDto> {
    const startTime = Date.now();
    const errors: Array<{ index: number; error: string }> = [];
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < dto.programs.length; i++) {
      const program = dto.programs[i];
      try {
        const existing = await this.prisma.program.findUnique({
          where: { code: program.code },
        });

        await this.prisma.program.upsert({
          where: { code: program.code },
          create: {
            name: program.name,
            code: program.code,
            opiType: program.opiType,
          },
          update: {
            name: program.name,
            opiType: program.opiType,
          },
        });

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch (error) {
        errors.push({ index: i, error: (error as Error).message });
      }
    }

    const duration = Date.now() - startTime;

    await this.prisma.ingestionLog.create({
      data: {
        entityType: 'programs',
        recordsTotal: dto.programs.length,
        recordsUpserted: inserted + updated,
        recordsFailed: errors.length,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      entityType: 'programs',
      recordsTotal: dto.programs.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration,
    };
  }

  async ingestClasses(dto: BulkIngestClassesDto): Promise<IngestionResultDto> {
    const startTime = Date.now();
    const errors: Array<{ index: number; error: string }> = [];
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < dto.classes.length; i++) {
      const classData = dto.classes[i];
      try {
        const school = await this.prisma.school.findUnique({
          where: { schoolCode: classData.schoolCode },
        });

        if (!school) {
          errors.push({ index: i, error: `School not found: ${classData.schoolCode}` });
          continue;
        }

        let programId: number | null = null;
        if (classData.programName) {
          const program = await this.prisma.program.findUnique({
            where: { name: classData.programName },
          });
          if (!program) {
            errors.push({ index: i, error: `Program not found: ${classData.programName}` });
            continue;
          }
          programId = program.id;
        }

        // Upsert Teacher if provided
        let teacherRecordId: number | null = null;
        if (classData.teacherId) {
          const teacher = await this.prisma.teacher.upsert({
            where: { teacherId: classData.teacherId },
            create: {
              teacherId: classData.teacherId,
              name: classData.teacherName || classData.teacherId,
            },
            update: {
              name: classData.teacherName || classData.teacherId,
            },
          });
          teacherRecordId = teacher.id;
        }

        const existing = await this.prisma.class.findFirst({
          where: {
            cycleId: classData.cycleId,
            schoolId: school.id,
            classCode: classData.classCode,
          },
        });

        await this.prisma.class.upsert({
          where: {
            id: existing?.id || 0,
          },
          create: {
            cycleId: classData.cycleId,
            schoolId: school.id,
            programId,
            classCode: classData.classCode,
            courseTitle: classData.courseTitle,
            grade: classData.grade,
            teacherId: teacherRecordId,
            semesterTerm: classData.semesterTerm,
            roomNumber: classData.roomNumber,
          },
          update: {
            programId,
            courseTitle: classData.courseTitle,
            grade: classData.grade,
            teacherId: teacherRecordId,
            semesterTerm: classData.semesterTerm,
            roomNumber: classData.roomNumber,
          },
        });

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch (error) {
        errors.push({ index: i, error: (error as Error).message });
      }
    }

    const duration = Date.now() - startTime;

    await this.prisma.ingestionLog.create({
      data: {
        entityType: 'classes',
        recordsTotal: dto.classes.length,
        recordsUpserted: inserted + updated,
        recordsFailed: errors.length,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      entityType: 'classes',
      recordsTotal: dto.classes.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration,
    };
  }

  async ingestStudents(dto: BulkIngestStudentsDto): Promise<IngestionResultDto> {
    const startTime = Date.now();
    const errors: Array<{ index: number; error: string }> = [];
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < dto.students.length; i++) {
      const student = dto.students[i];
      try {
        const school = await this.prisma.school.findUnique({
          where: { schoolCode: student.schoolCode },
        });

        if (!school) {
          errors.push({ index: i, error: `School not found: ${student.schoolCode}` });
          continue;
        }

        const existing = await this.prisma.student.findUnique({
          where: {
            cycleId_studentNumber: {
              cycleId: student.cycleId,
              studentNumber: student.studentNumber,
            },
          },
        });

        await this.prisma.student.upsert({
          where: {
            cycleId_studentNumber: {
              cycleId: student.cycleId,
              studentNumber: student.studentNumber,
            },
          },
          create: {
            cycleId: student.cycleId,
            schoolId: school.id,
            studentNumber: student.studentNumber,
            aspenStudentId: student.aspenStudentId,
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName,
            pen: student.pen,
            grade: student.grade,
          },
          update: {
            schoolId: school.id,
            aspenStudentId: student.aspenStudentId,
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName,
            pen: student.pen,
            grade: student.grade,
            lastModifiedAt: new Date(),
          },
        });

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch (error) {
        errors.push({ index: i, error: (error as Error).message });
      }
    }

    const duration = Date.now() - startTime;

    await this.prisma.ingestionLog.create({
      data: {
        entityType: 'students',
        recordsTotal: dto.students.length,
        recordsUpserted: inserted + updated,
        recordsFailed: errors.length,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      entityType: 'students',
      recordsTotal: dto.students.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration,
    };
  }

  async ingestClassStudents(dto: BulkIngestClassStudentsDto): Promise<IngestionResultDto> {
    const startTime = Date.now();
    const errors: Array<{ index: number; error: string }> = [];
    let inserted = 0;

    for (let i = 0; i < dto.enrollments.length; i++) {
      const enrollment = dto.enrollments[i];
      try {
        const existing = await this.prisma.classStudent.findUnique({
          where: {
            classId_studentId: {
              classId: enrollment.classId,
              studentId: enrollment.studentId,
            },
          },
        });

        if (!existing) {
          await this.prisma.classStudent.create({
            data: {
              classId: enrollment.classId,
              studentId: enrollment.studentId,
            },
          });
          inserted++;
        }
      } catch (error) {
        errors.push({ index: i, error: (error as Error).message });
      }
    }

    const duration = Date.now() - startTime;

    await this.prisma.ingestionLog.create({
      data: {
        entityType: 'class_students',
        recordsTotal: dto.enrollments.length,
        recordsUpserted: inserted,
        recordsFailed: errors.length,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      entityType: 'class_students',
      recordsTotal: dto.enrollments.length,
      recordsInserted: inserted,
      recordsUpdated: 0,
      recordsFailed: errors.length,
      errors,
      duration,
    };
  }

  async getIngestionLogs(limit = 50) {
    return this.prisma.ingestionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
