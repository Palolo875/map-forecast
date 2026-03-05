import { getUnsyncedNotes } from "./db";

export async function syncPoiNotesOnce(): Promise<{ pending: number }> {
  const notes = await getUnsyncedNotes();

  // Local-first: tant qu'il n'y a pas de backend, on ne "confirme" jamais la sync.
  // Cette fonction est volontairement un point d'extension.
  return { pending: notes.length };
}
