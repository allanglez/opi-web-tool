import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

config();

const adapter = new PrismaMssql({
  server: 'localhost',
  port: 1433,
  database: 'opi',
  user: 'sa',
  password: 'OpiDev2026!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const roleNames = ['ADMIN', 'COORDINATOR', 'EVALUATOR'];
  let rolesCreated = 0;
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    rolesCreated++;
  }
  console.log(`✅ Upserted ${rolesCreated} roles`);

  const opiLevelsData = [
    { id: 1, description: 'Novice Low' },
    { id: 2, description: 'Novice Mid' },
    { id: 3, description: 'Novice High' },
    { id: 4, description: 'Intermediate Low' },
    { id: 5, description: 'Intermediate Mid' },
    { id: 6, description: 'Intermediate High' },
    { id: 7, description: 'Advanced Low' },
    { id: 8, description: 'Advanced Mid' },
    { id: 9, description: 'Advanced High' },
    { id: 10, description: 'Superior' },
  ];

  let levelsCreated = 0;
  for (const level of opiLevelsData) {
    await prisma.opiLevel.upsert({
      where: { id: level.id },
      update: { description: level.description },
      create: level,
    });
    levelsCreated++;
  }
  console.log(`✅ Upserted ${levelsCreated} OPI levels`);

  // Create test users for development
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const coordinatorRole = await prisma.role.findUnique({ where: { name: 'COORDINATOR' } });
  const evaluatorRole = await prisma.role.findUnique({ where: { name: 'EVALUATOR' } });

  const testUsers = [
    {
      externalAuthId: 'auth0|test-admin',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole!.id,
    },
    {
      externalAuthId: 'auth0|test-coordinator',
      email: 'coordinator@test.com',
      firstName: 'Coordinator',
      lastName: 'User',
      roleId: coordinatorRole!.id,
    },
    {
      externalAuthId: 'auth0|test-evaluator',
      email: 'evaluator@test.com',
      firstName: 'Evaluator',
      lastName: 'User',
      roleId: evaluatorRole!.id,
    },
  ];

  let usersCreated = 0;
  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { externalAuthId: userData.externalAuthId },
      update: {},
      create: {
        externalAuthId: userData.externalAuthId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userData.roleId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: userData.roleId,
      },
    });
    usersCreated++;
  }
  console.log(`✅ Upserted ${usersCreated} test users with roles`);

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
