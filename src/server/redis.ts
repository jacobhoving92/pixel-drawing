import { createClient } from 'redis';

export async function RedisClient(KEY: string) {
  const client = await createClient()
    .on('error', (err) => console.log('Redis Client Error', err))
    .connect();

  const hasValueAtIndex = async (idx: number) => {
    const value = await client.lIndex(KEY, idx);
    return !!value;
  };

  const setValueAtIndex = async (idx: number) => {
    const hasValue = await hasValueAtIndex(idx);
    if (hasValue) return undefined;
    const colorIndex = await client.rPush(KEY, idx.toString());
    return colorIndex;
  };

  const getAllValues = async () => {
    return client.lRange(KEY, 0, -1);
  };

  const reset = async () => {
    return client.del(KEY);
  };

  return { hasValueAtIndex, setValueAtIndex, getAllValues, reset };
}
