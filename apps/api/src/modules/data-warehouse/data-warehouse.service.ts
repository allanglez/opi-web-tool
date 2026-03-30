import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataWarehouseRecordDto } from './dto/data-warehouse-push.dto';

@Injectable()
export class DataWarehouseService {
  private readonly logger = new Logger(DataWarehouseService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Receives data from the data warehouse.
   * Replaces ALL existing staging data with the new payload.
   * New batch is created with status PENDING.
   */
  async pushData(records: DataWarehouseRecordDto[]) {
    if (!records.length) {
      throw new BadRequestException('No records provided');
    }

    const targetYear = records[0].SCHOOL_YEAR;

    // Delete all existing staging records and batches (replace, not append)
    await this.prisma.dataWarehouseStagingRecord.deleteMany({});
    await this.prisma.dataWarehouseBatch.deleteMany({});

    // Create new batch
    const batch = await this.prisma.dataWarehouseBatch.create({
      data: {
        status: 'PENDING',
        recordCount: records.length,
        targetYear,
      },
    });

    // Bulk insert staging records
    const stagingData = records.map((r) => ({
      batchId: batch.id,
      opiType: r.OPI_TYPE || '',
      schoolNumber: String(r.SCHOOL_NUMBER || ''),
      schoolName: r.SCHOOL_NAME || '',
      schoolType: r.SCHOOL_TYPE || null,
      schoolYear: r.SCHOOL_YEAR,
      studentNumber: String(r.STUDENT_NUMBER || ''),
      pen: r.PEN != null ? String(r.PEN) : null,
      studentLastName: r.STUDENT_LAST_NAME || '',
      studentFirstName: r.STUDENT_FIRST_NAME || '',
      studentMiddleName: r.STUDENT_MIDDLE_NAME || null,
      grade: r.GRADE,
      course: r.COURSE || '',
      courseTitle: r.COURSE_TITLE || '',
      teacherId: r.TEACHER_ID || '',
      teacherName: r.TEACHER_NAME || '',
      semesterTerm: (r.SEMESTER_TERM || '').substring(0, 10),
      programCode: r.PROGRAM_CODE || '',
      programDescription: r.PROGRAM_DESCRIPTION || '',
    }));

    // Insert in chunks to avoid hitting SQL Server parameter limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < stagingData.length; i += CHUNK_SIZE) {
      const chunk = stagingData.slice(i, i + CHUNK_SIZE);
      await this.prisma.dataWarehouseStagingRecord.createMany({
        data: chunk,
      });
    }

    this.logger.log(
      `Received ${records.length} records from data warehouse (batch ${batch.id}, year ${targetYear})`,
    );

    return {
      batchId: batch.id,
      status: batch.status,
      recordCount: records.length,
      targetYear,
      receivedAt: batch.receivedAt,
    };
  }

