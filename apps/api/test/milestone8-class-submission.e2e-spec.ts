import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Milestone 8 – Class Summary, Submission & Needs Review (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let coordinatorId: number;
    let evaluatorId: number;
    let cycleId: number;
    let schoolId: number;
    let classId: number;
    let studentId: number;
    let assessmentId: number;

    beforeAll(async () => {
        process.env.AUTH_MOCK = 'true';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        prisma = app.get<PrismaService>(PrismaService);
        app.setGlobalPrefix('api/v1');
        await app.init();

        // --- Fixtures ---

        // Roles
        await prisma.role.upsert({ where: { name: 'COORDINATOR' }, update: {}, create: { name: 'COORDINATOR' } });
        await prisma.role.upsert({ where: { name: 'EVALUATOR' }, update: {}, create: { name: 'EVALUATOR' } });

        // Users
        const coordinator = await prisma.user.upsert({
            where: { email: 'm8-coord@test.com' },
            update: {},
            create: {
                email: 'm8-coord@test.com',
                externalAuthId: 'auth0|m8-coord',
                firstName: 'M8',
                lastName: 'Coordinator',
                isActive: true,
            },
        });
        coordinatorId = coordinator.id;

        const coordRole = await prisma.role.findUnique({ where: { name: 'COORDINATOR' } });
        if (coordRole) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: coordinatorId, roleId: coordRole.id } },
                update: {},
                create: { userId: coordinatorId, roleId: coordRole.id },
            });
        }

        const evaluator = await prisma.user.upsert({
            where: { email: 'm8-eval@test.com' },
            update: {},
            create: {
                email: 'm8-eval@test.com',
                externalAuthId: 'auth0|m8-eval',
                firstName: 'M8',
                lastName: 'Evaluator',
                isActive: true,
            },
        });
        evaluatorId = evaluator.id;

        const evalRole = await prisma.role.findUnique({ where: { name: 'EVALUATOR' } });
        if (evalRole) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: evaluatorId, roleId: evalRole.id } },
                update: {},
                create: { userId: evaluatorId, roleId: evalRole.id },
            });
        }

        // Cycle (approved)
        const cycle = await prisma.assessmentCycle.create({
            data: {
                name: 'M8 Test Cycle',
                year: 2026,
                startsOn: new Date('2026-01-01'),
                endsOn: new Date('2026-12-31'),
                isActive: true,
                dataApprovedAt: new Date(),
                dataApprovedBy: coordinatorId,
            },
        });
        cycleId = cycle.id;

        // Ingestion log (needed for cycle approval checks)
        await prisma.ingestionLog.create({
            data: {
                entityType: 'schools',
                recordsTotal: 1,
                recordsUpserted: 1,
                recordsFailed: 0,
            },
        });

        // School
        const school = await prisma.school.create({
            data: { schoolCode: 'M8-SCHOOL', name: 'M8 Test School' },
        });
        schoolId = school.id;

        // Class
        const cls = await prisma.class.create({
            data: {
                cycleId,
                schoolId,
                classCode: 'M8-CLASS-01',
                isActive: true,
                isIncluded: true,
            },
        });
        classId = cls.id;

        // Student (requires schoolId)
        const student = await prisma.student.create({
            data: {
                cycleId,
                schoolId,
                studentNumber: 'M8-STU-001',
                firstName: 'Test',
                lastName: 'Student',
            },
        });
        studentId = student.id;

        // Enroll student in class
        await prisma.classStudent.create({
            data: { classId, studentId },
        });

        // Assessment
        const assessment = await prisma.assessment.create({
            data: {
                cycleId,
                studentId,
                evaluatorId,
                status: 'NOT_STARTED',
            },
        });
        assessmentId = assessment.id;

        // Evaluator assignment
        await prisma.evaluatorAssignment.create({
            data: {
                cycleId,
                classId,
                evaluatorId,
                assignedBy: coordinatorId,
            },
        });
    });

    afterAll(async () => {
        // Cleanup in reverse dependency order
        if (cycleId) {
            await prisma.assessmentAuditLog.deleteMany({ where: { assessment: { cycleId } } });
            await prisma.assessmentScore.deleteMany({ where: { assessment: { cycleId } } });
            await prisma.assessmentNote.deleteMany({ where: { assessment: { cycleId } } });
            await prisma.audioRecording.deleteMany({ where: { assessment: { cycleId } } });
            await prisma.assessmentCriteriaResult.deleteMany({ where: { assessment: { cycleId } } });
            await prisma.assessment.deleteMany({ where: { cycleId } });
            await prisma.evaluatorAssignment.deleteMany({ where: { cycleId } });
            await prisma.classStudent.deleteMany({ where: { class: { cycleId } } });
            await prisma.class.deleteMany({ where: { cycleId } });
            await prisma.student.deleteMany({ where: { cycleId } });
            await prisma.assessmentCycle.deleteMany({ where: { id: cycleId } });
        }
        if (schoolId) await prisma.school.deleteMany({ where: { id: schoolId } });
        if (coordinatorId) await prisma.user.deleteMany({ where: { id: coordinatorId } });
        if (evaluatorId) await prisma.user.deleteMany({ where: { id: evaluatorId } });
        await app.close();
    });

    // ─── Class Summary ───────────────────────────────────────────────

    describe('GET /api/v1/classes/:id/summary', () => {
        it('should return class summary', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/classes/${classId}/summary`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    // ─── Submission Status ───────────────────────────────────────────

    describe('GET /api/v1/classes/:id/submission-status', () => {
        it('should return submission status for a class', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/classes/${classId}/submission-status`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('canSubmit');
        });

        it('should indicate class is NOT ready when assessments are incomplete', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/classes/${classId}/submission-status`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(200);

            expect(res.body.data.canSubmit).toBe(false);
        });
    });

    // ─── Validate Submission ─────────────────────────────────────────

    describe('POST /api/v1/assessments/:id/validate-submission', () => {
        it('should validate submission requirements for an assessment', async () => {
            const res = await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/validate-submission`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(201);

            expect(res.body).toHaveProperty('canSubmit');
            expect(res.body.canSubmit).toBe(false);
            expect(res.body.requirements).toBeDefined();
            expect(res.body.requirements.length).toBeGreaterThan(0);
        });
    });

    // ─── Flag for Review ─────────────────────────────────────────────

    describe('POST /api/v1/assessments/:id/flag-review', () => {
        it('should flag an assessment for coordinator review', async () => {
            await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/flag-review`)
                .set('X-Mock-User-Id', coordinatorId.toString())
                .send({ reason: 'Score seems inconsistent' })
                .expect(201);

            // Verify in DB
            const assessment = await prisma.assessment.findUnique({
                where: { id: assessmentId },
            });
            expect(assessment?.needsReview).toBe(true);
        });

        it('should create an audit log entry for flagging', async () => {
            const logs = await prisma.assessmentAuditLog.findMany({
                where: {
                    assessmentId,
                    action: 'ASSESSMENT_FLAGGED_FOR_REVIEW',
                },
            });
            expect(logs.length).toBeGreaterThan(0);
        });
    });

    // ─── Needs Review ────────────────────────────────────────────────

    describe('GET /api/v1/classes/:id/needs-review', () => {
        it('should return flagged assessments for coordinator', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/classes/${cycleId}/needs-review`)
                .set('X-Mock-User-Id', coordinatorId.toString())
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should include the flagged assessment', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/classes/${cycleId}/needs-review`)
                .set('X-Mock-User-Id', coordinatorId.toString())
                .expect(200);

            const flagged = res.body.data.find(
                (a: { id: number }) => a.id === assessmentId,
            );
            expect(flagged).toBeDefined();
            expect(flagged.needsReview).toBe(true);
        });
    });

    // ─── Class Submission ────────────────────────────────────────────

    describe('POST /api/v1/assessments/classes/:classId/submit', () => {
        it('should submit class (assessments still incomplete)', async () => {
            const res = await request(app.getHttpServer())
                .post(`/api/v1/assessments/classes/${classId}/submit`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .send({ submittedBy: evaluatorId, notes: 'Test submission' })
                .expect(201);

            expect(res.body).toBeDefined();
        });

        it('should submit class when assessments are completed', async () => {
            // Ensure an OPI level exists (id is the level number)
            let level = await prisma.opiLevel.findFirst();
            if (!level) {
                level = await prisma.opiLevel.create({
                    data: { id: 10, description: 'OPI Score 10' },
                });
            }

            // Update assessment to COMPLETED
            await prisma.assessment.update({
                where: { id: assessmentId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    needsReview: false,
                },
            });

            // Add a score (updatedBy, not scoredBy)
            await prisma.assessmentScore.upsert({
                where: { assessmentId },
                update: { opiLevelId: level.id, updatedBy: evaluatorId },
                create: {
                    assessmentId,
                    opiLevelId: level.id,
                    updatedBy: evaluatorId,
                },
            });

            const res = await request(app.getHttpServer())
                .post(`/api/v1/assessments/classes/${classId}/submit`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .send({ submittedBy: evaluatorId, notes: 'Final submission' })
                .expect(201);

            expect(res.body).toBeDefined();

            // Verify audit log was created
            const auditLogs = await prisma.assessmentAuditLog.findMany({
                where: { action: 'CLASS_SUBMITTED' },
                orderBy: { changedAt: 'desc' },
                take: 1,
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });
    });
});
