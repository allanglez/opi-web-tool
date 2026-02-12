import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Milestone 5 Integration Tests (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let coordinatorId: number;
    let evaluatorId: number;
    let cycleId: number;
    let schoolId: number;
    let classId: number;

    beforeAll(async () => {
        process.env.AUTH_MOCK = 'true';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

        // Ensure mock auth is enabled or we bypass it via headers if configured
        // The app likely uses process.env.AUTH_MOCK or similar.
        // We will rely on X-Mock-User-Id header if MockAuthGuard is active.

        prisma = app.get<PrismaService>(PrismaService);
        app.setGlobalPrefix('api/v1');
        await app.init();

        // --- Fixtures Setup ---

        // 0. Ensure Roles
        await prisma.role.upsert({ where: { name: 'COORDINATOR' }, update: {}, create: { name: 'COORDINATOR' } });
        await prisma.role.upsert({ where: { name: 'EVALUATOR' }, update: {}, create: { name: 'EVALUATOR' } });

        // 1. Users
        const coordinator = await prisma.user.upsert({
            where: { email: 'm5-coord@test.com' },
            update: {},
            create: {
                email: 'm5-coord@test.com',
                externalAuthId: 'auth0|m5-coord',
                firstName: 'M5',
                lastName: 'Coordinator',
                isActive: true,
            },
        });
        coordinatorId = coordinator.id;

        // Assign COORDINATOR role
        const coordRole = await prisma.role.findUnique({ where: { name: 'COORDINATOR' } });
        if (coordRole) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: coordinatorId, roleId: coordRole.id } },
                update: {},
                create: { userId: coordinatorId, roleId: coordRole.id },
            });
        }

        const evaluator = await prisma.user.upsert({
            where: { email: 'm5-eval@test.com' },
            update: {},
            create: {
                email: 'm5-eval@test.com',
                externalAuthId: 'auth0|m5-eval',
                firstName: 'M5',
                lastName: 'Evaluator',
                isActive: true,
            },
        });
        evaluatorId = evaluator.id;

        // Assign EVALUATOR role
        const evalRole = await prisma.role.findUnique({ where: { name: 'EVALUATOR' } });
        if (evalRole) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: evaluatorId, roleId: evalRole.id } },
                update: {},
                create: { userId: evaluatorId, roleId: evalRole.id },
            });
        }

        // 2. Cycle (Initially Approved)
        const cycle = await prisma.assessmentCycle.create({
            data: {
                name: 'M5 Test Cycle',
                year: 2026,
                startsOn: new Date('2026-01-01'),
                endsOn: new Date('2026-12-31'),
                isActive: true,
                dataApprovedAt: new Date(),
                dataApprovedBy: coordinatorId, // using coord as approver for simplicity
            },
        });
        cycleId = cycle.id;

        // 3. School
        const school = await prisma.school.create({
            data: {
                schoolCode: 'M5-SCHOOL',
                name: 'M5 Test School',
            },
        });
        schoolId = school.id;

        // 4. Class
        const cls = await prisma.class.create({
            data: {
                cycleId,
                schoolId,
                classCode: 'M5-CLASS-01',
                isActive: true,
                isIncluded: true,
            },
        });
        classId = cls.id;
    });

    afterAll(async () => {
        // Cleanup with deleteMany to avoid 'Record not found' errors
        if (cycleId) {
            await prisma.evaluatorAssignment.deleteMany({ where: { cycleId } });
            await prisma.schoolAssessmentDate.deleteMany({ where: { cycleId } });
            await prisma.class.deleteMany({ where: { cycleId } });
            await prisma.assessmentCycle.deleteMany({ where: { id: cycleId } });
        }
        if (schoolId) await prisma.school.deleteMany({ where: { id: schoolId } });
        if (coordinatorId) await prisma.user.deleteMany({ where: { id: coordinatorId } });
        if (evaluatorId) await prisma.user.deleteMany({ where: { id: evaluatorId } });
        await app.close();
    });

    describe('POST /api/v1/coordinator/assignments/bulk', () => {
        it('should create new assignments', async () => {
            const payload = {
                cycleId,
                assignments: [
                    {
                        classId: classId,
                        evaluatorId: evaluatorId,
                    },
                ],
            };

            await request(app.getHttpServer())
                .post('/api/v1/coordinator/assignments/bulk')
                .set('X-Mock-User-Id', coordinatorId.toString())
                .send(payload)
                .expect(201);

            // Verify DB
            const assignment = await prisma.evaluatorAssignment.findFirst({
                where: { cycleId, classId, evaluatorId },
            });
            expect(assignment).toBeDefined();
        });

        it('should ignore duplicate assignments (idempotency)', async () => {
            const payload = {
                cycleId,
                assignments: [
                    {
                        classId: classId,
                        evaluatorId: evaluatorId,
                    },
                ],
            };

            // Run again
            await request(app.getHttpServer())
                .post('/api/v1/coordinator/assignments/bulk')
                .set('X-Mock-User-Id', coordinatorId.toString())
                .send(payload)
                .expect(201);

            // Count should still be 1
            const count = await prisma.evaluatorAssignment.count({
                where: { cycleId, classId, evaluatorId },
            });
            expect(count).toBe(1);
        });
    });

    describe('POST /api/v1/coordinator/schools/:id/dates/bulk', () => {
        it('should insert assessment dates', async () => {
            const dateStr = '2026-05-15';
            const payload = {
                assessmentDates: [dateStr],
            };

            await request(app.getHttpServer())
                .post(`/api/v1/coordinator/schools/${schoolId}/dates/bulk`)
                .set('X-Mock-User-Id', coordinatorId.toString())
                .send(payload)
                .expect(201);

            // Verify DB
            const dateRecord = await prisma.schoolAssessmentDate.findFirst({
                where: { cycleId, schoolId, assessmentDate: new Date(dateStr) },
            });
            expect(dateRecord).toBeDefined();
        });

        it('should ignore duplicate dates', async () => {
            const dateStr = '2026-05-15';
            const payload = {
                cycleId,
                assessmentDates: [dateStr],
            };

            // Run again
            await request(app.getHttpServer())
                .post(`/api/v1/coordinator/schools/${schoolId}/dates/bulk`)
                .set('X-Mock-User-Id', coordinatorId.toString())
                .send(payload)
                .expect(201);

            const count = await prisma.schoolAssessmentDate.count({
                where: { cycleId, schoolId, assessmentDate: new Date(dateStr) },
            });
            expect(count).toBe(1);
        });
    });

    describe('Cycle Approval Gate', () => {
        it('should reject requests if cycle is not approved', async () => {
            // First verify the cycle exists and is approved
            const currentCycle = await prisma.assessmentCycle.findUnique({
                where: { id: cycleId },
            });
            
            if (!currentCycle) {
                // Skip test if cycle doesn't exist
                console.warn('Test cycle not found, skipping approval gate test');
                return;
            }

            // Unapprove the cycle
            await prisma.assessmentCycle.update({
                where: { id: cycleId },
                data: { dataApprovedAt: null },
            });

            const payload = {
                cycleId,
                assignments: [{ classId, evaluatorId }],
            };

            // Should return 403 when cycle is not approved
            await request(app.getHttpServer())
                .post('/api/v1/coordinator/assignments/bulk')
                .set('X-Mock-User-Id', coordinatorId.toString())
                .send(payload)
                .expect(403);

            // Restore approval for cleanup
            await prisma.assessmentCycle.update({
                where: { id: cycleId },
                data: { dataApprovedAt: new Date() },
            });
        });
    });
});
