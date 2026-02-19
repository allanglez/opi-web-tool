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

  const legacyScaleDescriptions = new Set([
    'Novice Low',
    'Novice Mid',
    'Novice High',
    'Intermediate Low',
    'Intermediate Mid',
    'Intermediate High',
    'Advanced Low',
    'Advanced Mid',
    'Advanced High',
    'Superior',
  ]);

  const existingLevelsBefore = await prisma.opiLevel.findMany({
    select: { id: true, description: true },
  });

  const hasLegacySuperiorAt10 = existingLevelsBefore.some(
    (level) => level.id === 10 && level.description === 'Superior',
  );
  const hasLegacyScale = existingLevelsBefore.some(
    (level) => level.id < 10 || legacyScaleDescriptions.has(level.description),
  );

  const opiLevelsData = [
    { id: 10, description: 'OPI Score 10' },
    { id: 11, description: 'OPI Score 11' },
    { id: 12, description: 'OPI Score 12' },
    { id: 13, description: 'OPI Score 13' },
    { id: 14, description: 'OPI Score 14' },
    { id: 15, description: 'OPI Score 15' },
    { id: 16, description: 'OPI Score 16' },
    { id: 17, description: 'OPI Score 17' },
    { id: 18, description: 'OPI Score 18' },
    { id: 19, description: 'OPI Score 19' },
  ];

  const criteriaByScore: Array<{ opiLevelId: number; descriptions: string[] }> = [
    {
      opiLevelId: 10,
      descriptions: [
        'Single word responses only',
        'No evidence of sentence creation',
        'Heavy reliance on memorized phrases',
        'Extremely limited vocabulary',
      ],
    },
    {
      opiLevelId: 11,
      descriptions: [
        'Limited to memorized material',
        'Basic vocabulary for immediate needs',
        'Simple yes/no responses',
        'Frequent pauses and hesitation',
      ],
    },
    {
      opiLevelId: 12,
      descriptions: [
        'Some evidence of sentence creation',
        'Basic present tense usage',
        'Can handle simple questions',
        'Expanding vocabulary',
      ],
    },
    {
      opiLevelId: 13,
      descriptions: [
        'Consistent sentence-level speech',
        'Emerging past/future time reference',
        'Some connected sentences',
        'Improved grammatical control',
      ],
    },
    {
      opiLevelId: 14,
      descriptions: [
        'Sentence-level discourse',
        'Present time frame control',
        'Some connected sentences',
        'Familiar topic handling',
      ],
    },
    {
      opiLevelId: 15,
      descriptions: [
        'Paragraph-length discourse',
        'Narration and description ability',
        'Some time frame control',
        'Comfortable with familiar topics',
      ],
    },
    {
      opiLevelId: 16,
      descriptions: [
        'Extended discourse capability',
        'Complex sentence structures',
        'Multiple time frame usage',
        'Abstract topic discussion',
      ],
    },
    {
      opiLevelId: 17,
      descriptions: [
        'Sustained discourse',
        'Abstract concept discussion',
        'Sophisticated structures',
        'Cultural reference usage',
      ],
    },
    {
      opiLevelId: 18,
      descriptions: [
        'Complex argumentation',
        'Professional topic discussion',
        'Hypothetical situations',
        'Cultural nuance understanding',
      ],
    },
    {
      opiLevelId: 19,
      descriptions: [
        'Native-like proficiency',
        'Professional discourse',
        'Complex abstract topics',
        'Cultural sophistication',
      ],
    },
  ];

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

  if (hasLegacyScale) {
    const legacyScoreIdMap: Array<{ from: number; to: number }> = [
      ...(hasLegacySuperiorAt10 ? [{ from: 10, to: 19 }] : []),
      { from: 9, to: 18 },
      { from: 8, to: 17 },
      { from: 7, to: 16 },
      { from: 6, to: 15 },
      { from: 5, to: 14 },
      { from: 4, to: 13 },
      { from: 3, to: 12 },
      { from: 2, to: 11 },
      { from: 1, to: 10 },
    ];

    for (const scoreMap of legacyScoreIdMap) {
      await prisma.assessmentScore.updateMany({
        where: { opiLevelId: scoreMap.from },
        data: { opiLevelId: scoreMap.to },
      });
    }

    const legacyCriteriaLevelIds = [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      ...(hasLegacySuperiorAt10 ? [10] : []),
    ];

    await prisma.assessmentCriteriaResult.deleteMany({
      where: {
        criteria: {
          opiLevelId: {
            in: legacyCriteriaLevelIds,
          },
        },
      },
    });

    await prisma.assessmentCriteria.deleteMany({
      where: {
        opiLevelId: {
          in: legacyCriteriaLevelIds,
        },
      },
    });

    await prisma.opiLevel.deleteMany({
      where: { id: { lt: 10 } },
    });
  }

  let criteriaCreated = 0;
  let criteriaUpdated = 0;
  for (const criteriaGroup of criteriaByScore) {
    const existingCriteria = await prisma.assessmentCriteria.findMany({
      where: { opiLevelId: criteriaGroup.opiLevelId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        description: true,
        isActive: true,
      },
    });

    const expectedDescriptions = new Set(criteriaGroup.descriptions);
    const seenDescriptions = new Set<string>();

    for (const criteria of existingCriteria) {
      const isExpected = expectedDescriptions.has(criteria.description);
      const isDuplicateExpected = isExpected && seenDescriptions.has(criteria.description);

      if (isExpected && !isDuplicateExpected) {
        seenDescriptions.add(criteria.description);
        if (!criteria.isActive) {
          await prisma.assessmentCriteria.update({
            where: { id: criteria.id },
            data: { isActive: true },
          });
          criteriaUpdated++;
        }
        continue;
      }

      if (criteria.isActive) {
        await prisma.assessmentCriteria.update({
          where: { id: criteria.id },
          data: { isActive: false },
        });
        criteriaUpdated++;
      }
    }

    for (const description of criteriaGroup.descriptions) {
      if (!seenDescriptions.has(description)) {
        await prisma.assessmentCriteria.create({
          data: {
            opiLevelId: criteriaGroup.opiLevelId,
            description,
            isActive: true,
          },
        });
        criteriaCreated++;
      }
    }
  }
  console.log(`✅ Synced assessment criteria (created: ${criteriaCreated}, updated: ${criteriaUpdated})`);

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
