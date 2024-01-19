import type { Config } from 'drizzle-kit';

export default {
  schema: './src/server/schema.ts',
  driver: 'better-sqlite',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DB_URL || './sqlite.db',
  },
} satisfies Config;
