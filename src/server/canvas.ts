import { Store } from './store';

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
    reset() {
      store.reset();
    },
  };
}

export type CanvasInstance = Awaited<ReturnType<typeof Canvas>>;
