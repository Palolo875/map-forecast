import { useEffect, useMemo, useState } from "react";
import type { RouteManeuver, RouteResult } from "@/features/route/valhalla";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

function formatDistanceKm(km?: number) {
  if (km === undefined) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatDurationSec(sec?: number) {
  if (sec === undefined) return "—";
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  return `${min} min`;
}

type TurnByTurnProps = {
  route: RouteResult;
  stepIndex: number;
  onStepIndexChange: (next: number) => void;
};

export default function TurnByTurn({ route, stepIndex, onStepIndexChange }: TurnByTurnProps) {
  const maneuvers = useMemo(() => route.maneuvers ?? [], [route.maneuvers]);

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);

  const voiceAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  }, []);

  const current = useMemo<RouteManeuver | null>(() => {
    if (!maneuvers.length) return null;
    const i = Math.max(0, Math.min(maneuvers.length - 1, stepIndex));
    return maneuvers[i] ?? null;
  }, [maneuvers, stepIndex]);

  const next = useMemo<RouteManeuver | null>(() => {
    if (!maneuvers.length) return null;
    const i = Math.max(0, Math.min(maneuvers.length - 1, stepIndex + 1));
    if (i === stepIndex) return null;
    return maneuvers[i] ?? null;
  }, [maneuvers, stepIndex]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (!voiceAvailable) return;
    if (!current?.instruction) return;

    const synth = window.speechSynthesis;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(current.instruction);
      u.lang = "fr-FR";
      synth.speak(u);
    } catch {
      // ignore
    }

    return () => {
      try {
        synth.cancel();
      } catch {
        // ignore
      }
    };
  }, [current?.instruction, voiceAvailable, voiceEnabled]);

  return (
    <div className="space-y-3">
      <div className="float-card-sm px-4 py-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation (simulation)</div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">Guidage vocal</div>
          <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} disabled={!voiceAvailable} />
        </div>
        {!voiceAvailable && (
          <div className="text-[11px] text-muted-foreground">Indisponible sur ce navigateur/appareil.</div>
        )}

        {!current ? (
          <div className="text-sm text-muted-foreground">Aucune instruction disponible pour ce trajet.</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Maintenant</div>
                <div className="text-[18px] font-semibold text-foreground leading-snug">{current.instruction}</div>
              </div>
              <Badge variant="secondary">{formatDistanceKm(current.distanceKm)}</Badge>
            </div>

            <div className="text-xs text-muted-foreground">Durée: {formatDurationSec(current.durationSec)}</div>

            {next && (
              <div className="rounded-2xl border bg-muted/20 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Ensuite</div>
                <div className="text-sm font-medium text-foreground leading-snug">{next.instruction}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="float-card-sm px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-foreground">Progression</div>
          <div className="text-xs text-muted-foreground">
            {maneuvers.length ? `Étape ${Math.min(maneuvers.length, stepIndex + 1)}/${maneuvers.length}` : "—"}
          </div>
        </div>
        <Slider
          value={[Math.max(0, Math.min(Math.max(0, maneuvers.length - 1), stepIndex))]}
          min={0}
          max={Math.max(0, maneuvers.length - 1)}
          step={1}
          onValueChange={(v) => {
            const nextI = v[0] ?? 0;
            onStepIndexChange(nextI);
          }}
          disabled={!maneuvers.length}
        />
      </div>
    </div>
  );
}
