import { useState } from "react";
import {
  HugeiconsIcon,
  Layers01Icon,
  Sun03Icon,
  Moon02Icon,
  SailboatIcon,
  EyeIcon,
  Settings01Icon,
} from "@/components/icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    gradient: "from-[#E5E7EB] via-[#F3F4F6] to-[#E5E7EB]",
  },
  {
    value: "topo",
    label: "Topo",
    desc: "Relief & courbes",
    gradient: "from-[#D1FAE5] via-[#A7F3D0] to-[#D1FAE5]",
  },
  {
    value: "satellite",
    label: "Satellite",
    desc: "Imagerie réelle",
    gradient: "from-[#1E293B] via-[#334155] to-[#1E293B]",
  },
  {
    value: "nautical",
    label: "Nautique",
    desc: "Cartes marines",
    gradient: "from-[#BAE6FD] via-[#7DD3FC] to-[#BAE6FD]",
  },
];

const MAP_THEMES: { value: MapTheme; label: string; bg: string; border: string; dot: string }[] = [
  { value: "light", label: "Clair", bg: "bg-white", border: "border-slate-200", dot: "bg-slate-400" },
  { value: "cream", label: "Crème", bg: "bg-[#FAF8F4]", border: "border-[#E8E4D8]", dot: "bg-[#D8D4C8]" },
  { value: "dark", label: "Sombre", bg: "bg-[#1A1C1E]", border: "border-slate-800", dot: "bg-slate-600" },
  { value: "high-contrast", label: "Contraste", bg: "bg-black", border: "border-white", dot: "bg-white" },
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
          className="float-card-sm flex items-center gap-2.5 px-4 py-3 text-foreground hover:shadow-md transition-all duration-300 active:scale-95 group shrink-0"
          aria-label="Paramètres de carte"
        >
          <div className="relative">
            <HugeiconsIcon 
              icon={Layers01Icon} 
              size={18} 
              className={`transition-colors duration-300 ${open ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} 
              strokeWidth={1.5} 
            />
            {isNight && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full border-2 border-card animate-pulse" />
            )}
          </div>
          <span className="text-[14px] font-medium hidden sm:inline">Carte</span>
          <HugeiconsIcon icon={Settings01Icon} size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-[340px] p-0 rounded-[24px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-5 space-y-6">
          {/* Map Mode Thumbnails */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">
                Type de carte
              </h3>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold uppercase">
                {MAP_MODES.find(m => m.value === mapMode)?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MAP_MODES.map((m) => {
                const active = mapMode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => onMapModeChange(m.value)}
                    className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ${
                      active
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-card shadow-lg"
                        : "ring-1 ring-border/60 hover:ring-primary/40 hover:shadow-md"
                    }`}
                  >
                    {/* Visual Thumbnail */}
                    <div className={`h-16 w-full bg-gradient-to-br ${m.gradient} relative overflow-hidden flex items-center justify-center`}>
                      {/* Abstract map pattern */}
                      <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                        <svg width="100%" height="100%" viewBox="0 0 100 60" fill="none">
                          <path d="M0 10C30 15 40 5 70 20C100 35 110 25 140 40" stroke="currentColor" strokeWidth="2" />
                          <path d="M-20 30C10 35 20 25 50 40C80 55 90 45 120 60" stroke="currentColor" strokeWidth="2" />
                          <circle cx="20" cy="15" r="2" fill="currentColor" />
                          <circle cx="75" cy="45" r="3" fill="currentColor" />
                        </svg>
                      </div>
                      
                      {/* Specific Icons */}
                      <div className={`transition-transform duration-500 group-hover:scale-110 ${active ? 'scale-110' : ''}`}>
                        {m.value === "road" && (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-slate-600">
                            <path d="M4 21L12 3L20 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeJoin="round" />
                            <path d="M12 3V21" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                          </svg>
                        )}
                        {m.value === "topo" && (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
                            <path d="M2 17L7 12L12 17L17 7L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeJoin="round" />
                            <circle cx="17" cy="7" r="1.5" stroke="currentColor" strokeWidth="1" />
                          </svg>
                        )}
                        {m.value === "satellite" && (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M3 15L8 10L13 15L17 11L21 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeJoin="round" />
                            <circle cx="16" cy="7" r="1.5" fill="currentColor" />
                          </svg>
                        )}
                        {m.value === "nautical" && (
                          <HugeiconsIcon icon={SailboatIcon} size={28} className="text-sky-800" strokeWidth={1.5} />
                        )}
                      </div>
                      
                      {active && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeJoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-card">
                      <span className={`text-[12px] font-bold block ${active ? "text-primary" : "text-foreground"}`}>
                        {m.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
                        {m.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Theme Selector */}
          <section className="pt-2">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Style visuel
            </h3>
            <div className="flex gap-2.5">
              {MAP_THEMES.map((t) => {
                const active = mapTheme === t.value;
                return (
                  <TooltipProvider key={t.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onMapThemeChange(t.value)}
                          className={`flex-1 group relative flex flex-col items-center gap-2 p-1 rounded-2xl transition-all duration-300 ${
                            active
                              ? "bg-primary/5 ring-1 ring-primary/30"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div className={`w-full aspect-[4/3] rounded-xl ${t.bg} border-2 ${t.border} relative overflow-hidden shadow-sm transition-transform group-hover:scale-105 group-active:scale-95`}>
                            {/* Theme Preview Elements */}
                            <div className={`absolute top-2 left-2 w-4 h-1 rounded-full ${t.dot} opacity-40`} />
                            <div className={`absolute top-4 left-2 w-6 h-1 rounded-full ${t.dot} opacity-20`} />
                            <div className={`absolute bottom-2 right-2 w-3 h-3 rounded-full ${t.dot} opacity-30`} />
                            {active && (
                              <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg scale-110">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeJoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <span className={`text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
                            {t.label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] px-2 py-1 bg-foreground text-background rounded-md">
                        {t.label}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </section>

          {/* Settings Toggles */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${autoDayNight ? 'bg-accent/20 text-accent' : 'bg-slate-100 text-slate-400'}`}>
                  <HugeiconsIcon
                    icon={isNight ? Moon02Icon : Sun03Icon}
                    size={16}
                    strokeWidth={2}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-foreground leading-none mb-1">Jour / nuit auto</span>
                  <span className="text-[10px] text-muted-foreground">S'adapte au soleil</span>
                </div>
              </div>
              <Switch checked={autoDayNight} onCheckedChange={onAutoDayNightChange} className="data-[state=checked]:bg-accent" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${nauticalOverlay ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                  <HugeiconsIcon icon={SailboatIcon} size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-foreground leading-none mb-1">Overlay marin</span>
                  <span className="text-[10px] text-muted-foreground">Balises & profondeurs</span>
                </div>
              </div>
              <Switch checked={nauticalOverlay} onCheckedChange={onNauticalOverlayChange} />
            </div>

            {mapTheme === "high-contrast" && (
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-accent/10 border border-accent/20 animate-pulse-subtle">
                <div className="p-1.5 bg-accent rounded-lg text-white shrink-0 mt-0.5">
                  <HugeiconsIcon icon={EyeIcon} size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-accent-foreground leading-tight">Haute visibilité</span>
                  <p className="text-[10px] text-accent-foreground/80 leading-snug mt-0.5">
                    Optimisé pour le plein soleil et les déficiences visuelles.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MapLayerSelector;