  /**
   * Admin triggers seeding from the staging table into the app domain tables.
   * - Finds PENDING batch
   * - Deactivates current cycle, creates a new one
   * - Seeds schools, programs, teachers, students, classes, enrollments
   * - Marks batch as SEEDED (or FAILED on error)
   */
  async seedFromStaging() {
    const batch = await this.prisma.dataWarehouseBatch.findFirst({
      where: { status: 'PENDING' },
      orderBy: { receivedAt: 'desc' },
    });

    if (!batch) {
      throw new BadRequestException(
        'No pending data warehouse batch found. Push data first.',
      );
    }

    // Mark as seeding
    await this.prisma.dataWarehouseBatch.update({
      where: { id: batch.id },
      data: { status: 'SEEDING' },
    });

    try {
      const records = await this.prisma.dataWarehouseStagingRecord.findMany({
        where: { batchId: batch.id },
      });

      this.logger.log(
        `Starting seed from staging: ${records.length} records, year ${batch.targetYear}`,
      );

      // Reuse active cycle if one exists, otherwise create a new one
      let cycle = await this.prisma.assessmentCycle.findFirst({
        where: { isActive: true },
      });

      if (cycle) {
        this.logger.log(`Using existing active cycle: ${cycle.name} (ID: ${cycle.id})`);
      } else {
        cycle = await this.prisma.assessmentCycle.create({
          data: {
            name: `Assessment Cycle ${batch.targetYear}`,
            year: batch.targetYear,
            startsOn: new Date(`${batch.targetYear}-01-01`),
            endsOn: new Date(`${batch.targetYear}-12-31`),
            isActive: true,
          },
        });
        this.logger.log(`Created cycle: ${cycle.name} (ID: ${cycle.id})`);
      }

      // Extract unique entities
      const schools = new Map<
        string,
        { schoolCode: string; name: string; schoolType: string | null }
      >();
      const programs = new Map<
        string,
        { code: string; name: string; opiType: string }
      >();
      const teachers = new Map<
        string,
        { teacherId: string; name: string }
      >();
      const classes = new Map<string, {
        schoolCode: string;
        classCode: string;
        grade: number;
        courseTitle: string;
        semesterTerm: string;
        teacherId: string;
        teacherName: string;
        programCode: string;
      }>();

      for (const row of records) {
        if (row.schoolNumber && row.schoolName) {
          schools.set(row.schoolNumber, {
            schoolCode: row.schoolNumber,
            name: row.schoolName,
            schoolType: row.schoolType,
          });
        }

        if (row.programCode && row.programDescription) {
          programs.set(row.programCode, {
            code: row.programCode,
            name: row.programDescription,
            opiType: row.opiType,
          });
        }

        if (row.teacherId && row.teacherName) {
          teachers.set(row.teacherId, {
            teacherId: row.teacherId,
            name: row.teacherName,
          });
        }

        const classKey = `${row.schoolNumber}-${row.course}`;
        if (!classes.has(classKey)) {
          classes.set(classKey, {
            schoolCode: row.schoolNumber,
            classCode: row.course,
            grade: row.grade,
            courseTitle: row.courseTitle,
            semesterTerm: row.semesterTerm,
            teacherId: row.teacherId,
            teacherName: row.teacherName,
            programCode: row.programCode,
          });
        }
      }

      // Seed schools
      for (const school of schools.values()) {
        await this.prisma.school.upsert({
          where: { schoolCode: school.schoolCode },
          create: {
            schoolCode: school.schoolCode,
            name: school.name,
            schoolType: school.schoolType,
          },
          update: { name: school.name, schoolType: school.schoolType },
        });
      }
      this.logger.log(`Seeded ${schools.size} schools`);

      // Seed programs
      for (const program of programs.values()) {
        await this.prisma.program.upsert({
          where: { code: program.code },
          create: program,
          update: { name: program.name, opiType: program.opiType },
        });
      }
      this.logger.log(`Seeded ${programs.size} programs`);

      // Seed teachers
      for (const teacher of teachers.values()) {
        await this.prisma.teacher.upsert({
          where: { teacherId: teacher.teacherId },
          create: teacher,
          update: { name: teacher.name },
        });
      }
      this.logger.log(`Seeded ${teachers.size} teachers`);

      // Seed students
      let studentCount = 0;
      const seenStudents = new Set<string>();
      for (const row of records) {
        if (!row.studentNumber) continue;
        if (seenStudents.has(row.studentNumber)) continue;
        seenStudents.add(row.studentNumber);

        const school = await this.prisma.school.findUnique({
          where: { schoolCode: row.schoolNumber },
        });
        if (!school) continue;

        await this.prisma.student.upsert({
          where: {
            cycleId_studentNumber: {
              cycleId: cycle.id,
              studentNumber: row.studentNumber,
            },
          },
          create: {
            cycleId: cycle.id,
            schoolId: school.id,
            studentNumber: row.studentNumber,
            firstName: row.studentFirstName,
            middleName: row.studentMiddleName || null,
            lastName: row.studentLastName,
            pen: row.pen || null,
            grade: row.grade,
          },
          update: {
            firstName: row.studentFirstName,
            middleName: row.studentMiddleName || null,
            lastName: row.studentLastName,
            pen: row.pen || null,
            grade: row.grade,
          },
        });
        studentCount++;
      }
      this.logger.log(`Seeded ${studentCount} students`);

      // Seed classes
      for (const classData of classes.values()) {
        const school = await this.prisma.school.findUnique({
          where: { schoolCode: classData.schoolCode },
        });
        const program = await this.prisma.program.findUnique({
          where: { code: classData.programCode },
        });
        const teacher = await this.prisma.teacher.findUnique({
          where: { teacherId: classData.teacherId },
        });

        if (!school) continue;

        const existingClass = await this.prisma.class.findFirst({
          where: {
            cycleId: cycle.id,
            schoolId: school.id,
            classCode: classData.classCode,
          },
        });

        if (existingClass) {
          await this.prisma.class.update({
            where: { id: existingClass.id },
            data: {
              grade: classData.grade,
              courseTitle: classData.courseTitle,
              semesterTerm: classData.semesterTerm,
              teacherId: teacher?.id || null,
              programId: program?.id || null,
            },
          });
        } else {
          await this.prisma.class.create({
            data: {
              cycleId: cycle.id,
              schoolId: school.id,
              classCode: classData.classCode,
              grade: classData.grade,
              courseTitle: classData.courseTitle,
              semesterTerm: classData.semesterTerm,
              teacherId: teacher?.id || null,
              programId: program?.id || null,
              isIncluded: false,
            },
          });
        }
      }
      this.logger.log(`Seeded ${classes.size} classes`);

      // Seed class-student enrollments
      let enrollmentCount = 0;
      for (const row of records) {
        if (!row.studentNumber || !row.course) continue;

        const school = await this.prisma.school.findUnique({
          where: { schoolCode: row.schoolNumber },
        });

        const student = await this.prisma.student.findUnique({
          where: {
            cycleId_studentNumber: {
              cycleId: cycle.id,
              studentNumber: row.studentNumber,
            },
          },
        });

        const classRecord = await this.prisma.class.findFirst({
          where: {
            cycleId: cycle.id,
            schoolId: school!.id,
            classCode: row.course,
          },
        });

        if (!student || !classRecord) continue;

        await this.prisma.classStudent.upsert({
          where: {
            classId_studentId: {
              classId: classRecord.id,
              studentId: student.id,
            },
          },
          create: {
            classId: classRecord.id,
            studentId: student.id,
          },
          update: {},
        });
        enrollmentCount++;
      }
      this.logger.log(`Seeded ${enrollmentCount} class-student enrollments`);

      // Log to ingestion log
      await this.prisma.ingestionLog.create({
        data: {
          entityType: 'data_warehouse_seed',
          recordsTotal: records.length,
          recordsUpserted:
            schools.size +
            programs.size +
            teachers.size +
            studentCount +
            classes.size +
            enrollmentCount,
          recordsFailed: 0,
        },
      });

      // Mark batch as seeded
      await this.prisma.dataWarehouseBatch.update({
        where: { id: batch.id },
        data: { status: 'SEEDED', seededAt: new Date() },
      });

      this.logger.log('Data warehouse seed completed successfully');

      return {
        batchId: batch.id,
        status: 'SEEDED',
        cycleId: cycle.id,
        cycleName: cycle.name,
        summary: {
          schools: schools.size,
          programs: programs.size,
          teachers: teachers.size,
          students: studentCount,
          classes: classes.size,
          enrollments: enrollmentCount,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.prisma.dataWarehouseBatch.update({
        where: { id: batch.id },
        data: { status: 'FAILED', errorMessage },
      });

      this.logger.error(`Data warehouse seed failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Returns the latest batch status.
   */
  async getStatus() {
    const batch = await this.prisma.dataWarehouseBatch.findFirst({
      orderBy: { receivedAt: 'desc' },
    });

    if (!batch) {
      return { message: 'No data warehouse batches found' };
    }

    return {
      batchId: batch.id,
      status: batch.status,
      recordCount: batch.recordCount,
      targetYear: batch.targetYear,
      receivedAt: batch.receivedAt,
      seededAt: batch.seededAt,
      errorMessage: batch.errorMessage,
    };
  }
}
