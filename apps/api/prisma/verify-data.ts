import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with mssql adapter
const connectionString = `sqlserver://${process.env.DB_HOST}:${process.env.DB_PORT};database=${process.env.DB_NAME};user=${process.env.DB_USER};password=${process.env.DB_PASSWORD};encrypt=${process.env.DB_ENCRYPT};trustServerCertificate=${process.env.DB_TRUST_CERT}`;
const adapter = new PrismaMssql(connectionString);
const prisma = new PrismaClient({ adapter });

async function verifyData() {
    try {
        console.log('🔍 Verifying seeded data...\n');

        // Count all entities
        const [schoolCount, programCount, teacherCount, studentCount, classCount, enrollmentCount, cycleCount] = await Promise.all([
            prisma.school.count(),
            prisma.program.count(),
            prisma.teacher.count(),
            prisma.student.count(),
            prisma.class.count(),
            prisma.classStudent.count(),
            prisma.assessmentCycle.count(),
        ]);

        console.log('📊 Entity Counts:');
        console.log(`  ✅ Assessment Cycles: ${cycleCount}`);
        console.log(`  ✅ Schools: ${schoolCount}`);
        console.log(`  ✅ Programs: ${programCount}`);
        console.log(`  ✅ Teachers: ${teacherCount}`);
        console.log(`  ✅ Students: ${studentCount}`);
        console.log(`  ✅ Classes: ${classCount}`);
        console.log(`  ✅ Enrollments: ${enrollmentCount}\n`);

        // Verify assessment cycle
        const activeCycle = await prisma.assessmentCycle.findFirst({
            where: { isActive: true },
        });
        console.log('🔄 Active Assessment Cycle:');
        console.log(`  Name: ${activeCycle?.name}`);
        console.log(`  Year: ${activeCycle?.year}`);
        console.log(`  Active: ${activeCycle?.isActive}\n`);

        // Sample school with students and classes
        const sampleSchool = await prisma.school.findFirst({
            include: {
                _count: {
                    select: {
                        classes: true,
                        students: true,
                    },
                },
            },
        });
        console.log('🏫 Sample School:');
        console.log(`  Code: ${sampleSchool?.schoolCode}`);
        console.log(`  Name: ${sampleSchool?.name}`);
        console.log(`  Classes: ${sampleSchool?._count.classes}`);
        console.log(`  Students: ${sampleSchool?._count.students}\n`);

        // Sample class with teacher and students
        const sampleClass = await prisma.class.findFirst({
            include: {
                school: true,
                program: true,
                teacher: true,
                _count: {
                    select: {
                        classStudents: true,
                    },
                },
            },
        });
        console.log('📚 Sample Class:');
        console.log(`  Code: ${sampleClass?.classCode}`);
        console.log(`  Course Title: ${sampleClass?.courseTitle}`);
        console.log(`  Grade: ${sampleClass?.grade}`);
        console.log(`  Semester: ${sampleClass?.semesterTerm}`);
        console.log(`  School: ${sampleClass?.school.name}`);
        console.log(`  Program: ${sampleClass?.program?.name || 'N/A'}`);
        console.log(`  Teacher: ${sampleClass?.teacher?.name || 'N/A'}`);
        console.log(`  Enrolled Students: ${sampleClass?._count.classStudents}\n`);

        // Sample student with classes
        const sampleStudent = await prisma.student.findFirst({
            include: {
                cycle: true,
                school: true,
                _count: {
                    select: {
                        classStudents: true,
                    },
                },
            },
        });
        console.log('👤 Sample Student:');
        console.log(`  Number: ${sampleStudent?.studentNumber}`);
        console.log(`  Name: ${sampleStudent?.firstName} ${sampleStudent?.middleName || ''} ${sampleStudent?.lastName}`.trim());
        console.log(`  Grade: ${sampleStudent?.grade}`);
        console.log(`  PEN: ${sampleStudent?.pen || 'N/A'}`);
        console.log(`  School: ${sampleStudent?.school.name}`);
        console.log(`  Enrolled Classes: ${sampleStudent?._count.classStudents}\n`);

        // Check for orphaned records  
        const classesWithoutSchool = await prisma.class.count({
            where: { schoolId: null },
        });
        const studentsWithoutSchool = await prisma.student.count({
            where: { schoolId: null },
        });
        const enrollmentsWithoutClass = await prisma.classStudent.count({
            where: { classId: null },
        });
        const enrollmentsWithoutStudent = await prisma.classStudent.count({
            where: { studentId: null },
        });

        console.log('🔍 Data Integrity Checks:');
        console.log(`  Classes without school: ${classesWithoutSchool}`);
        console.log(`  Students without school: ${studentsWithoutSchool}`);
        console.log(`  Enrollments without class: ${enrollmentsWithoutClass}`);
        console.log(`  Enrollments without student: ${enrollmentsWithoutStudent}\n`);

        if (classesWithoutSchool === 0 && studentsWithoutSchool === 0 &&
            enrollmentsWithoutClass === 0 && enrollmentsWithoutStudent === 0) {
            console.log('✅ All integrity checks passed!\n');
        } else {
            console.log('⚠️  Some integrity issues found!\n');
        }

        // Program distribution
        const programStats = await prisma.program.findMany({
            include: {
                _count: {
                    select: {
                        classes: true,
                    },
                },
            },
        });
        console.log('📋 Program Distribution:');
        programStats.forEach(program => {
            console.log(`  ${program.name}: ${program._count.classes} classes`);
        });
        console.log();

        console.log('✨ Verification complete!\n');

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyData();
