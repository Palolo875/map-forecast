import { useEffect, useMemo, useState } from "react";
import type { RouteResult } from "@/features/route/valhalla";
import type { RouteAnalysis } from "@/features/route/analyze";
import { scoreRiskFromWeather } from "@/features/route/analyze";
import { fetchHourlyWeatherAt } from "@/features/route/weather";
import { riskFromScore } from "@/features/route/risk";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/dates";

type RouteInspectorProps = {
  originLabel?: string;
  destinationLabel?: string;
  status: "idle" | "loading" | "error" | "ready";
  errorMessage?: string;
  route?: RouteResult | null;
  analysis?: RouteAnalysis | null;
  departureTs?: number;
  onDepartureTsChange?: (nextDepartureTs: number) => void;
  onClear: () => void;
};

export default function RouteInspector({
  originLabel,
  destinationLabel,
  status,
  errorMessage,
  route,
  analysis,
  departureTs,
  onDepartureTsChange,
  onClear,
}: RouteInspectorProps) {
  const title = originLabel && destinationLabel ? `${originLabel} → ${destinationLabel}` : "Trajet";

  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(null);

  const selectedSample = useMemo(() => {
    if (!analysis?.samples?.length) return null;
    const clamped = selectedSampleIndex === null ? 0 : Math.max(0, Math.min(analysis.samples.length - 1, selectedSampleIndex));
    return analysis.samples[clamped] ?? null;
  }, [analysis?.samples, selectedSampleIndex]);

  const global = analysis?.globalRisk;
  const globalVariant: BadgeProps["variant"] =
    global?.level === "extreme" ? "destructive" : global?.level === "high" ? "default" : "secondary";

  const selectedVariant: BadgeProps["variant"] =
    selectedSample?.risk.level === "extreme"
      ? "destructive"
      : selectedSample?.risk.level === "high"
        ? "default"
        : "secondary";

  const now = Date.now();
  const baseTs = typeof departureTs === "number" ? departureTs : now;
  const offsetMin = Math.max(0, Math.round((baseTs - now) / 60000));
  const maxOffsetMin = 24 * 60;

  const [windowsStatus, setWindowsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [windowsError, setWindowsError] = useState<string | null>(null);
  const [optimalWindows, setOptimalWindows] = useState<Array<{ departureTs: number; riskScore: number }>>([]);

  const alerts = useMemo(() => {
    const samples = analysis?.samples ?? [];
    if (!samples.length) return [];

    const items = samples
      .filter((s) => s.risk.level === "high" || s.risk.level === "extreme")
      .map((s) => {
        const rain = s.weather.precipitationMm ?? 0;
        const wind = s.weather.windSpeedKmh ?? 0;
        const code = s.weather.weatherCode ?? 0;

        const reasons: string[] = [];
        if (code >= 95) reasons.push("orage probable");
        if (rain >= 3) reasons.push("pluie soutenue");
        else if (rain >= 1) reasons.push("pluie modérée");
        if (wind >= 60) reasons.push("vent fort");
        else if (wind >= 40) reasons.push("vent marqué");

        const reason = reasons.length ? reasons.join(" · ") : "conditions défavorables";
        return { index: s.index, etaTs: s.etaTs, score: s.risk.score, level: s.risk.level, reason };
      });

    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 6);
  }, [analysis?.samples]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!route?.line?.coordinates?.length) {
        setWindowsStatus("idle");
        setOptimalWindows([]);
        return;
      }
      if (status !== "ready") return;

      const durationSec = route.durationSec ?? 0;
      if (!durationSec || durationSec < 60) {
        setWindowsStatus("idle");
        setOptimalWindows([]);
        return;
      }

      setWindowsStatus("loading");
      setWindowsError(null);

      try {
        const coords = route.line.coordinates as Array<[number, number]>;
        const pickIndices = [0, 0.35, 0.7, 1].map((p) => Math.round(p * (coords.length - 1)));
        const picks = Array.from(new Set(pickIndices)).map((i) => coords[Math.max(0, Math.min(coords.length - 1, i))]);

        const horizonHours = 6;
        const stepMin = 30;
        const start = Date.now();
        const candidates = Math.floor((horizonHours * 60) / stepMin) + 1;

        const results: Array<{ departureTs: number; riskScore: number }> = [];

        for (let c = 0; c < candidates; c += 1) {
          const dep = start + c * stepMin * 60000;
          let acc = 0;
          let count = 0;

          for (let i = 0; i < picks.length; i += 1) {
            const progress01 = picks.length === 1 ? 0 : i / (picks.length - 1);
            const etaTs = dep + Math.round(durationSec * progress01) * 1000;
            const lng = picks[i]?.[0];
            const lat = picks[i]?.[1];
            if (typeof lat !== "number" || typeof lng !== "number") continue;

            const w = await fetchHourlyWeatherAt(lat, lng, etaTs);
            const score = scoreRiskFromWeather(w);
            acc += score;
            count += 1;
          }

          const avg = count ? Math.round(acc / count) : 0;
          results.push({ departureTs: dep, riskScore: riskFromScore(avg).score });
        }

        results.sort((a, b) => a.riskScore - b.riskScore);
        const top = results.slice(0, 4);

        if (cancelled) return;
        setOptimalWindows(top);
        setWindowsStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setWindowsStatus("error");
        setWindowsError(e instanceof Error ? e.message : "WINDOWS_ERROR");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [route?.durationSec, route?.line, status]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[16px] font-semibold text-foreground truncate">{title}</div>
        <div className="text-xs text-muted-foreground">
          {status === "idle" && "Choisis un point de départ (clic carte), puis une destination."}
          {status === "loading" && "Calcul du trajet + météo le long du tracé..."}
          {status === "error" && (errorMessage ?? "Erreur de calcul")}
          {status === "ready" && route && (
            <>
              {route.distanceKm !== undefined ? `${route.distanceKm.toFixed(1)} km` : "—"}
              {" · "}
              {route.durationSec !== undefined ? `${Math.round(route.durationSec / 60)} min` : "—"}
            </>
          )}
        </div>
      </div>

      {route && status !== "idle" && (
        <div className="float-card-sm px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">Simuler un départ</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(baseTs)}</div>
          </div>
          <div className="text-xs text-muted-foreground">Décalage: {offsetMin} min</div>
          <Slider
            value={[Math.min(offsetMin, maxOffsetMin)]}
            min={0}
            max={maxOffsetMin}
            step={15}
            onValueChange={(v) => {
              const nextMin = v[0] ?? 0;
              const nextTs = Date.now() + nextMin * 60000;
              onDepartureTsChange?.(nextTs);
            }}
            disabled={!onDepartureTsChange || status === "loading"}
          />
        </div>
      )}

      <Separator />

      <div className="float-card-sm px-4 py-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Résumé (V1)</div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-foreground">Score risque</div>
          {status === "loading" ? (
            <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
          ) : global ? (
            <Badge variant={globalVariant}>
              {global.score}/100
            </Badge>
          ) : (
            <Badge variant="secondary">—</Badge>
          )}
        </div>

        {analysis?.samples?.length ? (
          <div className="pt-2">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Timeline</div>
            <div className="mt-2 flex gap-2 overflow-auto pb-1">
              {analysis.samples.map((s) => (
                <button
                  key={s.index}
                  type="button"
                  className="shrink-0 rounded-2xl border bg-muted/30 px-3 py-2 min-w-[132px] text-left transition-shadow hover:shadow-sm"
                  style={{ borderColor: `${s.risk.level === "low" ? "rgba(34,197,94,0.35)" : s.risk.level === "medium" ? "rgba(245,158,11,0.35)" : s.risk.level === "high" ? "rgba(249,115,22,0.35)" : "rgba(239,68,68,0.35)"}` }}
                  onClick={() => setSelectedSampleIndex(s.index)}
                >
                  <div className="text-[11px] text-muted-foreground leading-none">{formatDateTime(s.etaTs)}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-foreground">{s.risk.score}/100</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.weather.temperatureC !== undefined ? `${s.weather.temperatureC}°C` : "—"}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Vent {s.weather.windSpeedKmh ?? "—"} · Pluie {s.weather.precipitationMm ?? "—"}
                  </div>
                </button>
              ))}
            </div>

            {selectedSample && (
              <div className="mt-3 rounded-2xl border bg-muted/20 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-foreground">Point #{selectedSample.index + 1}</div>
                  <Badge variant={selectedVariant}>
                    {selectedSample.risk.score}/100
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(selectedSample.etaTs)}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-background/60 border px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">Température</div>
                    <div className="text-sm font-medium text-foreground">{selectedSample.weather.temperatureC ?? "—"}{selectedSample.weather.temperatureC !== undefined ? "°C" : ""}</div>
                  </div>
                  <div className="rounded-xl bg-background/60 border px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">Vent</div>
                    <div className="text-sm font-medium text-foreground">{selectedSample.weather.windSpeedKmh ?? "—"}{selectedSample.weather.windSpeedKmh !== undefined ? " km/h" : ""}</div>
                  </div>
                  <div className="rounded-xl bg-background/60 border px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">Pluie</div>
                    <div className="text-sm font-medium text-foreground">{selectedSample.weather.precipitationMm ?? "—"}{selectedSample.weather.precipitationMm !== undefined ? " mm" : ""}</div>
                  </div>
                  <div className="rounded-xl bg-background/60 border px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">Nébulosité</div>
                    <div className="text-sm font-medium text-foreground">{selectedSample.weather.cloudCoverPct ?? "—"}{selectedSample.weather.cloudCoverPct !== undefined ? "%" : ""}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-foreground">Timeline</div>
            <Badge variant="secondary">—</Badge>
          </div>
        )}
      </div>

      <div className="float-card-sm px-4 py-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alertes (V1)</div>
        {status === "loading" ? (
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
        ) : alerts.length ? (
          <div className="space-y-2">
            {alerts.map((a) => (
              <button
                key={`${a.index}-${a.etaTs}`}
                type="button"
                className="w-full rounded-2xl border bg-muted/20 px-3 py-2 text-left hover:bg-muted/30"
                onClick={() => setSelectedSampleIndex(a.index)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-foreground">{formatDateTime(a.etaTs)}</div>
                  <Badge variant={a.level === "extreme" ? "destructive" : "default"}>{a.score}/100</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.reason}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Aucune alerte majeure détectée.</div>
        )}
      </div>

      <div className="float-card-sm px-4 py-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fenêtres optimales (V1)</div>
        <div className="text-xs text-muted-foreground">Simulation sur les 6 prochaines heures (pas de 30 min).</div>
        {windowsStatus === "loading" ? (
          <div className="h-12 rounded-xl bg-muted animate-pulse" />
        ) : windowsStatus === "error" ? (
          <div className="text-sm text-muted-foreground">{windowsError ?? "Erreur de simulation"}</div>
        ) : optimalWindows.length ? (
          <div className="space-y-2">
            {optimalWindows.map((w) => (
              <button
                key={w.departureTs}
                type="button"
                className="w-full rounded-2xl border bg-muted/20 px-3 py-2 text-left hover:bg-muted/30"
                onClick={() => onDepartureTsChange?.(w.departureTs)}
                disabled={!onDepartureTsChange || status === "loading"}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">Départ {formatDateTime(w.departureTs)}</div>
                  <Badge variant={riskFromScore(w.riskScore).level === "low" ? "secondary" : riskFromScore(w.riskScore).level === "medium" ? "secondary" : riskFromScore(w.riskScore).level === "high" ? "default" : "destructive"}>
                    {w.riskScore}/100
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Cliquer pour simuler ce départ</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClear}>
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
