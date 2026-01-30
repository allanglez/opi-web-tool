import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaMssql } = await import('@prisma/adapter-mssql');
      const connectionString = process.env.DATABASE_URL!;
      return new PrismaMssql({ connectionString });
    },
  },
});
