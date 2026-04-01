import { Store } from './store';
import fs from 'fs';
export type Coordinate = [number, number];

function addSecondsToNow(seconds: number) {
  const now = new Date();
  now.setSeconds(new Date().getSeconds() + seconds);
  return now.getTime();
}

function ISR<T>(
  fetcher: () => Promise<T[]>,
  timeout = 30,
  disableInactivityTimer?: boolean,
) {
  let cache: T[] = [];
  let expiresAt = new Date().getTime();
  let outdated = true;
  let outdatedTimer: NodeJS.Timeout;
  let currentPromise: Promise<T[]> | undefined;

  const isExpired = () => {
    return new Date().getTime() > expiresAt;
  };

  const updateCache = async () => {
    currentPromise = fetcher();
    cache = await currentPromise;
    expiresAt = addSecondsToNow(timeout);
    currentPromise = undefined;
    outdated = false;
  };

  const get = async () => {
    if (currentPromise) {
      await currentPromise;
    } else if (outdated && isExpired()) {
      await updateCache();
    }
    return cache;
  };

  const expire = () => {
    outdated = true;
    if (!disableInactivityTimer) {
      clearTimeout(outdatedTimer);
      outdatedTimer = setTimeout(() => {
        if (!currentPromise) {
          console.log('Nobody around, refresh cache for next visitor');
          updateCache();
        }
      }, 30 * 1000);
    }
  };

  return {
    get,
    expire,
  };
}

export async function Canvas() {
  const store = await Store();

  const getCurrent = ISR(async () =>
    (await store.getAllValues()).map((v) => parseInt(v, 10)),
  );
  const getInitial = ISR(store.getInitialValues, 60 * 60 * 6, true);

  return {
    async getRawData() {
      return store.getAllValues();
    },
    getCurrentData() {
      return getCurrent.get();
    },
    getInitialData() {
      return getInitial.get();
    },
    draw(coordinateIndex: string) {
      getCurrent.expire();
      return store.setValueAtIndex(coordinateIndex);
    },
    erase(coordinateIndex: string) {
      getCurrent.expire();
      return store.removeValueAtIndex(coordinateIndex);
    },
    async setFromFile(file: { path: string }) {
      try {
        const data = fs.readFileSync(file.path);
        const json = JSON.parse(data.toString());
        const success = await store.setValues(json);
        if (success) {
          getCurrent.expire();
          getInitial.expire();
        }
        return success;
      } catch {
        return false;
      }
    },
    reset() {
      store.reset();
      getCurrent.expire();
      getInitial.expire();
    },
  };
}

export type CanvasInstance = Awaited<ReturnType<typeof Canvas>>;
