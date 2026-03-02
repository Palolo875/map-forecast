import { useEffect, useMemo, useState } from "react";
import type { Poi, IdealWeather, PoiNote, PoiVisit } from "@/features/poi/types";
import {
  addPoiNote,
  addPoiNoteWithPhotos,
  addPoiVisit,
  deletePoiNote,
  deletePoiVisit,
  loadPoiUserState,
  toggleFavorite,
  upsertIdealWeather,
} from "@/features/poi/storage";
import { deletePhoto, getPhotoObjectUrl, savePhoto } from "@/features/poi/photos";
import { fetchCurrentWeatherSnapshot } from "@/features/poi/weather";
import type { CurrentWeatherSnapshot } from "@/features/poi/weather";
import { computeIdealMatchScore } from "@/features/poi/ideal-score";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { HugeiconsIcon, Tick02Icon } from "@/components/icons";

function labelPoiType(type: Poi["type"]) {
  switch (type) {
    case "refuge":
      return "Refuge";
    case "emergency_shelter":
      return "Abri";
    case "weather_station":
      return "Station météo";
    case "spot":
      return "Spot";
  }
}

function PoiTypeBadge({ type }: { type: Poi["type"] }) {
  const variant = type === "weather_station" ? "secondary" : "outline";
  return <Badge variant={variant}>{labelPoiType(type)}</Badge>;
}

type POIInspectorProps = {
  poi: Poi;
  onRequestWeatherAt?: (lat: number, lng: number, name: string) => void;
};

