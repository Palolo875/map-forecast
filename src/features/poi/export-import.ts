import { getDB } from "./db";
import type { PoiNote, PoiVisit, PoiUserOverlay } from "./types";

import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";

export interface ExportData {
  version: number;
  exportedAt: number;
  notes: Array<Omit<PoiNote, "photoBlob"> & { photoPath?: string }>;
  visits: PoiVisit[];
  overlays: PoiUserOverlay[];
}

export async function exportUserData(): Promise<string> {
  const db = await getDB();
  const notes = await db.getAll("notes");
  const visits = await db.getAll("visits");
  const overlays = await db.getAll("overlays");

  const data: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    notes: notes.map((n) => ({
      id: n.id,
      poiId: n.poiId,
      createdAt: n.createdAt,
      text: n.text,
      weatherSnapshot: n.weatherSnapshot,
      synced: n.synced,
      syncedFlag: n.syncedFlag,
      photoPath: n.photoBlob ? `photos/${n.id}.bin` : undefined,
    })),
    visits,
    overlays,
  };

  return JSON.stringify(data, null, 2);
}

export async function exportUserDataZip(): Promise<Blob> {
  const db = await getDB();
  const notes = await db.getAll("notes");
  const visits = await db.getAll("visits");
  const overlays = await db.getAll("overlays");

  const manifest: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    notes: notes.map((n) => ({
      id: n.id,
      poiId: n.poiId,
      createdAt: n.createdAt,
      text: n.text,
      weatherSnapshot: n.weatherSnapshot,
      synced: n.synced,
      syncedFlag: n.syncedFlag,
      photoPath: n.photoBlob ? `photos/${n.id}.bin` : undefined,
    })),
    visits,
    overlays,
  };

  const files: Record<string, Uint8Array> = {
    "export.json": strToU8(JSON.stringify(manifest, null, 2)),
  };

  for (const n of notes) {
    if (!n.photoBlob) continue;
    const buf = new Uint8Array(await n.photoBlob.arrayBuffer());
    files[`photos/${n.id}.bin`] = buf;
  }

  const zipped = zipSync(files, { level: 6 });
  const zippedCopy = new Uint8Array(zipped);
  return new Blob([zippedCopy], { type: "application/zip" });
}

export async function importUserData(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const data: ExportData = JSON.parse(jsonString);
    if (!data.version || !Array.isArray(data.notes)) {
      throw new Error("Format d'export invalide");
    }

    const db = await getDB();
    let count = 0;

    // Import notes
    for (const note of data.notes) {
      const fullNote: PoiNote = {
        id: note.id,
        poiId: note.poiId,
        createdAt: note.createdAt,
        text: note.text,
        photoBlob: undefined,
        weatherSnapshot: note.weatherSnapshot,
        synced: note.synced,
        syncedFlag: note.syncedFlag ?? (note.synced ? 1 : 0),
      };
      await db.put("notes", fullNote);
      count++;
    }

    // Import visits
    for (const visit of data.visits) {
      await db.put("visits", visit);
      count++;
    }

    // Import overlays
    for (const overlay of data.overlays) {
      await db.put("overlays", overlay);
      count++;
    }

    return { success: true, count };
  } catch (e) {
    return { success: false, count: 0, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function importUserDataZip(zipFile: File): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const zipBytes = new Uint8Array(await zipFile.arrayBuffer());
    const files = unzipSync(zipBytes);

    const manifestBytes = files["export.json"];
    if (!manifestBytes) throw new Error("Archive invalide: export.json manquant");

    const manifest = JSON.parse(strFromU8(manifestBytes)) as ExportData;
    if (manifest.version !== 1) throw new Error("Version d'export non supportée");
    if (!Array.isArray(manifest.notes) || !Array.isArray(manifest.visits) || !Array.isArray(manifest.overlays)) {
      throw new Error("Archive invalide: structure incorrecte");
    }

    const db = await getDB();
    let count = 0;

    for (const note of manifest.notes) {
      const photoPath = note.photoPath;
      const photoBytes = photoPath ? files[photoPath] : undefined;
      const photoBlob = photoBytes
        ? new Blob([new Uint8Array(photoBytes)])
        : undefined;

      const fullNote: PoiNote = {
        id: note.id,
        poiId: note.poiId,
        createdAt: note.createdAt,
        text: note.text,
        photoBlob,
        weatherSnapshot: note.weatherSnapshot,
        synced: note.synced,
        syncedFlag: note.synced ? 1 : 0,
      };

      await db.put("notes", fullNote);
      count++;
    }

    for (const v of manifest.visits) {
      await db.put("visits", v);
      count++;
    }

    for (const o of manifest.overlays) {
      await db.put("overlays", o);
      count++;
    }

    return { success: true, count };
  } catch (e) {
    return { success: false, count: 0, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
