import type { Poi } from "@/features/poi/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HubBadge, HubButton, labelPoiType, labelWeather } from "@/components/maphub/shared";

type MiniWeather =
  | { status: "idle" | "loading" | "ready" | "error"; temperature?: number; windKmh?: number; precipitationMm?: number; code?: number }
  | null;

type OverviewTabProps = {
  ctx: { hasWeather: boolean; hasRoute: boolean; hasPoi: boolean };
  weatherLocationName?: string;
  miniWeather: MiniWeather;
  useNauticalUnits?: boolean;
  onOpenWeather: () => void;
  routeProfile: "auto" | "bicycle" | "pedestrian";
  onRouteProfileChange: (next: "auto" | "bicycle" | "pedestrian") => void;
  routeBadge?: { variant: "default" | "secondary" | "destructive"; label: string };
  overviewRouteSubtitle: string;
  routeAlertsPreview: Array<{ index: number; ts: number; score: number; reason: string }>;
  onOpenRoute: () => void;
  onClearRoute: () => void;
  selectedPoi: Poi | null;
  poiIsFavorite: boolean;
  onOpenPoi: () => void;
  onClearPoi: () => void;
};

export default function OverviewTab({
  ctx,
  weatherLocationName,
  miniWeather,
  useNauticalUnits,
  onOpenWeather,
  routeProfile,
  onRouteProfileChange,
  routeBadge,
  overviewRouteSubtitle,
  routeAlertsPreview,
  onOpenRoute,
  onClearRoute,
  selectedPoi,
  poiIsFavorite,
  onOpenPoi,
  onClearPoi,
}: OverviewTabProps) {
  return (
    <div className="space-y-3">
      <Accordion
        type="multiple"
        defaultValue={[ctx.hasWeather ? "weather" : null, ctx.hasRoute ? "route" : null, ctx.hasPoi ? "poi" : null].filter(Boolean) as string[]}
        className="space-y-3"
      >
        <AccordionItem value="weather" className="float-card-sm px-4 py-0 overflow-hidden border-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="text-sm font-medium text-foreground">Météo</div>
              <HubBadge variant="secondary">{ctx.hasWeather ? "Actif" : "—"}</HubBadge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0">
            <div className="pb-3 space-y-2">
              {ctx.hasWeather ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{weatherLocationName}</div>
                  {miniWeather?.status === "loading" ? (
                    <div className="h-10 rounded-xl bg-muted animate-pulse" />
                  ) : miniWeather?.status === "ready" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border bg-muted/20 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Maintenant</div>
                        <div className="text-sm font-semibold text-foreground">
                          {miniWeather.temperature !== undefined ? `${miniWeather.temperature}°` : "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {typeof miniWeather.code === "number" ? labelWeather(miniWeather.code) : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Vent</div>
                        <div className="text-sm font-semibold text-foreground">
                          {miniWeather.windKmh !== undefined
                            ? useNauticalUnits
                              ? `${Math.round(miniWeather.windKmh / 1.852)} kt`
                              : `${miniWeather.windKmh} km/h`
                            : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Pluie</div>
                        <div className="text-sm font-semibold text-foreground">
                          {miniWeather.precipitationMm !== undefined ? `${miniWeather.precipitationMm} mm` : "—"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Impossible de charger le résumé météo.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Clique sur la carte ou recherche un lieu.</div>
              )}
              {ctx.hasWeather && (
                <div className="pt-1">
                  <HubButton variant="outline" size="sm" onClick={onOpenWeather}>
                    Voir détails
                  </HubButton>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="route" className="float-card-sm px-4 py-0 overflow-hidden border-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="text-sm font-medium text-foreground">Trajet</div>
              {routeBadge ? <HubBadge variant={routeBadge.variant}>{routeBadge.label}</HubBadge> : <HubBadge variant="secondary">—</HubBadge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0">
            <div className="pb-3 space-y-2">
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
              <div className="text-sm text-muted-foreground">{overviewRouteSubtitle}</div>
              {ctx.hasRoute && routeAlertsPreview.length > 0 && (
                <div className="space-y-2">
                  {routeAlertsPreview.map((a) => (
                    <button
                      key={`${a.index}-${a.ts}`}
                      type="button"
                      className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-left hover:bg-muted/30"
                      onClick={onOpenRoute}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium text-foreground">
                          {new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <HubBadge variant="default">{a.score}/100</HubBadge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{a.reason}</div>
                    </button>
                  ))}
                </div>
              )}
              {ctx.hasRoute && (
                <div className="pt-1 flex items-center gap-2">
                  <HubButton variant="outline" size="sm" onClick={onOpenRoute}>
                    Inspecter
                  </HubButton>
                  <HubButton variant="ghost" size="sm" onClick={onClearRoute}>
                    Réinitialiser
                  </HubButton>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="poi" className="float-card-sm px-4 py-0 overflow-hidden border-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="text-sm font-medium text-foreground">POI</div>
              <HubBadge variant="secondary">{ctx.hasPoi ? "Sélection" : "—"}</HubBadge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0">
            <div className="pb-3 space-y-2">
              {ctx.hasPoi && selectedPoi ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{selectedPoi.name}</div>
                  <div className="flex items-center gap-2">
                    <HubBadge variant="outline">{labelPoiType(selectedPoi.type)}</HubBadge>
                    {poiIsFavorite && <HubBadge variant="secondary">Favori</HubBadge>}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sélectionne un point sur la carte.</div>
              )}
              {ctx.hasPoi && (
                <div className="pt-1 flex items-center gap-2">
                  <HubButton variant="outline" size="sm" onClick={onOpenPoi}>
                    Ouvrir
                  </HubButton>
                  <HubButton variant="ghost" size="sm" onClick={onClearPoi}>
                    Fermer
                  </HubButton>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
