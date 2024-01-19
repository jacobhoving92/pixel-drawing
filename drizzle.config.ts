import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/server/schema.ts',
  driver: 'better-sqlite',
  out: './drizzle',
  dbCredentials: {
    url: process.env.RENDER === 'true' ? '/var/data/sqlite.db' : './sqlite.db',
  },
} satisfies Config;
