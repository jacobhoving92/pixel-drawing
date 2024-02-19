import { createClient } from 'redis';
import range from 'lodash/range';
import flatten from 'lodash/flatten';
import chunk from 'lodash/chunk';

export async function Store() {
  const KEY = 'canvas';
  const HKEY = 'pixels';

  let client: ReturnType<typeof createClient>;
  const init = async () => {
    client = await createClient({ url: process.env.REDIS_URL || undefined })
      .on('error', (err) => {
        console.log(`Redis Client Error, retrying…`, err);
      })
      .connect();
  };

  const hasValueAtIndex = async (coordinateIndex: string) => {
    if (!client) return true;
    return await client.hExists(HKEY, coordinateIndex);
  };

  const setValueAtIndex = async (coordinateIndex: string) => {
    const hasValue = await hasValueAtIndex(coordinateIndex);
    if (hasValue) return undefined;
    await client?.hSet(HKEY, coordinateIndex, 1);
    return await client?.rPush(KEY, coordinateIndex);
  };

  const removeValueAtIndex = async (coordinateIndex: string) => {
    return await client.lRem(KEY, -1, coordinateIndex);
  };

  const getAllValues = async () => {
    if (!client) return [];
    const length = await client.lLen(KEY);
    const maxSize = 50000;
    const chunkSize = Math.max(1, Math.ceil(length / maxSize));
    const data = await Promise.all(
      range(chunkSize + 1).map((i) =>
        client?.lRange(KEY, i * maxSize, maxSize * (i + 1) - 1),
      ),
    );

    return flatten(data);
  };

  const reset = async () => {
    return Promise.all([client?.del(KEY), client?.del(HKEY)]);
  };

  const setValues = async (values: string[]) => {
    try {
      await reset();
      const chunked = chunk(values, 512);
      await Promise.all(
        chunked.map((chunk) => {
          return client?.rPush(KEY, chunk);
        }),
      );

      await Promise.all(
        chunked.map((chunk) => {
          return client?.hSet(HKEY, flatten(chunk.map((k) => [k, 1])));
        }),
      );
      return true;
    } catch (e) {
      return false;
    }
  };

  init();

  return {
    hasValueAtIndex,
    setValueAtIndex,
    removeValueAtIndex,
    getAllValues,
    setValues,
    reset,
  };
}
