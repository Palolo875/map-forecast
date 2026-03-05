import React, { useState, useRef } from 'react';
import { Camera, Mic, Type, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMap } from '@/map/MapContext';
import { saveNote, savePoi } from '@/features/poi/db';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import type { Poi, PoiNote, WeatherSnapshot } from '@/features/poi/types';
import { fetchCurrentWeatherSnapshot } from '@/features/poi/weather';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: null | ((event: { results: unknown }) => void);
  onerror: null | (() => void);
  onend: null | (() => void);
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function QuickCapture() {
  const { map } = useMap();
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const supportsSpeech = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const toggleDictation = async () => {
    if (!supportsSpeech) {
      toast.error("Dictée indisponible sur cet appareil");
      return;
    }

    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };

    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Dictée indisponible sur cet appareil");
      return;
    }

    const recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const results = (event?.results ?? []) as ArrayLike<unknown>;
      const transcript = Array.from(results)
        .map((r) => {
          const rr = r as { 0?: { transcript?: string } };
          return rr[0]?.transcript ?? '';
        })
        .join(' ')
        .trim();
      if (transcript) {
        setNoteText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = () => {
      setIsDictating(false);
      toast.error("Erreur de dictée");
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    setIsDictating(true);
    recognition.start();
  };

  const handleCapture = async () => {
    if (!map) return;
    const center = map.getCenter();
    const id = nanoid();
    const timestamp = Date.now();

    setIsCapturing(true);

    try {
      // 1. Get current weather snapshot (real)
      const current = await fetchCurrentWeatherSnapshot(center.lat, center.lng);
      const weatherSnapshot: WeatherSnapshot = {
        temperatureC: current.temperatureC,
        weatherCode: current.weatherCode,
        windSpeedKmh: current.windSpeedKmh,
        precipitationMm: current.precipitationMm,
        cloudCoverPct: current.cloudCoverPct,
      };

      // 2. Create a User POI of type 'note'
      const newPoi: Poi = {
        id,
        type: 'note',
        source: 'user',
        name: noteText || `Note du ${new Date(timestamp).toLocaleDateString()}`,
        position: { lat: center.lat, lng: center.lng },
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // 3. Create the Note entry
      const newNote: PoiNote = {
        id: nanoid(),
        poiId: id,
        text: noteText,
        photoBlob: photo || undefined,
        weatherSnapshot,
        createdAt: timestamp,
        synced: false,
        syncedFlag: 0,
      };

      await savePoi(newPoi);
      await saveNote(newNote);

      toast.success("Note enregistrée avec succès");
      reset();
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsCapturing(false);
    }
  };

  const reset = () => {
    recognitionRef.current?.stop();
    setIsOpen(false);
    setNoteText('');
    setPhoto(null);
    setIsCapturing(false);
    setIsDictating(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl z-50 grainy-overlay"
        size="icon"
      >
        <Camera className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-x-6 bottom-24 z-50 animate-float-in">
      <div className="misty-glass rounded-2xl p-4 shadow-2xl shadow-black/40 grainy-overlay border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground/60">
            Quick Capture
          </span>
          <Button variant="ghost" size="icon" onClick={reset} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ajouter une note..."
            className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 resize-none h-20"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className={cn("h-10 gap-2", photo && "border-primary/50 text-primary")}
            >
              <Camera className="w-4 h-4" />
              {photo ? "Photo prête" : "Photo"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDictation}
              disabled={!supportsSpeech}
              className={cn(
                "h-10 gap-2",
                !supportsSpeech && "opacity-50 cursor-not-allowed",
                isDictating && "border-primary/50 text-primary"
              )}
            >
              <Mic className="w-4 h-4" />
              {isDictating ? "Écoute..." : "Dictée"}
            </Button>
          </div>

          <Button 
            onClick={handleCapture} 
            disabled={isCapturing}
            className="w-full h-12 gap-2"
          >
            {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
