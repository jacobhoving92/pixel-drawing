import { Store } from './store';
import fs from 'fs';
export type Coordinate = [number, number];

export async function Canvas() {
  const store = await Store();

  return {
    async getRawData() {
      return store.getAllValues();
    },
    streamRawData() {
      return store.streamValues();
    },
    async getCurrentData() {
      return (await store.getAllValues()).map((v) => parseInt(v, 10));
    },
    async getInitialData() {
      return store.getInitialValues();
    },
    draw(coordinateIndex: string) {
      return store.setValueAtIndex(coordinateIndex);
    },
    drawBatch(coordinateIndices: string[]) {
      return store.setValuesAtIndices(coordinateIndices);
    },
    erase(coordinateIndex: string) {
      return store.removeValueAtIndex(coordinateIndex);
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
