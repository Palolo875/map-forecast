import { useState, useRef, useEffect } from "react";
import { Search, MapPin, X } from "lucide-react";

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
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=fr`);
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
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="glass-panel glow-border flex items-center gap-2 rounded-lg px-3 py-2">
        <Search className="h-4 w-4 text-primary shrink-0" />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Rechercher un lieu..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-lg overflow-hidden z-50 animate-slide-up">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                <span className="text-foreground">{r.name}</span>
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
