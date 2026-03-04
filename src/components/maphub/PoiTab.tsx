import type { Poi } from "@/features/poi/types";
import POIInspector from "@/components/poi/POIInspector";
import { Separator } from "@/components/ui/separator";
import { HubButton } from "@/components/maphub/shared";

type PoiTabProps = {
  selectedPoi: Poi | null;
  onClearPoi: () => void;
  onRequestWeatherAt: (lat: number, lng: number, name: string) => void;
  onBack: () => void;
};

export default function PoiTab({ selectedPoi, onClearPoi, onRequestWeatherAt, onBack }: PoiTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <HubButton variant="outline" size="sm" onClick={onBack}>
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
