const DB_NAME = "map-forecast";
const DB_VERSION = 1;
const STORE = "poi_photos";

const MAX_PHOTOS = 200;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

type StoredPhoto = {
  id: string;
  createdAt: number;
  mimeType: string;
  blob: Blob;
};

export type StoredPhotoMeta = {
  id: string;
  createdAt: number;
  mimeType: string;
  size: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function listPhotosMetaInternal(db: IDBDatabase): Promise<StoredPhotoMeta[]> {
  return await new Promise<StoredPhotoMeta[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const records = (req.result as StoredPhoto[] | undefined) ?? [];
      resolve(
        records
          .map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            mimeType: r.mimeType,
            size: r.blob?.size ?? 0,
          }))
          .sort((a, b) => a.createdAt - b.createdAt)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listPhotoMetas(): Promise<StoredPhotoMeta[]> {
  const db = await openDb();
  try {
    return await listPhotosMetaInternal(db);
  } finally {
    db.close();
  }
}

export async function getPhotoUsage(): Promise<{ count: number; totalBytes: number }> {
  const metas = await listPhotoMetas();
  return {
    count: metas.length,
    totalBytes: metas.reduce((acc, m) => acc + (m.size ?? 0), 0),
  };
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
  db.close();
}

async function enforceQuota(db: IDBDatabase, incomingBytes: number) {
  const metas = await listPhotosMetaInternal(db);
  const currentBytes = metas.reduce((acc, m) => acc + m.size, 0);

  if (metas.length + 1 > MAX_PHOTOS) {
    throw new Error("PHOTO_QUOTA_COUNT");
  }

  if (currentBytes + incomingBytes > MAX_TOTAL_BYTES) {
    throw new Error("PHOTO_QUOTA_BYTES");
  }
}

export async function savePhoto(file: File): Promise<string> {
  const db = await openDb();
  const id = uid("photo");
  const record: StoredPhoto = {
    id,
    createdAt: Date.now(),
    mimeType: file.type || "image/*",
    blob: file,
  };

  await enforceQuota(db, file.size ?? 0);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(record);
  });

  db.close();
  return id;
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  const db = await openDb();

  const record = await new Promise<StoredPhoto | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredPhoto | undefined);
    req.onerror = () => reject(req.error);
  });

  db.close();
  return record?.blob ?? null;
}

export async function getPhotoObjectUrl(id: string): Promise<string | null> {
  const blob = await getPhotoBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
