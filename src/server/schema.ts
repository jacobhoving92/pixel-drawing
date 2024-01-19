import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const pixels = sqliteTable('canvas', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  coordinate: integer('coordinate', { mode: 'number' }),
});
