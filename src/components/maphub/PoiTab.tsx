import type { Poi } from "@/features/poi/types";
import POIInspector from "@/components/poi/POIInspector";
import { Separator } from "@/components/ui/separator";
import { HubButton } from "@/components/maphub/shared";
import { useMapHub } from "@/components/maphub/MapHubContext";

export default function PoiTab() {
  const { selectedPoi, onClearPoi, onRequestWeatherAt, setTab } = useMapHub();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <HubButton variant="outline" size="sm" onClick={() => setTab("overview")}>
          Retour
        </HubButton>
        <HubButton variant="ghost" size="sm" onClick={onClearPoi}>
          Fermer
        </HubButton>
      </div>
      <Separator />
      {selectedPoi ? (
        <POIInspector poi={selectedPoi} onRequestWeatherAt={onRequestWeatherAt} />
      ) : (
        <div className="text-sm text-muted-foreground">Sélectionne un POI sur la carte.</div>
      )}
    </div>
  );
}
