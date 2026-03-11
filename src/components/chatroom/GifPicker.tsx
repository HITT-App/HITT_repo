import { useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

interface TenorGif {
  id: string;
  media_formats: {
    tinygif: { url: string };
    gif: { url: string };
  };
}

export default function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<TenorGif[]>([]);
  const [hasFetchedTrending, setHasFetchedTrending] = useState(false);

  const TENOR_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"; // Free public Tenor API key

  const fetchTrending = useCallback(async () => {
    if (hasFetchedTrending) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=tinygif,gif`
      );
      const data = await res.json();
      setTrending(data.results || []);
      setHasFetchedTrending(true);
    } catch (e) {
      console.error("Tenor trending error:", e);
    }
    setLoading(false);
  }, [hasFetchedTrending]);

  const searchGifs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}&q=${encodeURIComponent(q)}&limit=20&media_filter=tinygif,gif`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error("Tenor search error:", e);
    }
    setLoading(false);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      fetchTrending();
    } else {
      onClose();
    }
  };

  const gifs = query.trim() ? results : trending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-2">
          <SheetTitle className="text-base">Search GIFs</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-secondary/60 rounded-full px-3 py-1.5 border border-border/40">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                searchGifs(e.target.value);
              }}
              placeholder="Search Tenor..."
              className="flex-1 bg-transparent text-sm py-1 outline-none placeholder:text-muted-foreground/60"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults([]); }}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading && gifs.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelect(gif.media_formats.gif.url);
                    onClose();
                  }}
                  className="rounded-lg overflow-hidden aspect-square bg-secondary hover:opacity-80 transition-opacity"
                >
                  <img
                    src={gif.media_formats.tinygif.url}
                    alt="GIF"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
