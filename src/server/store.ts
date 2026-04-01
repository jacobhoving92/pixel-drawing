import { createClient } from 'redis';

export async function Store() {
  const client = await createClient({ url: process.env.REDIS_URL || undefined })
    .on('error', (err) => console.log('Redis Client Error', err))
    .connect();

  const DRAW_KEY = 'canvas';
  const EXISTS_KEY = 'pixels';

  // Lua script: atomically check if pixel exists, if not set it and push to draw list.
  // Returns the new list length (= draw count) if drawn, or 0 if already exists.
  const DRAW_SCRIPT = `
    if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then
      return 0
    end
    redis.call('HSET', KEYS[1], ARGV[1], 1)
    return redis.call('RPUSH', KEYS[2], ARGV[1])
  `;

  return {
    async getInitialValues() {
      const data = await client.lRange(DRAW_KEY, 0, 36000);
      return data.map((v) => parseInt(v, 10));
    },

    async setValueAtIndex(coordinateIndex: string) {
      const result = await client.eval(DRAW_SCRIPT, {
        keys: [EXISTS_KEY, DRAW_KEY],
        arguments: [coordinateIndex],
      });
      return (result as number) || undefined;
    },

    async setValuesAtIndices(coordinateIndices: string[]) {
      const pipeline = client.multi();
      for (const idx of coordinateIndices) {
        pipeline.eval(DRAW_SCRIPT, {
          keys: [EXISTS_KEY, DRAW_KEY],
          arguments: [idx],
        });
      }
      const results = await pipeline.execAsPipeline();
      // Each result is the new list length if drawn, or 0 if already exists
      return results.map((r, i) => ({
        coordinateIndex: coordinateIndices[i],
        pixelsDrawnCount: (r as number) || undefined,
      }));
    },

    async removeValueAtIndex(coordinateIndex: string) {
      await client.hDel(EXISTS_KEY, coordinateIndex);
      return client.lRem(DRAW_KEY, -1, coordinateIndex);
    },

    async getAllValues() {
      return client.lRange(DRAW_KEY, 0, -1);
    },

    async setValues(_values: string[]) {
      return true;
    },

    async reset() {
      return Promise.all([client.del(DRAW_KEY), client.del(EXISTS_KEY)]);
    },
  };
}
