import { createClient } from 'redis';

const KEY = 'canvas';

const client = await createClient()
  .on('error', (err) => console.log('Redis Client Error', err))
  .connect();

const offset = 255 * 255 * 200;
await Promise.all(
  new Array(255 * 255 * 20).fill(0).map((_, idx) => {
    return client.zAdd(KEY, {
      score: offset + idx,
      value: (offset + idx).toString(),
    });
  }),
);

console.log('Done!');

await client.disconnect();
