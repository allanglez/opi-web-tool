import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

const adapter = new PrismaMssql({
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || 'opi',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
});

const prisma = new PrismaClient({ adapter });

interface CSVRow {
    OPI_TYPE: string;
    SCHOOL_NUMBER: string;
    SCHOOL_NAME: string;
    SCHOOL_YEAR: string;
    STUDENT_NUMBER: string;
    PEN: string;
    STUDENT_LAST_NAME: string;
    STUDENT_FIRST_NAME: string;
    STUDENT_MIDDLE_NAME: string;
    GRADE: string;
    COURSE: string; // This is the CLASS value
    COURSE_TITLE: string;
    TEACHER_ID: string;
    TEACHER_NAME: string;
    SEMESTER_TERM: string;
    PROGRAM_CODE: string;
    PROGRAM_DESCRIPTION: string;
}

async function seedFromCSV() {
    const csvPath = path.join(__dirname, '../../../../docs/OPI_tool_data_feed_with_fake_student_data_20260204.csv');

    console.log('📂 Reading CSV file...');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        quote: '"',              // Handle quoted fields
        escape: '"',             // Handle escaped quotes
        relax_column_count: true, // Allow rows with different column counts
        skip_records_with_error: false, // Don't skip errors, we want to know about them
    }) as CSVRow[];

    console.log(`📊 Found ${records.length} records in CSV`);

    // Get or create the active assessment cycle
    let cycle = await prisma.assessmentCycle.findFirst({
        where: { isActive: true },
    });

    if (!cycle) {
        // Extract year from first record
        const year = parseInt(records[0].SCHOOL_YEAR, 10);
        console.log(`📅 Creating assessment cycle for year ${year}...`);

        cycle = await prisma.assessmentCycle.create({
            data: {
                name: `Assessment Cycle ${year}`,
                year,
                startsOn: new Date(`${year}-01-01`),
                endsOn: new Date(`${year}-12-31`),
                isActive: true,
            },
        });
        console.log(`✅ Created cycle: ${cycle.name}`);
    }

    console.log(`📋 Using cycle: ${cycle.name} (ID: ${cycle.id})`);

    // Track unique values for seeding
    const schools = new Map<string, { schoolCode: string; name: string }>();
    const programs = new Map<string, { code: string; name: string; opiType: string }>();
    const teachers = new Map<string, { teacherId: string; name: string }>();
    const students = new Set<string>();
    const classes = new Map<string, any>();

    // Extract unique data
    console.log('🔍 Extracting unique entities...');
    for (const row of records) {
        // Schools
        if (row.SCHOOL_NUMBER && row.SCHOOL_NAME) {
            schools.set(row.SCHOOL_NUMBER, {
                schoolCode: row.SCHOOL_NUMBER,
                name: row.SCHOOL_NAME,
            });
        }

        // Programs
        if (row.PROGRAM_CODE && row.PROGRAM_DESCRIPTION) {
            programs.set(row.PROGRAM_CODE, {
                code: row.PROGRAM_CODE,
                name: row.PROGRAM_DESCRIPTION,
                opiType: row.OPI_TYPE,
            });
        }

        // Teachers
        if (row.TEACHER_ID && row.TEACHER_NAME) {
            teachers.set(row.TEACHER_ID, {
                teacherId: row.TEACHER_ID,
                name: row.TEACHER_NAME,
            });
        }

        // Classes (unique by school + class code)
        const classKey = `${row.SCHOOL_NUMBER}-${row.COURSE}`;
        if (!classes.has(classKey)) {
            classes.set(classKey, {
                schoolCode: row.SCHOOL_NUMBER,
                classCode: row.COURSE,
                grade: parseInt(row.GRADE, 10),
                courseTitle: row.COURSE_TITLE,
                semesterTerm: (row.SEMESTER_TERM || '').substring(0, 10),
                teacherId: row.TEACHER_ID,
                teacherName: row.TEACHER_NAME,
                programCode: row.PROGRAM_CODE,
            });
        }

        // Students (track for later)
        if (row.STUDENT_NUMBER) {
            students.add(row.STUDENT_NUMBER);
        }
    }

    console.log(`  📍 Schools: ${schools.size}`);
    console.log(`  📚 Programs: ${programs.size}`);
    console.log(`  👨‍🏫 Teachers: ${teachers.size}`);
    console.log(`  🏫 Classes: ${classes.size}`);
    console.log(`  👥 Students: ${students.size}`);

    // Seed schools
    console.log('\\n🏫 Seeding schools...');
    for (const school of schools.values()) {
        await prisma.school.upsert({
            where: { schoolCode: school.schoolCode },
            create: school,
            update: { name: school.name },
        });
    }
    console.log(`✅ Seeded ${schools.size} schools`);

    // Seed programs
    console.log('\\n📚 Seeding programs...');
    for (const program of programs.values()) {
        await prisma.program.upsert({
            where: { code: program.code },
            create: program,
            update: { name: program.name, opiType: program.opiType },
        });
    }
    console.log(`✅ Seeded ${programs.size} programs`);

    // Seed teachers
    console.log('\\n👨‍🏫 Seeding teachers...');
    for (const teacher of teachers.values()) {
        await prisma.teacher.upsert({
            where: { teacherId: teacher.teacherId },
            create: teacher,
            update: { name: teacher.name },
        });
    }
    console.log(`✅ Seeded ${teachers.size} teachers`);

    // Seed students
    console.log('\\n👥 Seeding students...');
    let studentCount = 0;
    for (const row of records) {
        if (!row.STUDENT_NUMBER) continue;

        const school = await prisma.school.findUnique({
            where: { schoolCode: row.SCHOOL_NUMBER },
        });

        if (!school) {
            console.warn(`⚠️  School not found: ${row.SCHOOL_NUMBER}`);
            continue;
        }

        await prisma.student.upsert({
            where: {
                cycleId_studentNumber: {
                    cycleId: cycle.id,
                    studentNumber: row.STUDENT_NUMBER,
                },
            },
            create: {
                cycleId: cycle.id,
                schoolId: school.id,
                studentNumber: row.STUDENT_NUMBER,
                firstName: row.STUDENT_FIRST_NAME,
                middleName: row.STUDENT_MIDDLE_NAME || null,
                lastName: row.STUDENT_LAST_NAME,
                pen: row.PEN || null,
                grade: parseInt(row.GRADE, 10),
            },
            update: {
                firstName: row.STUDENT_FIRST_NAME,
                middleName: row.STUDENT_MIDDLE_NAME || null,
                lastName: row.STUDENT_LAST_NAME,
                pen: row.PEN || null,
                grade: parseInt(row.GRADE, 10),
            },
        });
        studentCount++;
    }
    console.log(`✅ Seeded ${studentCount} students`);

    // Seed classes
    console.log('\\n🏫 Seeding classes...');
    for (const classData of classes.values()) {
        const school = await prisma.school.findUnique({
            where: { schoolCode: classData.schoolCode },
        });

        const program = await prisma.program.findUnique({
            where: { code: classData.programCode },
        });

        const teacher = await prisma.teacher.findUnique({
            where: { teacherId: classData.teacherId },
        });

        if (!school) {
            console.warn(`⚠️  School not found for class: ${classData.schoolCode}`);
            continue;
        }


        // Find existing class
        const existingClass = await prisma.class.findFirst({
            where: {
                cycleId: cycle.id,
                schoolId: school.id,
                classCode: classData.classCode,
            },
        });

        if (existingClass) {
            // Update existing class
            await prisma.class.update({
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
            // Create new class
            await prisma.class.create({
                data: {
                    cycleId: cycle.id,
                    schoolId: school.id,
                    classCode: classData.classCode,
                    grade: classData.grade,
                    courseTitle: classData.courseTitle,
                    semesterTerm: classData.semesterTerm,
                    teacherId: teacher?.id || null,
                    programId: program?.id || null,
                    isIncluded: true,
                },
            });
        }
    }
    console.log(`✅ Seeded ${classes.size} classes`);

    // Seed class-student relationships
    console.log('\\n🔗 Seeding class-student enrollments...');
    let enrollmentCount = 0;
    for (const row of records) {
        if (!row.STUDENT_NUMBER || !row.COURSE) continue;

        const school = await prisma.school.findUnique({
            where: { schoolCode: row.SCHOOL_NUMBER },
        });

        const student = await prisma.student.findUnique({
            where: {
                cycleId_studentNumber: {
                    cycleId: cycle.id,
                    studentNumber: row.STUDENT_NUMBER,
                },
            },
        });

        const classRecord = await prisma.class.findFirst({
            where: {
                cycleId: cycle.id,
                schoolId: school!.id,
                classCode: row.COURSE,
            },
        });

        if (!student || !classRecord) {
            console.warn(`⚠️  Missing student or class for enrollment`);
            continue;
        }

        await prisma.classStudent.upsert({
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
    console.log(`✅ Seeded ${enrollmentCount} class-student enrollments`);

    console.log('\\n✨ CSV seeding completed successfully!');
}

seedFromCSV()
    .then(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
    .catch(async (e) => {
        console.error('❌ Error seeding from CSV:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
