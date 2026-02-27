const { PrismaMssql } = require('@prisma/adapter-mssql');
const { PrismaClient } = require('@prisma/client');

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
  console.log('Checking if status_changed_at column exists...');
  
  try {
    await prisma.$queryRaw`SELECT TOP 1 status_changed_at FROM users`;
    console.log('✅ Column status_changed_at already exists!');
  } catch (error) {
    if (error.message && error.message.includes('status_changed_at')) {
      console.log('Column does not exist. Adding it now...');
      
      try {
        await prisma.$executeRaw`ALTER TABLE [dbo].[users] ADD [status_changed_at] DATETIME2`;
        console.log('✅ Successfully added status_changed_at column!');
      } catch (addError) {
        console.error('❌ Failed to add column:', addError.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Unexpected error:', error.message);
      process.exit(1);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