export default function POIInspector({ poi, onRequestWeatherAt }: POIInspectorProps) {
  const [state, setState] = useState(() => loadPoiUserState());
  const overlay = state.overlaysByPoiId[poi.id];

  const notes: PoiNote[] = state.notesByPoiId[poi.id] ?? [];
  const visits: PoiVisit[] = state.visitsByPoiId[poi.id] ?? [];

  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [notePreviews, setNotePreviews] = useState<string[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherSnapshot | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  const ideal = overlay?.idealWeather;
  const idealMatch = useMemo(() => computeIdealMatchScore(ideal, currentWeather), [ideal, currentWeather]);

  useEffect(() => {
    setState(loadPoiUserState());
  }, [poi.id]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isOnline) {
      setLoadingCurrent(false);
      setCurrentWeather(null);
      return () => {
        cancelled = true;
      };
    }

    setLoadingCurrent(true);
    fetchCurrentWeatherSnapshot(poi.position.lat, poi.position.lng)
      .then((snap) => {
        if (!cancelled) setCurrentWeather(snap);
      })
      .catch(() => {
        if (!cancelled) setCurrentWeather(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCurrent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [poi.position.lat, poi.position.lng, isOnline]);

  useEffect(() => {
    const urls = noteFiles.map((f) => URL.createObjectURL(f));
    setNotePreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [noteFiles]);

  const headerSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (poi.meta && typeof poi.meta === "object") {
      const altitude = (poi.meta as any).altitudeM;
      if (typeof altitude === "number") parts.push(`${altitude} m`);
    }
    parts.push(`${poi.position.lat.toFixed(4)}, ${poi.position.lng.toFixed(4)}`);
    return parts.join(" · ");
  }, [poi.meta, poi.position.lat, poi.position.lng]);

  const onToggleFavorite = () => {
    const next = toggleFavorite(poi.id);
    setState(next);
  };

  const onSaveIdeal = (nextIdeal: IdealWeather) => {
    const next = upsertIdealWeather(poi.id, nextIdeal);
    setState(next);
  };

  const onAddNote = async () => {
    const text = noteText.trim();
    if (!text && noteFiles.length === 0) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      if (noteFiles.length === 0) {
        const next = addPoiNote(poi.id, text);
        setState(next);
      } else {
        const photoIds: string[] = [];
        for (const f of noteFiles) {
          // eslint-disable-next-line no-await-in-loop
          const id = await savePhoto(f);
          photoIds.push(id);
        }
        const next = addPoiNoteWithPhotos(poi.id, text, photoIds);
        setState(next);
      }

      setNoteText("");
      setNoteFiles([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "PHOTO_QUOTA_COUNT") {
        setNoteError("Quota photos atteint. Supprime quelques photos dans tes notes.");
      } else if (msg === "PHOTO_QUOTA_BYTES") {
        setNoteError("Stockage photo presque plein. Supprime quelques photos pour libérer de l'espace.");
      } else {
        setNoteError("Impossible d'enregistrer la note.");
      }
    } finally {
      setSavingNote(false);
    }
  };

  const onDeleteNote = async (noteId: string) => {
    const { nextState, deletedPhotoIds } = deletePoiNote(poi.id, noteId);
    setState(nextState);
    for (const pid of deletedPhotoIds) {
      // eslint-disable-next-line no-await-in-loop
      await deletePhoto(pid);
    }
  };

  const onDeleteVisit = (visitId: string) => {
    const next = deletePoiVisit(poi.id, visitId);
    setState(next);
  };

  const onAddVisit = async () => {
    setSavingVisit(true);
    try {
      const snapshot = await fetchCurrentWeatherSnapshot(poi.position.lat, poi.position.lng);
      const next = addPoiVisit(poi.id, snapshot);
      setState(next);
    } finally {
      setSavingVisit(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[16px] font-semibold text-foreground truncate">{poi.name}</div>
            {overlay?.isFavorite && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-foreground">
                <HugeiconsIcon icon={Tick02Icon} size={14} className="text-primary" />
                Favori
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <PoiTypeBadge type={poi.type} />
            <span className="text-xs text-muted-foreground">{headerSubtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant={overlay?.isFavorite ? "secondary" : "outline"} size="sm" onClick={onToggleFavorite}>
            {overlay?.isFavorite ? "Retirer" : "Favori"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRequestWeatherAt?.(poi.position.lat, poi.position.lng, poi.name)}
          >
            Météo
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="ideal">Critères</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-3">
            {ideal && (
              <div className="float-card overflow-hidden">
                <div
                  className="relative px-5 py-4"
                  style={{
                    background:
                      "radial-gradient(700px circle at 20% 0%, hsl(var(--accent)) 0%, transparent 60%), radial-gradient(700px circle at 80% 30%, hsl(var(--primary)) 0%, transparent 55%)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Météo idéale — match
                      </div>
                      <div className="mt-2 flex items-end gap-2">
                        <div className="text-[44px] font-bold leading-none tracking-tight text-foreground">
                          {idealMatch?.score ?? 0}
                        </div>
                        <div className="pb-1 text-sm font-semibold text-muted-foreground">/ 100</div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <Badge
                        variant={idealMatch?.status === "good" ? "default" : idealMatch?.status === "ok" ? "secondary" : "outline"}
                      >
                        {idealMatch?.status === "good" ? "OK" : idealMatch?.status === "ok" ? "Limite" : "Non"}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {loadingCurrent ? "Météo en cours..." : currentWeather?.temperatureC !== undefined ? `Actuel: ${currentWeather.temperatureC}°C` : "Actuel: —"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat label="Temp" value={currentWeather?.temperatureC !== undefined ? `${currentWeather.temperatureC}°C` : "—"} />
                    <MiniStat label="Vent" value={currentWeather?.windSpeedKmh !== undefined ? `${currentWeather.windSpeedKmh} km/h` : "—"} />
                    <MiniStat label="Pluie" value={currentWeather?.precipitationMm !== undefined ? `${currentWeather.precipitationMm} mm` : "—"} />
                    <MiniStat label="Nuages" value={currentWeather?.cloudCoverPct !== undefined ? `${currentWeather.cloudCoverPct}%` : "—"} />
                  </div>
                </div>
              </div>
            )}

            <div className="float-card-sm px-4 py-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Résumé</div>
              <div className="mt-2 text-sm text-foreground">
                Ce panneau va accueillir des infos spécifiques selon le type de POI (capacité, altitude, statut, etc.).
              </div>
            </div>

            {ideal && (
              <div className="float-card-sm px-4 py-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Météo idéale</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <MiniStat label="Temp" value={fmtTemp(ideal.tempMinC, ideal.tempMaxC)} />
                  <MiniStat label="Vent max" value={fmtNum(ideal.windMaxKmh, "km/h")} />
                  <MiniStat label="Pluie max" value={fmtNum(ideal.precipitationMaxMm, "mm")} />
                  <MiniStat label="Nuages max" value={fmtNum(ideal.cloudCoverMaxPct, "%")} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ideal" className="mt-4">
          <IdealWeatherEditor value={ideal} onChange={onSaveIdeal} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="space-y-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Ajouter une note</div>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Conditions terrain, accès, conseils..." />
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Photos (local)</div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setNoteFiles(Array.from(e.target.files ?? []))}
                />
                {notePreviews.length > 0 && (
                  <div className="flex gap-2 overflow-auto pb-1">
                    {notePreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Aperçu"
                        className="h-16 w-16 rounded-2xl object-cover border"
                      />
                    ))}
                  </div>
                )}
              </div>
              {noteError && (
                <div className="text-sm text-destructive">{noteError}</div>
              )}
              <Button onClick={onAddNote} disabled={!noteText.trim() && noteFiles.length === 0}>
                {savingNote ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              {notes.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune note pour le moment.</div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="float-card-sm px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</div>
                      <Button variant="ghost" size="sm" onClick={() => void onDeleteNote(n.id)}>
                        Supprimer
                      </Button>
                    </div>
                    <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">{n.text}</div>
                    {n.photoIds && n.photoIds.length > 0 && (
                      <NotePhotos photoIds={n.photoIds} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-3">
            <div className="float-card-sm px-4 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Enregistrer une visite</div>
                <div className="text-xs text-muted-foreground">On stocke la date (snapshot météo ensuite).</div>
              </div>
              <Button onClick={onAddVisit} size="sm" disabled={savingVisit || !isOnline}>
                {savingVisit ? "Ajout..." : "Ajouter"}
              </Button>
            </div>

            {!isOnline && (
              <div className="text-sm text-muted-foreground">
                Hors-ligne: impossible de récupérer un snapshot météo pour la visite.
              </div>
            )}

            <div className="space-y-2">
              {visits.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun historique pour le moment.</div>
              ) : (
                visits.map((v) => (
                  <div key={v.id} className="float-card-sm px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">{new Date(v.visitedAt).toLocaleString()}</div>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteVisit(v.id)}>
                        Supprimer
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {v.weatherSnapshot?.temperatureC !== undefined
                        ? `Météo: ${v.weatherSnapshot.temperatureC}°C · Vent ${v.weatherSnapshot.windSpeedKmh ?? "—"} km/h · Pluie ${v.weatherSnapshot.precipitationMm ?? "—"} mm`
                        : "Visite enregistrée"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotePhotos({ photoIds }: { photoIds: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    (async () => {
      const next: string[] = [];
      for (const id of photoIds) {
        // eslint-disable-next-line no-await-in-loop
        const url = await getPhotoObjectUrl(id);
        if (url) {
          created.push(url);
          next.push(url);
        }
      }

      if (!cancelled) setUrls(next);
    })();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photoIds]);

  if (urls.length === 0) return null;

  return (
    <div className="mt-2 flex gap-2 overflow-auto pb-1">
      {urls.map((src, i) => (
        <img key={i} src={src} alt="Photo" className="h-20 w-20 rounded-2xl object-cover border" />
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground leading-none">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-foreground leading-none">{value}</div>
    </div>
  );
}

function fmtNum(v: number | undefined, unit: string) {
  if (typeof v !== "number") return "—";
  return `${v}${unit}`;
}

function fmtTemp(minC: number | undefined, maxC: number | undefined) {
  if (typeof minC !== "number" && typeof maxC !== "number") return "—";
  if (typeof minC === "number" && typeof maxC === "number") return `${minC}–${maxC}°C`;
  if (typeof minC === "number") return `≥ ${minC}°C`;
  return `≤ ${maxC}°C`;
}

function IdealWeatherEditor({
  value,
  onChange,
}: {
  value?: IdealWeather;
  onChange: (next: IdealWeather) => void;
}) {
  const [tempMin, setTempMin] = useState<number>(value?.tempMinC ?? 8);
  const [tempMax, setTempMax] = useState<number>(value?.tempMaxC ?? 22);
  const [windMax, setWindMax] = useState<number>(value?.windMaxKmh ?? 25);
  const [precipMax, setPrecipMax] = useState<number>(value?.precipitationMaxMm ?? 1);
  const [cloudMax, setCloudMax] = useState<number>(value?.cloudCoverMaxPct ?? 70);

  useEffect(() => {
    setTempMin(value?.tempMinC ?? 8);
    setTempMax(value?.tempMaxC ?? 22);
    setWindMax(value?.windMaxKmh ?? 25);
    setPrecipMax(value?.precipitationMaxMm ?? 1);
    setCloudMax(value?.cloudCoverMaxPct ?? 70);
  }, [value?.cloudCoverMaxPct, value?.precipitationMaxMm, value?.tempMaxC, value?.tempMinC, value?.windMaxKmh]);

  const persist = (next: Partial<IdealWeather>) => {
    onChange({
      tempMinC: tempMin,
      tempMaxC: tempMax,
      windMaxKmh: windMax,
      precipitationMaxMm: precipMax,
      cloudCoverMaxPct: cloudMax,
      ...next,
    });
  };

  return (
    <div className="space-y-4">
      <div className="float-card-sm px-4 py-4 space-y-3">
        <div className="text-sm font-medium">Température idéale</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <div className="text-xs text-muted-foreground">Min (°C)</div>
            <Input
              value={tempMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTempMin(v);
                persist({ tempMinC: v });
              }}
              type="number"
            />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs text-muted-foreground">Max (°C)</div>
            <Input
              value={tempMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTempMax(v);
                persist({ tempMaxC: v });
              }}
              type="number"
            />
          </div>
        </div>
      </div>

      <RangeControl
        title="Vent max"
        value={windMax}
        unit="km/h"
        min={0}
        max={120}
        step={1}
        onChange={(v) => {
          setWindMax(v);
          persist({ windMaxKmh: v });
        }}
      />

      <RangeControl
        title="Pluie max"
        value={precipMax}
        unit="mm"
        min={0}
        max={20}
        step={0.5}
        onChange={(v) => {
          setPrecipMax(v);
          persist({ precipitationMaxMm: v });
        }}
      />

      <RangeControl
        title="Nuages max"
        value={cloudMax}
        unit="%"
        min={0}
        max={100}
        step={1}
        onChange={(v) => {
          setCloudMax(v);
          persist({ cloudCoverMaxPct: v });
        }}
      />

      <div className="text-xs text-muted-foreground">
        Ces critères seront utilisés pour te dire si le POI correspond à ta météo idéale.
      </div>
    </div>
  );
}

function RangeControl({
  title,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  title: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="float-card-sm px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm font-semibold text-foreground">
          {value}
          {unit}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}
