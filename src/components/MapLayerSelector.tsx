import { useState } from "react";
import {
  HugeiconsIcon,
  LayersIcon,
  Sun03Icon,
  MoonIcon,
  SailboatIcon,
  EyeIcon,
} from "@/components/icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

export type MapMode = "road" | "topo" | "satellite" | "nautical";
export type MapTheme = "light" | "dark" | "cream" | "high-contrast";

interface MapLayerSelectorProps {
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  mapTheme: MapTheme;
  onMapThemeChange: (theme: MapTheme) => void;
  autoDayNight: boolean;
  onAutoDayNightChange: (v: boolean) => void;
  nauticalOverlay: boolean;
  onNauticalOverlayChange: (v: boolean) => void;
  isNight: boolean;
}

const MAP_MODES: { value: MapMode; label: string; desc: string; gradient: string }[] = [
  {
    value: "road",
    label: "Routière",
    desc: "Navigation & rues",
    gradient: "from-[hsl(33,24%,95%)] to-[hsl(30,18%,91%)]",
  },
  {
    value: "topo",
    label: "Topo",
    desc: "Relief & courbes",
    gradient: "from-[hsl(120,25%,85%)] to-[hsl(88,30%,75%)]",
  },
  {
    value: "satellite",
    label: "Satellite",
    desc: "Imagerie aérienne",
    gradient: "from-[hsl(210,30%,35%)] to-[hsl(200,25%,25%)]",
  },
  {
    value: "nautical",
    label: "Nautique",
    desc: "Cartes marines",
    gradient: "from-[hsl(200,50%,75%)] to-[hsl(210,40%,60%)]",
  },
];

const MAP_THEMES: { value: MapTheme; label: string; bg: string; fg: string }[] = [
  { value: "light", label: "Clair", bg: "bg-white", fg: "bg-foreground" },
  { value: "cream", label: "Crème", bg: "bg-background", fg: "bg-foreground" },
  { value: "dark", label: "Sombre", bg: "bg-[hsl(220,20%,15%)]", fg: "bg-white" },
  { value: "high-contrast", label: "HC", bg: "bg-white", fg: "bg-black" },
];

const MapLayerSelector = ({
  mapMode,
  onMapModeChange,
  mapTheme,
  onMapThemeChange,
  autoDayNight,
  onAutoDayNightChange,
  nauticalOverlay,
  onNauticalOverlayChange,
  isNight,
}: MapLayerSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="float-card-sm flex items-center gap-2 px-3.5 py-3 text-foreground hover:shadow-md transition-shadow shrink-0"
          aria-label="Paramètres de carte"
        >
          <HugeiconsIcon icon={LayersIcon} size={18} className="text-primary" strokeWidth={1.5} />
          <span className="text-[13px] font-medium hidden sm:inline">Couches</span>
          {isNight && (
            <HugeiconsIcon icon={MoonIcon} size={12} className="text-accent" strokeWidth={2} />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] p-0 rounded-[20px] border-border bg-card shadow-lg"
      >
        <div className="p-4 space-y-4">
          {/* Map Mode Thumbnails */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
              Type de carte
            </p>
            <div className="grid grid-cols-4 gap-2">
              {MAP_MODES.map((m) => {
                const active = mapMode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => onMapModeChange(m.value)}
                    className={`group relative rounded-2xl overflow-hidden transition-all duration-200 ${
                      active
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                        : "ring-1 ring-border hover:ring-primary/40"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className={`aspect-square bg-gradient-to-br ${m.gradient} flex items-center justify-center`}
                    >
                      {m.value === "road" && (
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-40">
                          <path d="M4 24L14 4L24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M2 18H26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      )}
                      {m.value === "topo" && (
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-50">
                          <ellipse cx="14" cy="14" rx="10" ry="6" stroke="hsl(120,30%,40%)" strokeWidth="1" />
                          <ellipse cx="14" cy="14" rx="6" ry="3.5" stroke="hsl(120,30%,40%)" strokeWidth="1" />
                          <ellipse cx="14" cy="14" rx="2.5" ry="1.5" stroke="hsl(120,30%,40%)" strokeWidth="1" />
                        </svg>
                      )}
                      {m.value === "satellite" && (
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-50">
                          <rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="1" />
                          <path d="M4 18L10 12L16 16L20 12L24 16" stroke="white" strokeWidth="1" />
                        </svg>
                      )}
                      {m.value === "nautical" && (
                        <HugeiconsIcon icon={SailboatIcon} size={20} className="opacity-50 text-[hsl(210,40%,30%)]" strokeWidth={1.5} />
                      )}
                    </div>
                    {/* Label */}
                    <div className="px-1 py-1.5 text-center">
                      <span
                        className={`text-[11px] font-medium leading-none ${
                          active ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {m.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="gentle-separator border-t" />

          {/* Theme */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
              Thème
            </p>
            <div className="flex gap-2">
              {MAP_THEMES.map((t) => {
                const active = mapTheme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => onMapThemeChange(t.value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Mini preview */}
                    <div
                      className={`w-8 h-5 rounded-md ${t.bg} border border-border relative overflow-hidden`}
                    >
                      <div className={`absolute bottom-0.5 left-0.5 right-0.5 h-0.5 rounded-full ${t.fg} opacity-30`} />
                      <div className={`absolute top-1 left-1 w-2 h-0.5 rounded-full ${t.fg} opacity-20`} />
                    </div>
                    <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="gentle-separator border-t" />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={isNight ? MoonIcon : Sun03Icon}
                  size={14}
                  className="text-accent"
                  strokeWidth={1.5}
                />
                <span className="text-[13px] text-foreground">Jour / nuit auto</span>
              </div>
              <Switch checked={autoDayNight} onCheckedChange={onAutoDayNightChange} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={SailboatIcon} size={14} className="text-primary" strokeWidth={1.5} />
                <span className="text-[13px] text-foreground">Overlay marin</span>
              </div>
              <Switch checked={nauticalOverlay} onCheckedChange={onNauticalOverlayChange} />
            </div>

            {mapTheme === "high-contrast" && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-accent/10">
                <HugeiconsIcon icon={EyeIcon} size={14} className="text-accent" strokeWidth={1.5} />
                <span className="text-[11px] text-accent-foreground">
                  Mode haute visibilité activé — contrastes renforcés
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MapLayerSelector;
