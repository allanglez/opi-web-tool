import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CyclesService } from '../cycles/cycles.service';

@Injectable()
export class EvaluatorService {
    constructor(
        private prisma: PrismaService,
        private cyclesService: CyclesService,
    ) { }

    /**
     * Get all classes assigned to the evaluator with progress summary.
     */
    async getAssignedClasses(evaluatorId: number) {
        // Check cycle is approved
        const cycle = await this.cyclesService.checkCycleApproval();

        // Get assignments for this evaluator
        const assignments = await this.prisma.evaluatorAssignment.findMany({
            where: {
                evaluatorId,
                cycleId: cycle.id,
                class: {
                    isIncluded: true,
                },
            },
            include: {
                class: {
                    include: {
                        school: true,
                        program: true,
                        teacher: true,
                        classStudents: {
                            include: {
                                student: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { class: { school: { name: 'asc' } } },
                { class: { classCode: 'asc' } },
            ],
        });

        // Calculate progress for each class
        const classesWithProgress = await Promise.all(
            assignments.map(async (assignment) => {
                const studentIds = assignment.class.classStudents.map((cs) => cs.studentId);

                if (studentIds.length === 0) {
                    return {
                        id: assignment.class.id,
                        classCode: assignment.class.classCode,
                        grade: assignment.class.grade,
                        teacher: assignment.class.teacher?.name ?? null,
                        school: assignment.class.school,
                        program: assignment.class.program,
                        totalStudents: 0,
                        notStarted: 0,
                        inProgress: 0,
                        completed: 0,
                        absent: 0,
                        assignmentId: assignment.id,
                    };
                }

                // Get assessment statuses for students in this class
                const assessments = await this.prisma.assessment.findMany({
                    where: {
                        cycleId: cycle.id,
                        studentId: { in: studentIds },
                    },
                    select: {
                        studentId: true,
                        status: true,
                    },
                });

                const assessmentMap = new Map(
                    assessments.map((a) => [a.studentId, a.status]),
                );

                let notStarted = 0;
                let inProgress = 0;
                let completed = 0;
                let absent = 0;

                for (const studentId of studentIds) {
                    const status = assessmentMap.get(studentId) || 'NOT_STARTED';
                    if (status === 'NOT_STARTED') notStarted++;
                    else if (status === 'IN_PROGRESS') inProgress++;
                    else if (status === 'COMPLETED') completed++;
                    else if (status === 'ABSENT') absent++;
                }

                return {
                    id: assignment.class.id,
                    classCode: assignment.class.classCode,
                    grade: assignment.class.grade,
                    teacher: assignment.class.teacher?.name ?? null,
                    school: assignment.class.school,
                    program: assignment.class.program,
                    totalStudents: studentIds.length,
                    notStarted,
                    inProgress,
                    completed,
                    absent,
                    assignmentId: assignment.id,
                };
            }),
        );

        return {
            cycle: {
                id: cycle.id,
                name: cycle.name,
            },
            classes: classesWithProgress,
        };
    }

    /**
     * Get students in a class with their assessment status.
     */
    async getClassStudents(classId: number, evaluatorId: number) {
        // Check cycle is approved
        const cycle = await this.cyclesService.checkCycleApproval();

        // Check evaluator is assigned to this class
        const assignment = await this.prisma.evaluatorAssignment.findFirst({
            where: {
                classId,
                evaluatorId,
                cycleId: cycle.id,
            },
        });

        if (!assignment) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'You are not assigned to this class',
                error: 'NOT_ASSIGNED',
            });
        }

        // Get class with students
        const classEntity = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                school: true,
                program: true,
                teacher: true,
                classStudents: {
                    include: {
                        student: true,
                    },
                },
            },
        });

        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        if (!classEntity.isIncluded) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'Class is not included in the assessment cycle',
                error: 'CLASS_NOT_INCLUDED',
            });
        }

        const studentIds = classEntity.classStudents.map((cs) => cs.studentId);

        // Get assessments for these students
        const assessments = await this.prisma.assessment.findMany({
            where: {
                cycleId: cycle.id,
                studentId: { in: studentIds },
            },
            include: {
                evaluator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                score: {
                    include: {
                        opiLevel: true,
                    },
                },
            },
        });

        const assessmentMap = new Map(
            assessments.map((a) => [a.studentId, a]),
        );

        const studentsWithStatus = classEntity.classStudents.map((cs) => {
            const assessment = assessmentMap.get(cs.studentId);
            return {
                id: cs.student.id,
                studentNumber: cs.student.studentNumber,
                firstName: cs.student.firstName,
                lastName: cs.student.lastName,
                grade: cs.student.grade,
                assessment: assessment
                    ? {
                        id: assessment.id,
                        status: assessment.status,
                        evaluatorId: assessment.evaluator?.id,
                        evaluatorName: assessment.evaluator
                            ? `${assessment.evaluator.firstName} ${assessment.evaluator.lastName}`
                            : null,
                        startedAt: assessment.startedAt,
                        completedAt: assessment.completedAt,
                        opiLevel: assessment.score?.opiLevel?.description,
                    }
                    : {
                        id: null,
                        status: 'NOT_STARTED',
                        evaluatorId: null,
                        evaluatorName: null,
                        startedAt: null,
                        completedAt: null,
                        opiLevel: null,
                    },
                isLocked: assessment?.evaluatorId !== null && assessment?.evaluatorId !== evaluatorId && assessment?.status === 'IN_PROGRESS',
            };
        });

        return {
            class: {
                id: classEntity.id,
                classCode: classEntity.classCode,
                grade: classEntity.grade,
                teacher: classEntity.teacher?.name ?? null,
                school: classEntity.school,
                program: classEntity.program,
            },
            students: studentsWithStatus.sort((a, b) =>
                a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
            ),
        };
    }
}
