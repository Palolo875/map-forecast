import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon, Search01Icon, Location01Icon, Cancel01Icon } from "@/components/icons";

interface SearchResult {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}

interface SearchBarProps {
  onSelect: (lat: number, lng: number, name: string) => void;
}

const SearchBar = ({ onSelect }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=fr`
        );
        const data = await res.json();
        const mapped: SearchResult[] = data.features.map((f: any) => ({
          name: f.properties.name || "",
          city: f.properties.city,
          state: f.properties.state,
          country: f.properties.country,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        }));
        setResults(mapped);
        setOpen(mapped.length > 0);
      } catch {
        setResults([]);
      }
    }, 300);
  };

  const handleSelect = (r: SearchResult) => {
    const label = [r.name, r.city, r.country].filter(Boolean).join(", ");
    setQuery(label);
    setOpen(false);
    onSelect(r.lat, r.lng, label);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="float-card-sm flex items-center gap-3 px-5 py-3">
        <HugeiconsIcon icon={Search01Icon} size={18} className="text-muted-foreground" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Rechercher un lieu..."
          className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 float-card-sm overflow-hidden z-50 animate-float-in">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="flex items-center gap-3 w-full px-5 py-3 text-left text-[15px] hover:bg-muted/50 transition-colors"
            >
              <HugeiconsIcon icon={Location01Icon} size={16} className="text-primary shrink-0" strokeWidth={1.5} />
              <span className="truncate">
                <span className="text-foreground font-medium">{r.name}</span>
                {r.city && <span className="text-muted-foreground"> · {r.city}</span>}
                {r.country && <span className="text-muted-foreground"> · {r.country}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
