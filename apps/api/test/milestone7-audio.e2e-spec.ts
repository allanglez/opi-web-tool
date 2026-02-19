import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Milestone 7 Audio Upload E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let coordinatorId: number;
    let evaluatorId: number;
    let otherEvaluatorId: number;
    let cycleId: number;
    let schoolId: number;
    let classId: number;
    let studentId: number;
    let assessmentId: number;

    // Test fixture file path
    const audioFixturePath = path.join(__dirname, 'fixtures', 'sample.webm');

    beforeAll(async () => {
        process.env.AUTH_MOCK = 'true';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        app.setGlobalPrefix('api/v1');
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Ensure roles exist
        await prisma.role.upsert({ where: { name: 'COORDINATOR' }, update: {}, create: { name: 'COORDINATOR' } });
        await prisma.role.upsert({ where: { name: 'EVALUATOR' }, update: {}, create: { name: 'EVALUATOR' } });
        await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });

        await prisma.opiLevel.upsert({
            where: { id: 12 },
            update: { description: 'OPI Score 12' },
            create: { id: 12, description: 'OPI Score 12' },
        });

        // Create coordinator
        const coordinator = await prisma.user.upsert({
            where: { email: 'm7-coord@test.com' },
            update: {},
            create: {
                email: 'm7-coord@test.com',
                externalAuthId: 'auth0|m7-coord',
                firstName: 'M7',
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

        // Create evaluator
        const evaluator = await prisma.user.upsert({
            where: { email: 'm7-eval@test.com' },
            update: {},
            create: {
                email: 'm7-eval@test.com',
                externalAuthId: 'auth0|m7-eval',
                firstName: 'M7',
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

        // Create other evaluator (for authorization tests)
        const otherEvaluator = await prisma.user.upsert({
            where: { email: 'm7-eval2@test.com' },
            update: {},
            create: {
                email: 'm7-eval2@test.com',
                externalAuthId: 'auth0|m7-eval2',
                firstName: 'M7',
                lastName: 'Evaluator2',
                isActive: true,
            },
        });
        otherEvaluatorId = otherEvaluator.id;

        if (evalRole) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: otherEvaluatorId, roleId: evalRole.id } },
                update: {},
                create: { userId: otherEvaluatorId, roleId: evalRole.id },
            });
        }

        // Create cycle
        const cycle = await prisma.assessmentCycle.create({
            data: {
                name: 'M7 Test Cycle',
                year: 2026,
                startsOn: new Date('2026-01-01'),
                endsOn: new Date('2026-12-31'),
                isActive: true,
                dataApprovedAt: new Date(),
                dataApprovedBy: coordinatorId,
            },
        });
        cycleId = cycle.id;

        // Create school
        const school = await prisma.school.create({
            data: {
                schoolCode: 'M7-SCHOOL',
                name: 'M7 Test School',
            },
        });
        schoolId = school.id;

        // Create class
        const cls = await prisma.class.create({
            data: {
                cycleId,
                schoolId,
                classCode: 'M7-CLASS-01',
                isActive: true,
                isIncluded: true,
            },
        });
        classId = cls.id;

        // Create student
        const student = await prisma.student.create({
            data: {
                studentNumber: 'M7-STU001',
                firstName: 'Test',
                lastName: 'Student',
                cycleId,
                schoolId,
            },
        });
        studentId = student.id;

        // Enroll student in class
        await prisma.classStudent.create({
            data: {
                classId,
                studentId,
            },
        });

        // Assign evaluator to class
        await prisma.evaluatorAssignment.create({
            data: {
                cycleId,
                classId,
                evaluatorId,
                assignedBy: coordinatorId,
            },
        });

        // Create assessment
        const assessment = await prisma.assessment.create({
            data: {
                studentId,
                cycleId,
                status: 'NOT_STARTED',
            },
        });
        assessmentId = assessment.id;
    });

    afterAll(async () => {
        // Cleanup test data
        const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
        
        // Clean up test files
        try {
            if (fs.existsSync(uploadDir)) {
                const files = fs.readdirSync(uploadDir);
                for (const file of files) {
                    if (file.includes('sample')) {
                        fs.unlinkSync(path.join(uploadDir, file));
                    }
                }
            }
        } catch (error) {
            console.warn('Warning: Could not clean up test files:', error);
        }

        // Clean up database
        if (cycleId) {
            await prisma.evaluatorAssignment.deleteMany({ where: { cycleId } });
            await prisma.classStudent.deleteMany({ where: { student: { cycleId } } });
            await prisma.class.deleteMany({ where: { cycleId } });
            await prisma.student.deleteMany({ where: { cycleId } });
            await prisma.schoolAssessmentDate.deleteMany({ where: { cycleId } });
            await prisma.assessmentCycle.deleteMany({ where: { id: cycleId } });
        }
        if (schoolId) await prisma.school.deleteMany({ where: { id: schoolId } });
        if (coordinatorId) await prisma.user.deleteMany({ where: { id: coordinatorId } });
        if (evaluatorId) await prisma.user.deleteMany({ where: { id: evaluatorId } });
        if (otherEvaluatorId) await prisma.user.deleteMany({ where: { id: otherEvaluatorId } });
        
        await app.close();
    });

    describe('Audio Upload Tests', () => {
        it('should upload audio file successfully', async () => {
            // Ensure fixture file exists
            expect(fs.existsSync(audioFixturePath)).toBe(true);

            const response = await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .attach('file', audioFixturePath)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('assessmentId', assessmentId);
            expect(response.body).toHaveProperty('storageProvider', 'local');
            expect(response.body).toHaveProperty('storageKey');
            expect(response.body).toHaveProperty('fileName');
            expect(response.body).toHaveProperty('mimeType');
            expect(response.body).toHaveProperty('fileSizeBytes');
            expect(response.body).toHaveProperty('uploadedBy', evaluatorId);
            expect(response.body).toHaveProperty('uploadedAt');

            // Verify database record exists
            const recording = await prisma.audioRecording.findUnique({
                where: { id: response.body.id },
            });
            expect(recording).toBeDefined();
            expect(recording?.assessmentId).toBe(assessmentId);

            // Verify file exists on disk
            const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
            const filePath = path.join(uploadDir, recording?.storageKey || '');
            expect(fs.existsSync(filePath)).toBe(true);
        });

        it('should reject upload from unassigned evaluator', async () => {
            await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', otherEvaluatorId.toString())
                .attach('file', audioFixturePath)
                .expect(403);
        });

        it('should reject upload without file', async () => {
            await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(400);
        });

        it('should reject invalid file type', async () => {
            // Create a text file as invalid fixture
            const invalidFixturePath = path.join(__dirname, 'fixtures', 'invalid.txt');
            fs.writeFileSync(invalidFixturePath, 'This is not an audio file');

            await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .attach('file', invalidFixturePath)
                .expect(400);

            // Clean up
            fs.unlinkSync(invalidFixturePath);
        });
    });

    describe('Completion Rules Tests', () => {
        it('should require audio for COMPLETED status', async () => {
            // Create a new assessment without audio
            const newAssessment = await prisma.assessment.create({
                data: {
                    studentId,
                    cycleId,
                    status: 'IN_PROGRESS',
                    evaluatorId,
                },
            });

            // Try to complete without audio - should fail
            await request(app.getHttpServer())
                .post(`/api/v1/assessments/${newAssessment.id}/complete`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .send({ opiLevelId: 12, notes: 'Test completion' })
                .expect(400);

            // Clean up
            await prisma.assessment.delete({ where: { id: newAssessment.id } });
        });

        it('should allow completion after audio upload', async () => {
            // Create a new assessment
            const newAssessment = await prisma.assessment.create({
                data: {
                    studentId,
                    cycleId,
                    status: 'IN_PROGRESS',
                    evaluatorId,
                },
            });

            // Upload audio first
            await request(app.getHttpServer())
                .post(`/api/v1/assessments/${newAssessment.id}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .attach('file', audioFixturePath)
                .expect(201);

            // Now completion should succeed
            const response = await request(app.getHttpServer())
                .post(`/api/v1/assessments/${newAssessment.id}/complete`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .send({ opiLevelId: 12, notes: 'Test completion with audio' })
                .expect(200);

            expect(response.body.status).toBe('COMPLETED');
            expect(response.body.completedAt).toBeDefined();

            // Clean up
            await prisma.assessment.delete({ where: { id: newAssessment.id } });
        });

        it('should allow ABSENT status without audio', async () => {
            // Create a new assessment
            const newAssessment = await prisma.assessment.create({
                data: {
                    studentId,
                    cycleId,
                    status: 'IN_PROGRESS',
                    evaluatorId,
                },
            });

            // Mark as absent - should succeed without audio
            const response = await request(app.getHttpServer())
                .post(`/api/v1/assessments/${newAssessment.id}/mark-absent`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(200);

            expect(response.body.status).toBe('ABSENT');
            expect(response.body.completedAt).toBeDefined();

            // Clean up
            await prisma.assessment.delete({ where: { id: newAssessment.id } });
        });
    });

    describe('Audio Listing Tests', () => {
        it('should list audio recordings for assessment', async () => {
            // First upload an audio file
            const uploadResponse = await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .attach('file', audioFixturePath)
                .expect(201);

            // Now list recordings
            const listResponse = await request(app.getHttpServer())
                .get(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .expect(200);

            expect(Array.isArray(listResponse.body)).toBe(true);
            expect(listResponse.body.length).toBeGreaterThan(0);
            
            const recording = listResponse.body[0];
            expect(recording).toHaveProperty('id', uploadResponse.body.id);
            expect(recording).toHaveProperty('assessmentId', assessmentId);
            expect(recording).toHaveProperty('downloadUrl');
            expect(recording).toHaveProperty('uploader');
        });

        it('should reject listing for unassigned evaluator', async () => {
            await request(app.getHttpServer())
                .get(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', otherEvaluatorId.toString())
                .expect(403);
        });
    });

    describe('Audio Download Tests', () => {
        it('should provide download endpoint', async () => {
            // Upload audio first
            const uploadResponse = await request(app.getHttpServer())
                .post(`/api/v1/assessments/${assessmentId}/audio`)
                .set('X-Mock-User-Id', evaluatorId.toString())
                .attach('file', audioFixturePath)
                .expect(201);

            // Try to download
            await request(app.getHttpServer())
                .get(`/api/v1/assessments/${assessmentId}/audio/${uploadResponse.body.storageKey}/download`)
                .expect(200);
        });

        it('should return 404 for non-existent file', async () => {
            await request(app.getHttpServer())
                .get(`/api/v1/assessments/${assessmentId}/audio/non-existent-file/download`)
                .expect(404);
        });
    });
});
