import { Store } from './store';
import fs from 'fs';
export type Coordinate = [number, number];

export async function Canvas() {
  const store = await Store();

  return {
    async getRawData() {
      const values = await store.getAllValues();
      return values;
    },
    async getCurrentData() {
      const values = await store.getAllValues();
      return values.map((v) => parseInt(v, 10));
    },
    draw(coordinateIndex: number) {
      return store.setValueAtIndex(coordinateIndex);
    },
    async setFromFile(file: { path: string }) {
      try {
        const data = fs.readFileSync(file.path);
        const json = JSON.parse(data.toString());
        return store.setValues(json);
      } catch {
        return false;
      }
    },
    reset() {
      store.reset();
    },
  };
}

export type CanvasInstance = Awaited<ReturnType<typeof Canvas>>;
