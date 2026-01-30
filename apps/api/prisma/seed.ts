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
