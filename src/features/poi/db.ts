import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Poi, PoiNote, PoiVisit, PoiUserOverlay } from './types';

export interface NaveoMapDB extends DBSchema {
  pois: {
    key: string;
    value: Poi;
    indexes: { 'by-type': string };
  };
  notes: {
    key: string;
    value: PoiNote;
    indexes: { 'by-poi': string; 'by-date': number; 'unsynced': number };
  };
  visits: {
    key: string;
    value: PoiVisit;
    indexes: { 'by-poi': string; 'by-date': number };
  };
  overlays: {
    key: string;
    value: PoiUserOverlay;
  };
}

const DB_NAME = 'naveomap-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<NaveoMapDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NaveoMapDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        // POI store
        if (!db.objectStoreNames.contains('pois')) {
          const poiStore = db.createObjectStore('pois', { keyPath: 'id' });
          poiStore.createIndex('by-type', 'type');
        }

        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('by-poi', 'poiId');
          noteStore.createIndex('by-date', 'createdAt');
          noteStore.createIndex('unsynced', 'syncedFlag');
        } else if (oldVersion < 2) {
          const noteStore = transaction.objectStore('notes');
          if (!noteStore.indexNames.contains('unsynced')) {
            noteStore.createIndex('unsynced', 'syncedFlag');
          }

          // Backfill syncedFlag for existing notes
          let cursor = await noteStore.openCursor();
          while (cursor) {
            const value = cursor.value as PoiNote & { syncedFlag?: 0 | 1 };
            const next = {
              ...value,
              syncedFlag: (value.synced ? 1 : 0) as 0 | 1,
            };
            await cursor.update(next);
            cursor = await cursor.continue();
          }
        }

        // Visits store
        if (!db.objectStoreNames.contains('visits')) {
          const visitStore = db.createObjectStore('visits', { keyPath: 'id' });
          visitStore.createIndex('by-poi', 'poiId');
          visitStore.createIndex('by-date', 'visitedAt');
        }

        // Overlays store (favorites, ideal weather)
        if (!db.objectStoreNames.contains('overlays')) {
          db.createObjectStore('overlays', { keyPath: 'poiId' });
        }
      },
    });
  }
  return dbPromise;
}

// Helper methods
export async function savePoi(poi: Poi) {
  const db = await getDB();
  return db.put('pois', poi);
}

export async function getPoi(id: string) {
  const db = await getDB();
  return db.get('pois', id);
}

export async function getAllPois() {
  const db = await getDB();
  return db.getAll('pois');
}

export async function saveNote(note: PoiNote) {
  const db = await getDB();
  return db.put('notes', { ...note, syncedFlag: note.synced ? 1 : 0 });
}

export async function getNotesForPoi(poiId: string) {
  const db = await getDB();
  return db.getAllFromIndex('notes', 'by-poi', poiId);
}

export async function getUnsyncedNotes() {
  const db = await getDB();
  return db.getAllFromIndex('notes', 'unsynced', 0);
}

export async function markNoteSynced(noteId: string) {
  const db = await getDB();
  const note = await db.get('notes', noteId);
  if (!note) return;
  await db.put('notes', { ...note, synced: true, syncedFlag: 1 });
}

export async function saveOverlay(overlay: PoiUserOverlay) {
  const db = await getDB();
  return db.put('overlays', overlay);
}

export async function getOverlay(poiId: string) {
  const db = await getDB();
  return db.get('overlays', poiId);
}

export async function getAllOverlays() {
  const db = await getDB();
  return db.getAll('overlays');
}

export async function saveVisit(visit: PoiVisit) {
  const db = await getDB();
  return db.put('visits', visit);
}

export async function getVisitsForPoi(poiId: string) {
  const db = await getDB();
  return db.getAllFromIndex('visits', 'by-poi', poiId);
}

export async function getAllVisits() {
  const db = await getDB();
  return db.getAll('visits');
}
