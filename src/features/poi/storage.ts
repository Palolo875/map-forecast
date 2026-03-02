import type { PoiNote, PoiUserState, PoiVisit, IdealWeather } from "./types";

const STORAGE_KEY = "map-forecast.poi.user.v1";

const emptyState = (): PoiUserState => ({
  overlaysByPoiId: {},
  notesByPoiId: {},
  visitsByPoiId: {},
});

export function loadPoiUserState(): PoiUserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PoiUserState;
    return {
      overlaysByPoiId: parsed.overlaysByPoiId ?? {},
      notesByPoiId: parsed.notesByPoiId ?? {},
      visitsByPoiId: parsed.visitsByPoiId ?? {},
    };
  } catch {
    return emptyState();
  }
}

export function savePoiUserState(state: PoiUserState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function toggleFavorite(poiId: string): PoiUserState {
  const state = loadPoiUserState();
  const prev = state.overlaysByPoiId[poiId] ?? { poiId };
  const next = { ...prev, isFavorite: !prev.isFavorite };
  const nextState = {
    ...state,
    overlaysByPoiId: { ...state.overlaysByPoiId, [poiId]: next },
  };
  savePoiUserState(nextState);
  return nextState;
}

export function addPoiVisitWithSnapshot(poiId: string, snapshot: PoiVisit["weatherSnapshot"]): PoiUserState {
  return addPoiVisit(poiId, snapshot);
}

export function addPoiNoteWithPhotos(poiId: string, text: string, photoIds: string[]): PoiUserState {
  return addPoiNote(poiId, text, photoIds);
}

export function upsertIdealWeather(poiId: string, idealWeather: IdealWeather): PoiUserState {
  const state = loadPoiUserState();
  const prev = state.overlaysByPoiId[poiId] ?? { poiId };
  const next = { ...prev, idealWeather };
  const nextState = {
    ...state,
    overlaysByPoiId: { ...state.overlaysByPoiId, [poiId]: next },
  };
  savePoiUserState(nextState);
  return nextState;
}

export function addPoiNote(poiId: string, text: string, photoIds?: string[]): PoiUserState {
  const state = loadPoiUserState();
  const note: PoiNote = {
    id: uid("note"),
    poiId,
    createdAt: Date.now(),
    text,
    photoIds,
  };

  const nextNotes = [note, ...(state.notesByPoiId[poiId] ?? [])];
  const nextState: PoiUserState = {
    ...state,
    notesByPoiId: { ...state.notesByPoiId, [poiId]: nextNotes },
  };
  savePoiUserState(nextState);
  return nextState;
}

export function addPoiVisit(poiId: string, snapshot?: PoiVisit["weatherSnapshot"]): PoiUserState {
  const state = loadPoiUserState();
  const visit: PoiVisit = {
    id: uid("visit"),
    poiId,
    visitedAt: Date.now(),
    weatherSnapshot: snapshot,
  };

  const nextVisits = [visit, ...(state.visitsByPoiId[poiId] ?? [])];
  const nextState: PoiUserState = {
    ...state,
    visitsByPoiId: { ...state.visitsByPoiId, [poiId]: nextVisits },
  };
  savePoiUserState(nextState);
  return nextState;
}
