import { createClient } from 'redis';

export async function RedisClient(KEY: string) {
  const client = await createClient()
    .on('error', (err) => console.log('Redis Client Error', err))
    .connect();

  const hasValueAtIndex = async (idx: number) => {
    const value = await client.zRange(KEY, idx, idx);
    return value.length > 0;
  };

  const setValueAtIndex = async (idx: number) => {
    const hasValue = await hasValueAtIndex(idx);
    if (hasValue) return undefined;
    await client.zAdd(KEY, {
      score: idx,
      value: idx.toString(),
    });
    const colorIndex = await client.zCard(KEY);
    return colorIndex;
  };

  const getAllValues = async () => {
    return client.zRange(KEY, 0, -1);
  };

  const reset = async () => {
    return client.del(KEY);
  };

  return { hasValueAtIndex, setValueAtIndex, getAllValues, reset };
}
