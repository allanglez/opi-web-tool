import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { AssessmentsService } from '../src/modules/assessments/assessments.service';
import { CyclesService } from '../src/modules/cycles/cycles.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('AssessmentsService - Milestone 6 E2E Tests', () => {
    let service: AssessmentsService;
    let prisma: PrismaService;
    let cyclesService: CyclesService;
    let auditService: AuditService;

    const mockCycle = {
        id: 1,
        name: 'Test Cycle',
        isActive: true,
        dataApprovedAt: new Date(),
    };

    const mockEvaluator = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
    };

    const mockStudent = {
        id: 1,
        studentNumber: 'STU001',
        firstName: 'Jane',
        lastName: 'Smith',
        cycleId: 1,
    };

    const mockClass = {
        id: 1,
        classCode: 'CLASS001',
        grade: 5,
        cycleId: 1,
    };

    beforeEach(async () => {
        const mockPrisma = {
            $transaction: jest.fn(),
            student: {
                findUnique: jest.fn(),
            },
            evaluatorAssignment: {
                findFirst: jest.fn(),
            },
            assessment: {
                findUnique: jest.fn(),
                update: jest.fn(),
                create: jest.fn(),
            },
            assessmentScore: {
                upsert: jest.fn(),
            },
            $queryRaw: jest.fn(),
        };

        const mockCyclesService = {
            checkCycleApproval: jest.fn().mockResolvedValue(mockCycle),
        };

        const mockAuditService = {
            logAssessmentAction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AssessmentsService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: CyclesService,
                    useValue: mockCyclesService,
                },
                {
                    provide: AuditService,
                    useValue: mockAuditService,
                },
            ],
        }).compile();

        service = module.get<AssessmentsService>(AssessmentsService);
        prisma = module.get<PrismaService>(PrismaService);
        cyclesService = module.get<CyclesService>(CyclesService);
        auditService = module.get<AuditService>(AuditService);
    });

    describe('Concurrency and Locking Tests', () => {
        it('should allow first evaluator to start assessment', async () => {
            // Arrange
            (prisma.student.findUnique as jest.Mock).mockResolvedValue({
                ...mockStudent,
                classStudents: [{ class: mockClass }],
            });

            (prisma.evaluatorAssignment.findFirst as jest.Mock).mockResolvedValue({
                evaluatorId: mockEvaluator.id,
                classId: mockClass.id,
                cycleId: mockCycle.id,
            });

            (prisma.$queryRaw as jest.Mock).mockResolvedValue([]); // No existing assessment

            const mockTransaction = jest.fn().mockImplementation((callback) => {
                return callback({
                    $queryRaw: prisma.$queryRaw,
                    assessment: {
                        update: jest.fn().mockResolvedValue({
                            id: 1,
                            status: 'IN_PROGRESS',
                            evaluatorId: mockEvaluator.id,
                            student: mockStudent,
                            evaluator: mockEvaluator,
                        }),
                        create: jest.fn().mockResolvedValue({
                            id: 1,
                            status: 'IN_PROGRESS',
                            evaluatorId: mockEvaluator.id,
                            student: mockStudent,
                            evaluator: mockEvaluator,
                        }),
                    },
                });
            });

            (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

            // Act
            const result = await service.startAssessment(
                { studentId: mockStudent.id, cycleId: mockCycle.id },
                mockEvaluator.id,
            );

            // Assert
            expect(result.status).toBe('IN_PROGRESS');
            expect(result.evaluatorId).toBe(mockEvaluator.id);
            expect(auditService.logAssessmentAction).toHaveBeenCalledWith(
                1,
                'ASSESSMENT_START',
                mockEvaluator.id,
                'status',
                'NOT_STARTED',
                'IN_PROGRESS',
            );
        });

        it('should throw 409 when second evaluator tries to start same assessment', async () => {
            // Arrange
            (prisma.student.findUnique as jest.Mock).mockResolvedValue({
                ...mockStudent,
                classStudents: [{ class: mockClass }],
            });

            (prisma.evaluatorAssignment.findFirst as jest.Mock).mockResolvedValue({
                evaluatorId: 2, // Different evaluator
                classId: mockClass.id,
                cycleId: mockCycle.id,
            });

            (prisma.$queryRaw as jest.Mock).mockResolvedValue([
                {
                    id: 1,
                    evaluator_id: mockEvaluator.id,
                    status: 'IN_PROGRESS',
                },
            ]);

            const mockTransaction = jest.fn().mockImplementation((callback) => {
                return callback({
                    $queryRaw: prisma.$queryRaw,
                });
            });

            (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

            // Act & Assert
            await expect(
                service.startAssessment(
                    { studentId: mockStudent.id, cycleId: mockCycle.id },
                    2, // Different evaluator
                ),
            ).rejects.toThrow(
                new ConflictException({
                    statusCode: 409,
                    message: 'Assessment is locked by another evaluator',
                    error: 'ASSESSMENT_LOCKED',
                    details: {
                        assessmentId: 1,
                        evaluatorId: mockEvaluator.id,
                    },
                }),
            );
        });

        it('should throw 403 when evaluator not assigned to class', async () => {
            // Arrange
            (prisma.student.findUnique as jest.Mock).mockResolvedValue({
                ...mockStudent,
                classStudents: [{ class: mockClass }],
            });

            (prisma.evaluatorAssignment.findFirst as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.startAssessment(
                    { studentId: mockStudent.id, cycleId: mockCycle.id },
                    mockEvaluator.id,
                ),
            ).rejects.toThrow(
                new ForbiddenException({
                    statusCode: 403,
                    message: 'You are not assigned to this class',
                    error: 'NOT_ASSIGNED_TO_CLASS',
                }),
            );
        });
    });

    describe('State Transition Tests', () => {
        it('should complete assessment from IN_PROGRESS', async () => {
            // Arrange
            const mockAssessment = {
                id: 1,
                evaluatorId: mockEvaluator.id,
                status: 'IN_PROGRESS',
            };

            (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

            const mockTransaction = jest.fn().mockImplementation((callback) => {
                return callback({
                    assessmentScore: {
                        upsert: jest.fn(),
                    },
                    assessment: {
                        update: jest.fn().mockResolvedValue({
                            ...mockAssessment,
                            status: 'COMPLETED',
                            completedAt: new Date(),
                        }),
                    },
                });
            });

            (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

            // Act
            const result = await service.completeAssessment(
                1,
                { opiLevelId: 3, notes: 'Good performance' },
                mockEvaluator.id,
            );

            // Assert
            expect(result.status).toBe('COMPLETED');
            expect(auditService.logAssessmentAction).toHaveBeenCalledWith(
                1,
                'ASSESSMENT_COMPLETE',
                mockEvaluator.id,
                'status',
                'IN_PROGRESS',
                'COMPLETED',
            );
        });

        it('should reopen completed assessment', async () => {
            // Arrange
            const mockAssessment = {
                id: 1,
                status: 'COMPLETED',
            };

            (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

            (prisma.assessment.update as jest.Mock).mockResolvedValue({
                ...mockAssessment,
                status: 'IN_PROGRESS',
                completedAt: null,
            });

            // Act
            const result = await service.reopenAssessment(1, mockEvaluator.id);

            // Assert
            expect(result.status).toBe('IN_PROGRESS');
            expect(result.completedAt).toBeNull();
            expect(auditService.logAssessmentAction).toHaveBeenCalledWith(
                1,
                'ASSESSMENT_REOPEN',
                mockEvaluator.id,
                'status',
                'COMPLETED',
                'IN_PROGRESS',
            );
        });

        it('should mark assessment as absent', async () => {
            // Arrange
            const mockAssessment = {
                id: 1,
                evaluatorId: mockEvaluator.id,
                status: 'IN_PROGRESS',
            };

            (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

            const mockTransaction = jest.fn().mockImplementation((callback) => {
                return callback({
                    assessment: {
                        update: jest.fn().mockResolvedValue({
                            ...mockAssessment,
                            status: 'ABSENT',
                            completedAt: new Date(),
                        }),
                    },
                });
            });

            (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

            // Act
            const result = await service.markAbsent(1, mockEvaluator.id);

            // Assert
            expect(result.status).toBe('ABSENT');
            expect(result.completedAt).toBeDefined();
            expect(auditService.logAssessmentAction).toHaveBeenCalledWith(
                1,
                'ASSESSMENT_MARK_ABSENT',
                mockEvaluator.id,
                'status',
                'IN_PROGRESS',
                'ABSENT',
            );
        });
    });

    describe('Validation Tests', () => {
        it('should throw validation error when completing without OPI level', async () => {
            // Arrange
            const mockAssessment = {
                id: 1,
                evaluatorId: mockEvaluator.id,
                status: 'IN_PROGRESS',
            };

            (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

            // Act & Assert
            await expect(
                service.completeAssessment(
                    1,
                    { opiLevelId: undefined, notes: 'No level' },
                    mockEvaluator.id,
                ),
            ).rejects.toThrow(
                new BadRequestException({
                    statusCode: 400,
                    message: 'OPI level is required to complete assessment',
                    error: 'VALIDATION_ERROR',
                }),
            );
        });

        it('should throw error when trying to update completed assessment', async () => {
            // Arrange
            const mockAssessment = {
                id: 1,
                evaluatorId: mockEvaluator.id,
                status: 'COMPLETED',
            };

            (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

            // Act & Assert
            await expect(
                service.updateAssessment(
                    1,
                    { opiLevelId: 3, notes: 'Update' },
                    mockEvaluator.id,
                ),
            ).rejects.toThrow(
                new BadRequestException({
                    statusCode: 400,
                    message: 'Cannot update a completed assessment',
                    error: 'ASSESSMENT_COMPLETED',
                }),
            );
        });

        it('should throw error when non-assigned evaluator tries to update', async () => {
            // Arrange
            const mockAssessment = {
                id: 1,
                evaluatorId: 999, // Different evaluator
                status: 'IN_PROGRESS',
            };

            (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

            // Act & Assert
            await expect(
                service.updateAssessment(
                    1,
                    { opiLevelId: 3, notes: 'Update' },
                    mockEvaluator.id,
                ),
            ).rejects.toThrow(
                new ForbiddenException({
                    statusCode: 403,
                    message: 'You are not assigned evaluator for this assessment',
                    error: 'NOT_ASSIGNED',
                }),
            );
        });
    });
});
