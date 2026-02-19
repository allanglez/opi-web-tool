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
     * Get enriched dashboard data: stats, schools, next students, recent assessments.
     */
    async getDashboard(evaluatorId: number) {
        const cycle = await this.cyclesService.checkCycleApproval();

        const assignments = await this.prisma.evaluatorAssignment.findMany({
            where: {
                evaluatorId,
                cycleId: cycle.id,
                class: { isIncluded: true },
            },
            include: {
                class: {
                    include: {
                        school: true,
                        program: true,
                        teacher: true,
                        classStudents: {
                            include: { student: true },
                        },
                    },
                },
            },
        });

        // Collect all student IDs across all assigned classes
        const allStudentIds: number[] = [];
        for (const a of assignments) {
            for (const cs of a.class.classStudents) {
                if (!allStudentIds.includes(cs.studentId)) {
                    allStudentIds.push(cs.studentId);
                }
            }
        }

        // Get all assessments for these students in this cycle
        const assessments = await this.prisma.assessment.findMany({
            where: {
                cycleId: cycle.id,
                studentId: { in: allStudentIds.length > 0 ? allStudentIds : [-1] },
            },
            include: {
                student: {
                    include: { school: true },
                },
                score: { include: { opiLevel: true } },
                evaluator: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { lastModifiedAt: 'desc' },
        });

        const assessmentMap = new Map(assessments.map((a) => [a.studentId, a]));

        // Overall stats
        let totalStudents = 0;
        let completed = 0;
        let inProgress = 0;
        let notStarted = 0;

        for (const sid of allStudentIds) {
            totalStudents++;
            const status = assessmentMap.get(sid)?.status || 'NOT_STARTED';
            if (status === 'COMPLETED') completed++;
            else if (status === 'IN_PROGRESS') inProgress++;
            else notStarted++;
        }

        const progressPercent = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;

        // Group by school
        const schoolMap = new Map<number, {
            id: number;
            name: string;
            schoolType: string | null;
            studentCount: number;
            progress: number;
            assessmentDates: string[];
            classIds: number[];
        }>();

        for (const a of assignments) {
            const school = a.class.school;
            if (!schoolMap.has(school.id)) {
                schoolMap.set(school.id, {
                    id: school.id,
                    name: school.name,
                    schoolType: school.schoolType,
                    studentCount: 0,
                    progress: 0,
                    assessmentDates: [],
                    classIds: [],
                });
            }
            const entry = schoolMap.get(school.id)!;
            entry.classIds.push(a.class.id);
            entry.studentCount += a.class.classStudents.length;
        }

        // Get assessment dates for each school
        const schoolIds = [...schoolMap.keys()];
        if (schoolIds.length > 0) {
            const dates = await this.prisma.schoolAssessmentDate.findMany({
                where: {
                    cycleId: cycle.id,
                    schoolId: { in: schoolIds },
                },
                orderBy: { assessmentDate: 'asc' },
            });
            for (const d of dates) {
                const entry = schoolMap.get(d.schoolId);
                if (entry) {
                    const dateStr = d.assessmentDate.toISOString().split('T')[0];
                    if (!entry.assessmentDates.includes(dateStr)) {
                        entry.assessmentDates.push(dateStr);
                    }
                }
            }
        }

        // Calculate per-school progress
        for (const a of assignments) {
            const entry = schoolMap.get(a.class.school.id)!;
            let schoolCompleted = 0;
            for (const cs of a.class.classStudents) {
                const status = assessmentMap.get(cs.studentId)?.status || 'NOT_STARTED';
                if (status === 'COMPLETED') schoolCompleted++;
            }
            entry.progress = entry.studentCount > 0
                ? Math.round((schoolCompleted / entry.studentCount) * 100)
                : 0;
        }

        const schools = [...schoolMap.values()];

        // Next students to assess (IN_PROGRESS first, then NOT_STARTED)
        const nextStudents: any[] = [];
        for (const a of assignments) {
            for (const cs of a.class.classStudents) {
                const assessment = assessmentMap.get(cs.studentId);
                const status = assessment?.status || 'NOT_STARTED';
                if (status === 'IN_PROGRESS' || status === 'NOT_STARTED') {
                    nextStudents.push({
                        studentId: cs.student.id,
                        firstName: cs.student.firstName,
                        lastName: cs.student.lastName,
                        grade: cs.student.grade,
                        schoolName: a.class.school.name,
                        programName: a.class.program?.name || null,
                        teacherName: a.class.teacher?.name || null,
                        classId: a.class.id,
                        classCode: a.class.classCode,
                        status,
                        assessmentId: assessment?.id || null,
                    });
                }
            }
        }

        // Sort: IN_PROGRESS first, then NOT_STARTED
        nextStudents.sort((a, b) => {
            if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
            if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
            return a.lastName.localeCompare(b.lastName);
        });

        // Recent assessments (completed, last 6)
        const recentAssessments = assessments
            .filter((a) => a.status === 'COMPLETED')
            .slice(0, 6)
            .map((a) => ({
                id: a.id,
                studentName: `${a.student.firstName} ${a.student.lastName}`,
                grade: a.student.grade,
                score: a.score?.opiLevel?.id ?? null,
                completedAt: a.completedAt,
            }));

        return {
            cycle: { id: cycle.id, name: cycle.name },
            stats: { totalStudents, completed, inProgress, notStarted, progressPercent },
            schools,
            nextStudents: nextStudents.slice(0, 10),
            recentAssessments,
        };
    }

    /**
     * Get all student assignments grouped by school (My Assignments page).
     */
    async getAssignments(evaluatorId: number, schoolId?: number) {
        const cycle = await this.cyclesService.checkCycleApproval();

        const whereClause: any = {
            evaluatorId,
            cycleId: cycle.id,
            class: { isIncluded: true },
        };
        if (schoolId) {
            whereClause.class.schoolId = schoolId;
        }

        const assignments = await this.prisma.evaluatorAssignment.findMany({
            where: whereClause,
            include: {
                class: {
                    include: {
                        school: true,
                        program: true,
                        teacher: true,
                        classStudents: {
                            include: { student: true },
                        },
                    },
                },
            },
            orderBy: [
                { class: { school: { name: 'asc' } } },
                { class: { classCode: 'asc' } },
            ],
        });

        // Collect all student IDs
        const allStudentIds: number[] = [];
        for (const a of assignments) {
            for (const cs of a.class.classStudents) {
                if (!allStudentIds.includes(cs.studentId)) {
                    allStudentIds.push(cs.studentId);
                }
            }
        }

        // Get assessments
        const assessments2 = await this.prisma.assessment.findMany({
            where: {
                cycleId: cycle.id,
                studentId: { in: allStudentIds.length > 0 ? allStudentIds : [-1] },
            },
            include: {
                evaluator: { select: { id: true, firstName: true, lastName: true } },
                score: { include: { opiLevel: true } },
            },
        });

        const assessmentMap = new Map(assessments2.map((a) => [a.studentId, a]));

        // Get assessment dates per school
        const schoolIds = [...new Set(assignments.map((a) => a.class.schoolId))];
        const dates = schoolIds.length > 0
            ? await this.prisma.schoolAssessmentDate.findMany({
                where: { cycleId: cycle.id, schoolId: { in: schoolIds } },
                orderBy: { assessmentDate: 'asc' },
            })
            : [];

        const schoolDatesMap = new Map<number, string[]>();
        for (const d of dates) {
            if (!schoolDatesMap.has(d.schoolId)) schoolDatesMap.set(d.schoolId, []);
            const dateStr = d.assessmentDate.toISOString().split('T')[0];
            const arr = schoolDatesMap.get(d.schoolId)!;
            if (!arr.includes(dateStr)) arr.push(dateStr);
        }

        // Group students by school
        const schoolGroups = new Map<number, {
            school: { id: number; name: string; schoolType: string | null };
            assessmentDates: string[];
            studentCount: number;
            progress: number;
            students: any[];
        }>();

        for (const a of assignments) {
            const school = a.class.school;
            if (!schoolGroups.has(school.id)) {
                schoolGroups.set(school.id, {
                    school: { id: school.id, name: school.name, schoolType: school.schoolType },
                    assessmentDates: schoolDatesMap.get(school.id) || [],
                    studentCount: 0,
                    progress: 0,
                    students: [],
                });
            }
            const group = schoolGroups.get(school.id)!;

            for (const cs of a.class.classStudents) {
                const assessment = assessmentMap.get(cs.studentId);
                group.students.push({
                    id: cs.student.id,
                    firstName: cs.student.firstName,
                    lastName: cs.student.lastName,
                    studentNumber: cs.student.studentNumber,
                    grade: cs.student.grade,
                    classCode: a.class.classCode,
                    classId: a.class.id,
                    programName: a.class.program?.name || null,
                    teacherName: a.class.teacher?.name || null,
                    status: assessment?.status || 'NOT_STARTED',
                    score: assessment?.score?.opiLevel?.id ?? null,
                    assessmentId: assessment?.id || null,
                    lastModifiedAt: assessment?.lastModifiedAt || null,
                    lastModifiedBy: assessment?.evaluator
                        ? `${assessment.evaluator.firstName} ${assessment.evaluator.lastName}`
                        : null,
                });
            }
        }

        // Calculate stats per school and overall
        let totalStudents = 0;
        let totalCompleted = 0;
        let totalInProgress = 0;
        let totalAbsent = 0;
        let totalNotStarted = 0;

        for (const group of schoolGroups.values()) {
            group.studentCount = group.students.length;
            let schoolCompleted = 0;
            for (const s of group.students) {
                totalStudents++;
                if (s.status === 'COMPLETED') { totalCompleted++; schoolCompleted++; }
                else if (s.status === 'IN_PROGRESS') totalInProgress++;
                else if (s.status === 'ABSENT') totalAbsent++;
                else totalNotStarted++;
            }
            group.progress = group.studentCount > 0
                ? Math.round((schoolCompleted / group.studentCount) * 100)
                : 0;

            // Sort students by last name
            group.students.sort((a, b) =>
                a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
            );
        }

        // Get available schools for filter dropdown
        const availableSchools = [...schoolGroups.values()].map((g) => g.school);

        return {
            cycle: { id: cycle.id, name: cycle.name },
            stats: {
                totalStudents,
                completed: totalCompleted,
                inProgress: totalInProgress,
                absent: totalAbsent,
                notStarted: totalNotStarted,
            },
            availableSchools,
            schoolGroups: [...schoolGroups.values()],
        };
    }

    /**
     * Get class view data: classes with full details and student lists.
     */
    async getClassView(evaluatorId: number, schoolId?: number, classId?: number) {
        const cycle = await this.cyclesService.checkCycleApproval();

        const whereClause: any = {
            evaluatorId,
            cycleId: cycle.id,
            class: { isIncluded: true },
        };
        if (schoolId) whereClause.class.schoolId = schoolId;
        if (classId) whereClause.classId = classId;

        const assignments = await this.prisma.evaluatorAssignment.findMany({
            where: whereClause,
            include: {
                class: {
                    include: {
                        school: true,
                        program: true,
                        teacher: true,
                        classStudents: {
                            include: { student: true },
                        },
                    },
                },
            },
            orderBy: [
                { class: { school: { name: 'asc' } } },
                { class: { classCode: 'asc' } },
            ],
        });

        // Collect all student IDs
        const allStudentIds: number[] = [];
        for (const a of assignments) {
            for (const cs of a.class.classStudents) {
                if (!allStudentIds.includes(cs.studentId)) allStudentIds.push(cs.studentId);
            }
        }

        const assessments2 = await this.prisma.assessment.findMany({
            where: {
                cycleId: cycle.id,
                studentId: { in: allStudentIds.length > 0 ? allStudentIds : [-1] },
            },
            include: {
                evaluator: { select: { id: true, firstName: true, lastName: true } },
                score: { include: { opiLevel: true } },
            },
        });

        const assessmentMap = new Map(assessments2.map((a) => [a.studentId, a]));

        // Get assessment dates per school
        const schoolIds = [...new Set(assignments.map((a) => a.class.schoolId))];
        const dates = schoolIds.length > 0
            ? await this.prisma.schoolAssessmentDate.findMany({
                where: { cycleId: cycle.id, schoolId: { in: schoolIds } },
                orderBy: { assessmentDate: 'asc' },
            })
            : [];

        const schoolDatesMap = new Map<number, string[]>();
        for (const d of dates) {
            if (!schoolDatesMap.has(d.schoolId)) schoolDatesMap.set(d.schoolId, []);
            const dateStr = d.assessmentDate.toISOString().split('T')[0];
            const arr = schoolDatesMap.get(d.schoolId)!;
            if (!arr.includes(dateStr)) arr.push(dateStr);
        }

        // Get last activity per class
        const classDetails = assignments.map((a) => {
            const cls = a.class;
            const studentIds = cls.classStudents.map((cs) => cs.studentId);

            let completedCount = 0;
            let inProgressCount = 0;
            let absentCount = 0;
            let notStartedCount = 0;
            let lastActivity: Date | null = null;

            const students = cls.classStudents.map((cs) => {
                const assessment = assessmentMap.get(cs.studentId);
                const status = assessment?.status || 'NOT_STARTED';

                if (status === 'COMPLETED') completedCount++;
                else if (status === 'IN_PROGRESS') inProgressCount++;
                else if (status === 'ABSENT') absentCount++;
                else notStartedCount++;

                if (assessment?.lastModifiedAt) {
                    const mod = new Date(assessment.lastModifiedAt);
                    if (!lastActivity || mod > lastActivity) lastActivity = mod;
                }

                return {
                    id: cs.student.id,
                    firstName: cs.student.firstName,
                    lastName: cs.student.lastName,
                    studentNumber: cs.student.studentNumber,
                    status,
                    score: assessment?.score?.opiLevel?.id ?? null,
                    assessmentId: assessment?.id || null,
                    lastModifiedAt: assessment?.lastModifiedAt || null,
                };
            });

            students.sort((a, b) =>
                a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
            );

            const total = studentIds.length;
            const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

            // Determine class status
            let classStatus = 'NOT_STARTED';
            if (completedCount === total && total > 0) classStatus = 'COMPLETED';
            else if (completedCount > 0 || inProgressCount > 0) classStatus = 'IN_PROGRESS';

            return {
                id: cls.id,
                classCode: cls.classCode,
                grade: cls.grade,
                school: { id: cls.school.id, name: cls.school.name },
                program: cls.program ? { id: cls.program.id, name: cls.program.name } : null,
                teacher: cls.teacher?.name || null,
                assessmentDates: schoolDatesMap.get(cls.schoolId) || [],
                totalStudents: total,
                completed: completedCount,
                inProgress: inProgressCount,
                absent: absentCount,
                notStarted: notStartedCount,
                progressPercent,
                classStatus,
                lastActivity,
                students,
            };
        });

        // Available schools and classes for filter dropdowns
        const availableSchools = [...new Map(
            assignments.map((a) => [a.class.school.id, { id: a.class.school.id, name: a.class.school.name }]),
        ).values()];

        const availableClasses = assignments.map((a) => ({
            id: a.class.id,
            classCode: a.class.classCode,
            schoolId: a.class.schoolId,
        }));

        return {
            cycle: { id: cycle.id, name: cycle.name },
            availableSchools,
            availableClasses,
            classes: classDetails,
        };
    }

    /**
     * Get or create class notes for a class.
     */
    async getClassNotes(classId: number, evaluatorId: number) {
        const cycle = await this.cyclesService.checkCycleApproval();

        // Verify assignment
        const assignment = await this.prisma.evaluatorAssignment.findFirst({
            where: { classId, evaluatorId, cycleId: cycle.id },
        });
        if (!assignment) {
            throw new ForbiddenException({ statusCode: 403, message: 'Not assigned to this class', error: 'NOT_ASSIGNED' });
        }

        const note = await this.prisma.classNote.findUnique({
            where: { classId_updatedBy: { classId, updatedBy: evaluatorId } },
        });

        return { note: note?.note || '', updatedAt: note?.updatedAt || null };
    }

    /**
     * Save class notes.
     */
    async saveClassNotes(classId: number, evaluatorId: number, noteText: string) {
        const cycle = await this.cyclesService.checkCycleApproval();

        // Verify assignment
        const assignment = await this.prisma.evaluatorAssignment.findFirst({
            where: { classId, evaluatorId, cycleId: cycle.id },
        });
        if (!assignment) {
            throw new ForbiddenException({ statusCode: 403, message: 'Not assigned to this class', error: 'NOT_ASSIGNED' });
        }

        const note = await this.prisma.classNote.upsert({
            where: { classId_updatedBy: { classId, updatedBy: evaluatorId } },
            update: { note: noteText, updatedAt: new Date() },
            create: { classId, updatedBy: evaluatorId, note: noteText },
        });

        return { note: note.note, updatedAt: note.updatedAt };
    }

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
