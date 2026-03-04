import type { RouteAnalysis } from "@/features/route/analyze";
import type { RouteResult } from "@/features/route/valhalla";
import RouteInspector from "@/components/route/RouteInspector";
import TurnByTurn from "@/components/route/TurnByTurn";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HubButton } from "@/components/maphub/shared";

type RouteTabProps = {
  routeStops: Array<{ name: string }>;
  routeAddMode: "start" | "via" | "end";
  onRouteAddModeChange: (next: "start" | "via" | "end") => void;
  routeProfile: "auto" | "bicycle" | "pedestrian";
  onRouteProfileChange: (next: "auto" | "bicycle" | "pedestrian") => void;
  routeStatus: "idle" | "loading" | "error" | "ready";
  routeError?: string;
  route: RouteResult | null;
  routeAnalysis: RouteAnalysis | null;
  departureTs: number;
  onDepartureTsChange: (nextDepartureTs: number) => void;
  onClearRoute: () => void;
  onRemoveRouteStop: (index: number) => void;
  onMoveRouteStop: (index: number, dir: -1 | 1) => void;
  navStepIndex: number;
  onNavStepIndexChange: (next: number) => void;
  onBack: () => void;
  useNauticalUnits?: boolean;
};

export default function RouteTab({
  routeStops,
  routeAddMode,
  onRouteAddModeChange,
  routeProfile,
  onRouteProfileChange,
  routeStatus,
  routeError,
  route,
  routeAnalysis,
  departureTs,
  onDepartureTsChange,
  onClearRoute,
  onRemoveRouteStop,
  onMoveRouteStop,
  navStepIndex,
  onNavStepIndexChange,
  onBack,
  useNauticalUnits,
}: RouteTabProps) {
  const routeProfileLabel = routeProfile === "bicycle" ? "Vélo" : routeProfile === "pedestrian" ? "Marche" : "Voiture";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <HubButton variant="outline" size="sm" onClick={onBack}>
          Retour
        </HubButton>
        <HubButton variant="ghost" size="sm" onClick={onClearRoute}>
          Fermer
        </HubButton>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Mode</div>
        <ToggleGroup
          type="single"
          value={routeProfile}
          onValueChange={(v) => {
            const next = (v as typeof routeProfile) || routeProfile;
            onRouteProfileChange(next);
          }}
          variant="outline"
          size="sm"
          className="justify-start"
        >
          <ToggleGroupItem value="auto">Voiture</ToggleGroupItem>
          <ToggleGroupItem value="bicycle">Vélo</ToggleGroupItem>
          <ToggleGroupItem value="pedestrian">Marche</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="text-xs text-muted-foreground">Actuel: {routeProfileLabel}</div>

      <div className="float-card-sm px-4 py-3 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ajout</div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">Prochaine sélection</div>
          <ToggleGroup
            type="single"
            value={routeAddMode}
            onValueChange={(v) => {
              const next = (v as typeof routeAddMode) || routeAddMode;
              onRouteAddModeChange(next);
            }}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem value="start">Départ</ToggleGroupItem>
            <ToggleGroupItem value="via">Étape</ToggleGroupItem>
            <ToggleGroupItem value="end">Arrivée</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="text-[11px] text-muted-foreground">Clique sur la carte ou utilise la recherche.</div>
      </div>

      {routeStops.length > 0 && (
        <div className="float-card-sm px-4 py-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Étapes</div>
          <div className="space-y-2">
            {routeStops.map((s, i) => (
              <div key={`${i}-${s.name}`} className="flex items-center justify-between gap-2 rounded-2xl border bg-muted/20 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">
                    {i === 0 ? "Départ" : i === routeStops.length - 1 ? "Arrivée" : `Étape ${i}`}
                  </div>
                  <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <HubButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveRouteStop(i, -1)}
                    disabled={i === 0 || routeStatus === "loading"}
                  >
                    Monter
                  </HubButton>
                  <HubButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveRouteStop(i, 1)}
                    disabled={i === routeStops.length - 1 || routeStatus === "loading"}
                  >
                    Descendre
                  </HubButton>
                  <HubButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveRouteStop(i)}
                    disabled={routeStatus === "loading"}
                  >
                    Suppr.
                  </HubButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {route && (route.maneuvers?.length ?? 0) > 0 && (
        <TurnByTurn route={route} stepIndex={navStepIndex} onStepIndexChange={onNavStepIndexChange} useNauticalUnits={useNauticalUnits} />
      )}

      <RouteInspector
        originLabel={routeStops[0]?.name}
        destinationLabel={routeStops[routeStops.length - 1]?.name}
        status={routeStatus}
        errorMessage={routeError}
        route={route}
        analysis={routeAnalysis}
        departureTs={departureTs}
        onDepartureTsChange={onDepartureTsChange}
        onClear={onClearRoute}
        useNauticalUnits={useNauticalUnits}
      />
    </div>
  );
}
