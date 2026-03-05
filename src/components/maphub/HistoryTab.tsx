import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPoi, getAllVisits, getNotesForPoi } from "@/features/poi/db";
import type { PoiVisit, Poi } from "@/features/poi/types";
import { exportUserDataZip, importUserDataZip } from "@/features/poi/export-import";
import { Download, Upload, AlertTriangle, Cloud, Thermometer, Wind } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function HistoryTab() {
  const [visits, setVisits] = useState<(PoiVisit & { poiName?: string; poiType?: Poi["type"] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>(["refuge", "emergency_shelter", "weather_station", "spot", "note"]);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    let urlsCreated: string[] = [];
    const loadHistory = async () => {
      try {
        const allVisits = await getAllVisits();
        const visitsWithPoi = await Promise.all(
          allVisits.map(async (v) => {
            const poi = await getPoi(v.poiId);
            return { ...v, poiName: poi?.name, poiType: poi?.type };
          })
        );
        // Trier par date décroissante
        visitsWithPoi.sort((a, b) => b.visitedAt - a.visitedAt);
        setVisits(visitsWithPoi);

        // Preload thumbnails: pick most recent note with photo for each POI
        const urls: Record<string, string> = {};
        for (const v of visitsWithPoi.slice(0, 40)) {
          if (urls[v.poiId]) continue;
          const notes = await getNotesForPoi(v.poiId);
          const withPhoto = [...notes]
            .filter((n) => !!n.photoBlob)
            .sort((a, b) => b.createdAt - a.createdAt)[0];
          if (withPhoto?.photoBlob) {
            urls[v.poiId] = URL.createObjectURL(withPhoto.photoBlob);
            urlsCreated.push(urls[v.poiId]);
          }
        }
        setThumbUrls(urls);
      } catch (e) {
        console.error("Failed to load history:", e);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();

    return () => {
      urlsCreated.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const filteredVisits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff = range === "7d" ? now - 7 * 24 * 60 * 60 * 1000 : range === "30d" ? now - 30 * 24 * 60 * 60 * 1000 : 0;

    return visits.filter((v) => {
      if (cutoff && v.visitedAt < cutoff) return false;
      if (v.poiType && !typeFilter.includes(v.poiType)) return false;
      if (!q) return true;
      const hay = `${v.poiName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, range, typeFilter, visits]);

  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      const blob = await exportUserDataZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `naveomap-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Données exportées avec succès");
    } catch (e) {
      toast.error("Erreur lors de l'exportation");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const result = await importUserDataZip(file);
    if (result.success) {
      toast.success(`${result.count} éléments importés avec succès`);
      window.location.reload();
    } else {
      toast.error(`Erreur d'importation : ${result.error}`);
    }
    setIsImporting(false);
  };

  if (loading) return <div className="text-center py-10 opacity-50">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground/60">
          Journal de bord
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Exporter les données">
            <Download className="w-4 h-4" />
          </Button>
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept=".zip" onChange={handleImport} disabled={isImporting} />
            <div className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground",
              isImporting && "opacity-50 cursor-not-allowed"
            )}>
              <Upload className="w-4 h-4" />
            </div>
          </label>
        </div>
      </div>

      <div className="px-2 space-y-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrer par lieu…" />
        <div className="flex items-center justify-between gap-2">
          <ToggleGroup type="multiple" value={typeFilter} onValueChange={(v) => setTypeFilter(v as string[])} className="flex flex-wrap justify-start">
            <ToggleGroupItem value="refuge">Refuges</ToggleGroupItem>
            <ToggleGroupItem value="emergency_shelter">Abris</ToggleGroupItem>
            <ToggleGroupItem value="weather_station">Stations</ToggleGroupItem>
            <ToggleGroupItem value="spot">Spots</ToggleGroupItem>
            <ToggleGroupItem value="note">Notes</ToggleGroupItem>
          </ToggleGroup>

          <ToggleGroup type="single" value={range} onValueChange={(v) => setRange(((v as typeof range) || "30d") as typeof range)} className="justify-end">
            <ToggleGroupItem value="7d">7j</ToggleGroupItem>
            <ToggleGroupItem value="30d">30j</ToggleGroupItem>
            <ToggleGroupItem value="all">Tout</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      <div className="relative px-2 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-border/40">
        {filteredVisits.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">Aucun souvenir encore enregistré.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredVisits.map((visit) => (
              <div key={visit.id} className="relative pl-10">
                <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shadow-lg">
                  <Cloud className="w-4 h-4 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-foreground">
                      {visit.poiName || "Lieu inconnu"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(visit.visitedAt, "PPP 'à' p", { locale: fr })}
                    </span>
                  </div>

                  <Card className="p-4 bg-background/40 misty-glass border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted/30 border border-white/10 shrink-0">
                        {thumbUrls[visit.poiId] ? (
                          <img src={thumbUrls[visit.poiId]} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">—</div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <Thermometer className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{visit.weatherSnapshot?.temperatureC ?? "--"}°</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Wind className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{visit.weatherSnapshot?.windSpeedKmh ?? "--"} km/h</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Cloud className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{visit.weatherSnapshot?.precipitationMm ?? "0"} mm</span>
                      </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
