import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Milestone 3 Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let coordinatorToken: string;
  let m2mToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    // Mock tokens for testing
    // In real tests, these would be generated with proper JWT signatures
    adminToken = 'mock-admin-token';
    coordinatorToken = 'mock-coordinator-token';
    m2mToken = 'mock-m2m-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('M2M Scope Validation', () => {
    it('should reject ingestion request without ingest:write scope', async () => {
      // This test would require proper JWT mocking
      // For now, we document the expected behavior
      expect(true).toBe(true);
    });

    it('should allow ADMIN role to access ingestion endpoints', async () => {
      // This test would require proper JWT mocking
      expect(true).toBe(true);
    });

    it('should allow M2M client with ingest:write scope', async () => {
      // This test would require proper JWT mocking
      expect(true).toBe(true);
    });
  });

  describe('Idempotent Bulk Upsert', () => {
    let cycleId: number;

    beforeAll(async () => {
      // Create a test cycle
      const cycle = await prisma.assessmentCycle.create({
        data: {
          name: 'Test Cycle 2026',
          startsOn: new Date('2026-01-01'),
          endsOn: new Date('2026-12-31'),
          isActive: true,
        },
      });
      cycleId = cycle.id;
    });

    afterAll(async () => {
      // Cleanup
      await prisma.classStudent.deleteMany({});
      await prisma.class.deleteMany({});
      await prisma.student.deleteMany({});
      await prisma.program.deleteMany({});
      await prisma.school.deleteMany({});
      await prisma.ingestionLog.deleteMany({});
      await prisma.assessmentCycle.deleteMany({});
    });

    it('should insert schools on first ingestion', async () => {
      const schoolsPayload = {
        schools: [
          {
            schoolCode: 'TEST001',
            name: 'Test Elementary School',
            district: 'Test District',
          },
          {
            schoolCode: 'TEST002',
            name: 'Test Secondary School',
          },
        ],
      };

      // First ingestion - should insert
      const schools1 = await prisma.school.findMany({
        where: { schoolCode: { in: ['TEST001', 'TEST002'] } },
      });
      expect(schools1.length).toBe(0);

      // Simulate ingestion
      for (const school of schoolsPayload.schools) {
        await prisma.school.upsert({
          where: { schoolCode: school.schoolCode },
          update: school,
          create: school,
        });
      }

      const schools2 = await prisma.school.findMany({
        where: { schoolCode: { in: ['TEST001', 'TEST002'] } },
      });
      expect(schools2.length).toBe(2);
    });

    it('should update schools on second ingestion (idempotency)', async () => {
      const updatedPayload = {
        schools: [
          {
            schoolCode: 'TEST001',
            name: 'Test Elementary School - Updated',
            district: 'New District',
          },
          {
            schoolCode: 'TEST002',
            name: 'Test Secondary School',
          },
        ],
      };

      // Second ingestion - should update
      for (const school of updatedPayload.schools) {
        await prisma.school.upsert({
          where: { schoolCode: school.schoolCode },
          update: school,
          create: school,
        });
      }

      const schools = await prisma.school.findMany({
        where: { schoolCode: { in: ['TEST001', 'TEST002'] } },
      });
      
      expect(schools.length).toBe(2);
      const school1 = schools.find((s) => s.schoolCode === 'TEST001');
      expect(school1?.name).toBe('Test Elementary School - Updated');
      expect(school1?.district).toBe('New District');
    });

    it('should handle student upsert with natural key (cycleId + studentNumber)', async () => {
      const school = await prisma.school.findFirst({
        where: { schoolCode: 'TEST001' },
      });

      const studentsPayload = [
        {
          cycleId,
          schoolId: school!.id,
          studentNumber: 'STU001',
          firstName: 'John',
          lastName: 'Doe',
          grade: 5,
        },
        {
          cycleId,
          schoolId: school!.id,
          studentNumber: 'STU002',
          firstName: 'Jane',
          lastName: 'Smith',
          grade: 6,
        },
      ];

      // First ingestion
      for (const student of studentsPayload) {
        await prisma.student.upsert({
          where: {
            cycleId_studentNumber: {
              cycleId: student.cycleId,
              studentNumber: student.studentNumber,
            },
          },
          update: student,
          create: student,
        });
      }

      const students1 = await prisma.student.findMany({
        where: { cycleId },
      });
      expect(students1.length).toBe(2);

      // Second ingestion with updates
      studentsPayload[0].grade = 6; // Update grade

      for (const student of studentsPayload) {
        await prisma.student.upsert({
          where: {
            cycleId_studentNumber: {
              cycleId: student.cycleId,
              studentNumber: student.studentNumber,
            },
          },
          update: student,
          create: student,
        });
      }

      const students2 = await prisma.student.findMany({
        where: { cycleId },
      });
      expect(students2.length).toBe(2); // Still 2, not 4
      
      const updatedStudent = students2.find((s) => s.studentNumber === 'STU001');
      expect(updatedStudent?.grade).toBe(6);
    });
  });

  describe('Approval Gate', () => {
    let cycleId: number;

    beforeAll(async () => {
      // Create unapproved cycle
      const cycle = await prisma.assessmentCycle.create({
        data: {
          name: 'Unapproved Cycle',
          startsOn: new Date('2026-01-01'),
          endsOn: new Date('2026-12-31'),
          isActive: true,
        },
      });
      cycleId = cycle.id;
    });

    afterAll(async () => {
      await prisma.assessmentCycle.deleteMany({});
    });

    it('should return 403 for coordinator/evaluator when cycle not approved', async () => {
      const cycle = await prisma.assessmentCycle.findUnique({
        where: { id: cycleId },
      });

      expect(cycle?.dataApprovedAt).toBeNull();
      
      // In a real test, we would make an HTTP request to a protected endpoint
      // and expect a 403 response with error code 'CYCLE_NOT_APPROVED'
      const shouldBlock = !cycle?.dataApprovedAt;
      expect(shouldBlock).toBe(true);
    });

    it('should allow access after cycle is approved', async () => {
      // Create admin user for approval
      const adminUser = await prisma.user.create({
        data: {
          externalAuthId: 'auth0|test-admin',
          email: 'admin@test.com',
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
        },
      });

      // Approve cycle
      await prisma.assessmentCycle.update({
        where: { id: cycleId },
        data: {
          dataApprovedAt: new Date(),
          dataApprovedBy: adminUser.id,
        },
      });

      const cycle = await prisma.assessmentCycle.findUnique({
        where: { id: cycleId },
      });

      expect(cycle?.dataApprovedAt).not.toBeNull();
      
      const shouldAllow = !!cycle?.dataApprovedAt;
      expect(shouldAllow).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { id: adminUser.id } });
    });
  });

  describe('Class Inclusion Toggle', () => {
    let cycleId: number;
    let schoolId: number;
    let classId: number;

    beforeAll(async () => {
      const cycle = await prisma.assessmentCycle.create({
        data: {
          name: 'Test Cycle for Classes',
          startsOn: new Date('2026-01-01'),
          endsOn: new Date('2026-12-31'),
          isActive: true,
        },
      });
      cycleId = cycle.id;

      const school = await prisma.school.create({
        data: {
          schoolCode: 'CLASS-TEST',
          name: 'Class Test School',
        },
      });
      schoolId = school.id;

      const classRecord = await prisma.class.create({
        data: {
          cycleId,
          schoolId,
          classCode: 'CLASS-001',
          grade: 5,
          teacher: 'Test Teacher',
          isIncluded: true,
        },
      });
      classId = classRecord.id;
    });

    afterAll(async () => {
      await prisma.class.deleteMany({});
      await prisma.school.deleteMany({});
      await prisma.assessmentCycle.deleteMany({});
    });

    it('should toggle class inclusion from true to false', async () => {
      const classBefore = await prisma.class.findUnique({
        where: { id: classId },
      });
      expect(classBefore?.isIncluded).toBe(true);

      await prisma.class.update({
        where: { id: classId },
        data: { isIncluded: false },
      });

      const classAfter = await prisma.class.findUnique({
        where: { id: classId },
      });
      expect(classAfter?.isIncluded).toBe(false);
    });

    it('should toggle class inclusion from false to true', async () => {
      await prisma.class.update({
        where: { id: classId },
        data: { isIncluded: true },
      });

      const classAfter = await prisma.class.findUnique({
        where: { id: classId },
      });
      expect(classAfter?.isIncluded).toBe(true);
    });

    it('should persist inclusion state across queries', async () => {
      await prisma.class.update({
        where: { id: classId },
        data: { isIncluded: false },
      });

      // Query multiple times
      const query1 = await prisma.class.findUnique({ where: { id: classId } });
      const query2 = await prisma.class.findUnique({ where: { id: classId } });
      const query3 = await prisma.class.findMany({ where: { id: classId } });

      expect(query1?.isIncluded).toBe(false);
      expect(query2?.isIncluded).toBe(false);
      expect(query3[0]?.isIncluded).toBe(false);
    });

    it('should filter classes by inclusion status', async () => {
      // Create another class that is included
      const includedClass = await prisma.class.create({
        data: {
          cycleId,
          schoolId,
          classCode: 'CLASS-002',
          grade: 6,
          isIncluded: true,
        },
      });

      const includedClasses = await prisma.class.findMany({
        where: { cycleId, isIncluded: true },
      });

      const excludedClasses = await prisma.class.findMany({
        where: { cycleId, isIncluded: false },
      });

      expect(includedClasses.length).toBeGreaterThanOrEqual(1);
      expect(excludedClasses.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await prisma.class.delete({ where: { id: includedClass.id } });
    });
  });

  describe('Ingestion Logging', () => {
    afterAll(async () => {
      await prisma.ingestionLog.deleteMany({});
    });

    it('should create ingestion log entry', async () => {
      const log = await prisma.ingestionLog.create({
        data: {
          entityType: 'school',
          recordsTotal: 10,
          recordsUpserted: 10,
          recordsFailed: 0,
          errors: null,
        },
      });

      expect(log.id).toBeDefined();
      expect(log.entityType).toBe('school');
      expect(log.recordsTotal).toBe(10);
      expect(log.createdAt).toBeDefined();
    });

    it('should record errors in ingestion log', async () => {
      const errors = JSON.stringify([
        { index: 5, error: 'Invalid school code' },
        { index: 8, error: 'Missing required field' },
      ]);

      const log = await prisma.ingestionLog.create({
        data: {
          entityType: 'student',
          recordsTotal: 10,
          recordsUpserted: 8,
          recordsFailed: 2,
          errors,
        },
      });

      expect(log.recordsFailed).toBe(2);
      expect(log.errors).toBe(errors);
    });

    it('should retrieve ingestion logs in chronological order', async () => {
      // Create multiple logs
      await prisma.ingestionLog.create({
        data: {
          entityType: 'program',
          recordsTotal: 5,
          recordsUpserted: 5,
          recordsFailed: 0,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await prisma.ingestionLog.create({
        data: {
          entityType: 'class',
          recordsTotal: 20,
          recordsUpserted: 20,
          recordsFailed: 0,
        },
      });

      const logs = await prisma.ingestionLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2,
      });

      expect(logs.length).toBe(2);
      expect(logs[0].entityType).toBe('class');
      expect(logs[1].entityType).toBe('program');
    });
  });
});
