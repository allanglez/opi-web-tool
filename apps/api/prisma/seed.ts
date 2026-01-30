import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const roles = await prisma.role.createMany({
    data: [
      { name: 'ADMIN' },
      { name: 'COORDINATOR' },
      { name: 'EVALUATOR' },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created ${roles.count} roles`);

  const opiLevels = await prisma.opiLevel.createMany({
    data: [
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
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created ${opiLevels.count} OPI levels`);

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
