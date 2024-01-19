import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { pixels } from './schema';

export async function Store() {
  const sqlite = new Database('sqlite.db');
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite);

  const hasValueAtIndex = async (coordinateIndex: number) => {
    const value = await db
      .select()
      .from(pixels)
      .where(eq(pixels.coordinate, coordinateIndex));
    return value.length > 0;
  };

  const setValueAtIndex = async (coordinateIndex: number) => {
    const hasValue = await hasValueAtIndex(coordinateIndex);
    if (hasValue) return undefined;
    const { lastInsertRowid } = await db
      .insert(pixels)
      .values({ coordinate: coordinateIndex });
    return lastInsertRowid;
  };

  const getAllValues = async () => {
    const values = await db
      .select({
        coordinateIndex: pixels.coordinate,
      })
      .from(pixels);
    return values.map((v) => v.coordinateIndex);
  };

  const reset = async () => {
    return db.delete(pixels);
  };

  return { hasValueAtIndex, setValueAtIndex, getAllValues, reset };
}
