import { createClient } from 'redis';

export async function Store() {
  const KEY = 'canvas';

  const client = await createClient({ url: process.env.REDIS_URL || undefined })
    .on('error', (err) => console.log('Redis Client Error', err))
    .connect();

  const hasValueAtIndex = async (coordinateIndex: number) => {
    const value = await client.lIndex(KEY, coordinateIndex);
    return !!value;
  };

  const setValueAtIndex = async (coordinateIndex: number) => {
    const hasValue = await hasValueAtIndex(coordinateIndex);
    if (hasValue) return undefined;
    const colorIndex = await client.rPush(KEY, coordinateIndex.toString());
    return colorIndex;
  };

  const getAllValues = async () => {
    return client.lRange(KEY, 0, -1);
  };

  const reset = async () => {
    return client.del(KEY);
  };

  const setValues = async (values: string[]) => {
    try {
      await reset();
      await Promise.all(
        values.map((v) => {
          return client.rPush(KEY, v.toString());
        }),
      );
      return true;
    } catch (e) {
      return false;
    }
  };

  return { hasValueAtIndex, setValueAtIndex, getAllValues, setValues, reset };
}
