import WeatherPanel from "@/components/WeatherPanel";
import { HubButton } from "@/components/maphub/shared";

type WeatherTabProps = {
  weatherLocation: { lat: number; lng: number; name: string } | null;
  onClearWeather: () => void;
  onBack: () => void;
  useNauticalUnits?: boolean;
};

export default function WeatherTab({ weatherLocation, onClearWeather, onBack, useNauticalUnits }: WeatherTabProps) {
  return (
    <div className="space-y-3">
      {weatherLocation ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <HubButton variant="outline" size="sm" onClick={onBack}>
              Retour
            </HubButton>
            <HubButton variant="ghost" size="sm" onClick={onClearWeather}>
              Fermer
            </HubButton>
          </div>
          <div className="float-card-sm px-4 py-4">
            <WeatherPanel
              lat={weatherLocation.lat}
              lng={weatherLocation.lng}
              locationName={weatherLocation.name}
              onClose={onClearWeather}
              embedded
              useNauticalUnits={useNauticalUnits}
            />
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">Sélectionne un lieu pour voir la météo.</div>
      )}
    </div>
  );
}
