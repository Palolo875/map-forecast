const DB_NAME = "map-forecast";
const DB_VERSION = 1;
const STORE = "poi_photos";

type StoredPhoto = {
  id: string;
  createdAt: number;
  mimeType: string;
  blob: Blob;
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

export async function savePhoto(file: File): Promise<string> {
  const db = await openDb();
  const id = uid("photo");
  const record: StoredPhoto = {
    id,
    createdAt: Date.now(),
    mimeType: file.type || "image/*",
    blob: file,
  };

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
