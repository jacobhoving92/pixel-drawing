import { Store } from './store';
import fs from 'fs';
export type Coordinate = [number, number];

export async function Canvas() {
  const store = await Store();

  return {
    async getRawData() {
      return store.getAllValues();
    },
    async getCurrentData() {
      return (await store.getAllValues()).map((v) => parseInt(v, 10));
    },
    async getCurrentDataBinary() {
      const values = await store.getAllValues();
      const buf = Buffer.allocUnsafe(values.length * 3);
      for (let i = 0; i < values.length; i++) {
        const v = parseInt(values[i], 10);
        buf[i * 3] = (v >> 16) & 0xff;
        buf[i * 3 + 1] = (v >> 8) & 0xff;
        buf[i * 3 + 2] = v & 0xff;
      }
      return buf;
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
