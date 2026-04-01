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
      // Delta-encode: first value is absolute, rest are signed deltas.
      // Each value is 3 bytes. Deltas are stored as signed + offset (add 8388608)
      // so they fit in unsigned 0..16777215 range.
      const OFFSET = 8388608; // 2^23
      const buf = Buffer.allocUnsafe(values.length * 3);
      let prev = 0;
      for (let i = 0; i < values.length; i++) {
        const v = parseInt(values[i], 10);
        const encoded = i === 0 ? v : (v - prev) + OFFSET;
        buf[i * 3] = (encoded >> 16) & 0xff;
        buf[i * 3 + 1] = (encoded >> 8) & 0xff;
        buf[i * 3 + 2] = encoded & 0xff;
        prev = v;
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
