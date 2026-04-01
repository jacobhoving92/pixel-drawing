import { createClient } from 'redis';
import range from 'lodash/range';
import flatten from 'lodash/flatten';
import chunk from 'lodash/chunk';
import { sum } from 'lodash';

async function keyManager(client: ReturnType<typeof createClient>) {
  const KEY_TRACKER = 'keys';
  let amountOfKeys = await client.lLen(KEY_TRACKER);

  const getKeys = () => range(amountOfKeys);
  const existsKey = (n: number) => (n === 0 ? `pixels` : `pixels-${n}`);
  const drawKey = (n: number) => (n === 0 ? `canvas` : `canvas-${n}`);

  const getLength = async () => {
    const lengths = await Promise.all(
      getKeys().map(async (n) => await client.lLen(drawKey(n))),
    );
    return sum(lengths);
  };

  let length = await getLength();
  const next = async () => {
    amountOfKeys = await client.rPush(KEY_TRACKER, '1');
    length = await getLength();
    return amountOfKeys;
  };

  if (amountOfKeys === 0) await next();

  console.log('amount', amountOfKeys, getKeys(), length);

  return {
    length: () => {
      return length;
    },
    currentIndex: () => {
      return amountOfKeys - 1;
    },
    next,
    reset: () => {
      return client.del(KEY_TRACKER);
    },
    getKeys,
    existsKey,
    drawKey,
  };
}

export async function Store() {
  let client: ReturnType<typeof createClient>;
  let keys: Awaited<ReturnType<typeof keyManager>>;

  const init = async () => {
    client = await createClient({ url: process.env.REDIS_URL || undefined })
      .on('error', (err) => {
        console.log(`Redis Client Error, retrying…`, err);
      })
      .connect();

    keys = await keyManager(client);
  };

  const hasValueAtIndex = async (coordinateIndex: string) => {
    if (!client) return true;
    return (
      await Promise.all(
        keys
          .getKeys()
          .map(
            async (n) =>
              await client.hExists(keys.existsKey(n), coordinateIndex),
          ),
      )
    ).some((v) => v);
  };

  const writeToRedis = async (coordinateIndex: string): Promise<number> => {
    try {
      await client?.hSet(
        keys.existsKey(keys.currentIndex()),
        coordinateIndex,
        1,
      );
      return (
        keys.length() +
        (await client?.rPush(
          keys.drawKey(keys.currentIndex()),
          coordinateIndex,
        ))
      );
    } catch {
      await keys.next();
      return writeToRedis(coordinateIndex);
    }
  };

  const setValueAtIndex = async (coordinateIndex: string) => {
    const hasValue = await hasValueAtIndex(coordinateIndex);
    if (hasValue) return undefined;
    return writeToRedis(coordinateIndex);
  };

  const removeValueAtIndex = async (coordinateIndex: string) => {
    return await Promise.all(
      keys
        .getKeys()
        .map((n) => client.lRem(keys.drawKey(n), -1, coordinateIndex)),
    );
  };

  const getInitialValues = async () => {
    if (!client) return [];
    const data = await client?.lRange(keys.drawKey(0), 0, 36000);
    return data.map((v) => parseInt(v, 10));
  };

  const getAllValues = async () => {
    if (!client) return [];
    const data = await Promise.all(
      keys.getKeys().map((n) => getValuesForKeyIndex(n)),
    );
    return flatten(data);
  };

  const getValuesForKeyIndex = async (n: number) => {
    if (!client) return [];
    const key = keys.drawKey(n);
    const length = await client.lLen(key);
    const maxSize = 50000;
    const chunkSize = Math.max(1, Math.ceil(length / maxSize));
    const data = await Promise.all([
      ...range(chunkSize + 1).map((i) =>
        client?.lRange(key, i * maxSize, maxSize * (i + 1) - 1),
      ),
    ]);

    return flatten(data);
  };

  const reset = async () => {
    return Promise.all([
      ...keys.getKeys().map((n) => client.del(keys.drawKey(n))),
      ...keys.getKeys().map((n) => client.del(keys.existsKey(n))),
    ]);
  };

  const setValues = async (values: string[]) => {
    try {
      // await reset();
      // const chunked = chunk(values, 512);
      // await Promise.all(
      //   chunked.map((chunk) => {
      //     return client?.rPush(KEY, chunk);
      //   }),
      // );

      // await Promise.all(
      //   chunked.map((chunk) => {
      //     return client?.hSet(HKEY, flatten(chunk.map((k) => [k, 1])));
      //   }),
      // );
      return true;
    } catch (e) {
      return false;
    }
  };

  await init();

  return {
    getInitialValues,
    hasValueAtIndex,
    setValueAtIndex,
    removeValueAtIndex,
    getAllValues,
    setValues,
    reset,
  };
}
