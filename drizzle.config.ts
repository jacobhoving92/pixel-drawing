import type { Config } from 'drizzle-kit';

export default {
  schema: './src/server/schema.ts',
  driver: 'better-sqlite',
  out: './drizzle',
  dbCredentials: {
    url: './sqlite.db',
  },
} satisfies Config;
