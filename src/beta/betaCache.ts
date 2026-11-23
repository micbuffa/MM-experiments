const DB_NAME = 'mm-beta-cache-v1';
const STORE_NAME = 'blobs';

function openCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readCachedArchive(
  key: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const db = await openCacheDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        db.close();
        const result = req.result;
        resolve(result instanceof ArrayBuffer ? new Uint8Array(result) : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function writeCachedArchive(
  key: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<void> {
  const db = await openCacheDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const copy = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      tx.objectStore(STORE_NAME).put(copy, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export function registerBetaServiceWorker(baseUrl: string): void {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    import.meta.env.DEV
  ) {
    return;
  }
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  void navigator.serviceWorker
    .register(`${normalized}sw.js`, { scope: normalized })
    .catch(() => undefined);
}
