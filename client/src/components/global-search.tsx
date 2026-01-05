import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, User, Building2, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchResult {
  id: number;
  type: 'cliente' | 'immobile' | 'richiesta';
  label: string;
  sublabel?: string;
}

interface SearchResponse {
  clienti: SearchResult[];
  immobili: SearchResult[];
  richieste: SearchResult[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data);
            setIsOpen(true);
          }
        } catch (e) {
          console.error("Search error:", e);
        }
        setIsLoading(false);
      } else {
        setResults(null);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    const routes = {
      cliente: `/clienti/${result.id}`,
      immobile: `/immobili/${result.id}`,
      richiesta: `/richieste/${result.id}`,
    };
    navigate(routes[result.type]);
    setQuery("");
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'cliente': return <User className="h-4 w-4" />;
      case 'immobile': return <Building2 className="h-4 w-4" />;
      case 'richiesta': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  const allResults = results 
    ? [...results.clienti, ...results.immobili, ...results.richieste]
    : [];

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Cerca clienti, immobili, richieste..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setIsOpen(true)}
          className="pl-9 pr-9"
          data-testid="input-global-search"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery("");
              setResults(null);
              setIsOpen(false);
            }}
            data-testid="button-clear-search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Ricerca in corso...
            </div>
          ) : allResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nessun risultato per "{query}"
            </div>
          ) : (
            <div className="py-1">
              {results?.clienti.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Clienti
                  </div>
                  {results.clienti.map((r) => (
                    <button
                      key={`cliente-${r.id}`}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover-elevate text-left"
                      data-testid={`search-result-cliente-${r.id}`}
                    >
                      <span className="text-muted-foreground">{getIcon(r.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.label}</p>
                        {r.sublabel && (
                          <p className="truncate text-xs text-muted-foreground">{r.sublabel}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
              {results?.immobili.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Immobili
                  </div>
                  {results.immobili.map((r) => (
                    <button
                      key={`immobile-${r.id}`}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover-elevate text-left"
                      data-testid={`search-result-immobile-${r.id}`}
                    >
                      <span className="text-muted-foreground">{getIcon(r.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.label}</p>
                        {r.sublabel && (
                          <p className="truncate text-xs text-muted-foreground">{r.sublabel}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
              {results?.richieste.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Richieste
                  </div>
                  {results.richieste.map((r) => (
                    <button
                      key={`richiesta-${r.id}`}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover-elevate text-left"
                      data-testid={`search-result-richiesta-${r.id}`}
                    >
                      <span className="text-muted-foreground">{getIcon(r.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.label}</p>
                        {r.sublabel && (
                          <p className="truncate text-xs text-muted-foreground">{r.sublabel}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
