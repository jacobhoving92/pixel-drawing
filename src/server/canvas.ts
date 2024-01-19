import { RedisClient } from './redis';

export type Coordinate = [number, number];

export async function Canvas() {
  const client = await RedisClient('canvas');

  return {
    async getRawData() {
      const values = await client.getAllValues();
      return values;
    },
    async getCurrentData() {
      const values = await client.getAllValues();
      return values.map((v) => parseInt(v, 10));
    },
    draw(coordinateIndex: number) {
      return client.setValueAtIndex(coordinateIndex);
    },
    reset() {
      client.reset();
    },
  };
}

export type CanvasInstance = Awaited<ReturnType<typeof Canvas>>;
