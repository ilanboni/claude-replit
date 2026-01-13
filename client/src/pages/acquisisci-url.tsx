import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Link2, 
  Search, 
  Save, 
  Loader2, 
  Home, 
  MapPin, 
  Euro, 
  Ruler, 
  BedDouble, 
  Bath,
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Camera,
  Phone
} from "lucide-react";
import { Link } from "wouter";

interface ScrapedData {
  titolo: string;
  prezzo: number | null;
  indirizzo: string;
  zona: string;
  citta: string;
  mq: number | null;
  camere: number | null;
  bagni: number | null;
  piano: number | null;
  ascensore: boolean;
  balcone: boolean;
  terrazzo: boolean;
  box: boolean;
  cantina: boolean;
  giardino: boolean;
  arredato: boolean;
  classeEnergetica: string | null;
  descrizione: string;
  immagini: string[];
  urlAnnuncio: string;
  riferimentoAnnuncio: string | null;
  portale: string;
  contattoNome: string | null;
  contattoTelefono: string | null;
  contattoEmail: string | null;
}

export default function AcquisisciUrl() {
  const [url, setUrl] = useState("");
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const { toast } = useToast();

  const scrapeMutation = useMutation({
    mutationFn: async (urlToScrape: string) => {
      const res = await apiRequest("POST", "/api/scrape/url", { url: urlToScrape });
      return res.json();
    },
    onSuccess: (data) => {
      setScrapedData(data);
      toast({
        title: "Dati estratti",
        description: `Trovato: ${data.titolo || data.indirizzo || 'Immobile'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile estrarre i dati",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ScrapedData) => {
      const res = await apiRequest("POST", "/api/scrape/save", data);
      return res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Salvato",
        description: "Immobile aggiunto agli esterni",
      });
      setScrapedData(null);
      setUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare",
        variant: "destructive",
      });
    },
  });

  const handleScrape = () => {
    if (!url.trim()) {
      toast({
        title: "URL mancante",
        description: "Incolla l'URL dell'annuncio",
        variant: "destructive",
      });
      return;
    }
    scrapeMutation.mutate(url.trim());
  };

  const handleSave = () => {
    if (scrapedData) {
      saveMutation.mutate(scrapedData);
    }
  };

  const handleOcrScreenshot = async (file: File) => {
    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const res = await apiRequest("POST", "/api/scrape/ocr-phone", { image: base64 });
          const data = await res.json();
          
          if (data.found && data.phone) {
            toast({
              title: "Telefono trovato!",
              description: data.phone,
            });
            if (scrapedData) {
              setScrapedData({ ...scrapedData, contattoTelefono: data.phone });
            }
          } else {
            toast({
              title: "Telefono non trovato",
              description: "Prova con uno screenshot più chiaro",
              variant: "destructive",
            });
          }
        } catch (err: any) {
          toast({
            title: "Errore OCR",
            description: err.message,
            variant: "destructive",
          });
        } finally {
          setIsOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsOcrLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "N/D";
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/acquisizione">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Acquisisci da URL</h1>
          <p className="text-muted-foreground text-sm">Incolla l'URL di un annuncio per estrarre i dati</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            URL Annuncio
          </CardTitle>
          <CardDescription>
            Supportati: Immobiliare.it, Idealista
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://www.immobiliare.it/annunci/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              data-testid="input-url"
            />
            <Button 
              onClick={handleScrape} 
              disabled={scrapeMutation.isPending}
              data-testid="button-scrape"
            >
              {scrapeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Estrai</span>
            </Button>
          </div>
          {scrapeMutation.isPending && (
            <p className="text-sm text-muted-foreground mt-2">
              Estrazione in corso... può richiedere 30-60 secondi
            </p>
          )}
        </CardContent>
      </Card>

      {scrapedData && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Dati Estratti
                </CardTitle>
                <CardDescription>
                  Verifica i dati prima di salvare
                </CardDescription>
              </div>
              <Badge variant="outline">{scrapedData.portale}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Titolo</Label>
              <p className="font-medium">{scrapedData.titolo || "Non disponibile"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Indirizzo
                </Label>
                <p className="font-medium">{scrapedData.indirizzo || "N/D"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Zona
                </Label>
                <p className="font-medium">{scrapedData.zona || scrapedData.citta || "N/D"}</p>
              </div>
            </div>

            {/* Sezione telefono con OCR */}
            <div className="bg-muted/50 rounded-lg p-3">
              <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                <Phone className="h-3 w-3" /> Telefono
              </Label>
              {scrapedData.contattoTelefono ? (
                <p className="font-semibold text-lg">{scrapedData.contattoTelefono}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Non trovato - Carica uno screenshot del numero
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="text"
                      placeholder="Inserisci manualmente"
                      className="flex-1"
                      onChange={(e) => {
                        if (e.target.value) {
                          setScrapedData({ ...scrapedData, contattoTelefono: e.target.value });
                        }
                      }}
                      data-testid="input-phone-manual"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleOcrScreenshot(file);
                        }}
                        data-testid="input-screenshot"
                      />
                      <Button 
                        variant="outline" 
                        asChild
                        disabled={isOcrLoading}
                      >
                        <span>
                          {isOcrLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                          <span className="ml-2">OCR</span>
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Euro className="h-3 w-3" /> Prezzo
                </Label>
                <p className="font-semibold text-lg">{formatPrice(scrapedData.prezzo)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Superficie
                </Label>
                <p className="font-medium">{scrapedData.mq ? `${scrapedData.mq} mq` : "N/D"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> Camere
                </Label>
                <p className="font-medium">{scrapedData.camere || "N/D"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Bath className="h-3 w-3" /> Bagni
                </Label>
                <p className="font-medium">{scrapedData.bagni || "N/D"}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">Caratteristiche</Label>
              <div className="flex flex-wrap gap-2">
                {scrapedData.ascensore && <Badge variant="secondary">Ascensore</Badge>}
                {scrapedData.balcone && <Badge variant="secondary">Balcone</Badge>}
                {scrapedData.terrazzo && <Badge variant="secondary">Terrazzo</Badge>}
                {scrapedData.box && <Badge variant="secondary">Box</Badge>}
                {scrapedData.cantina && <Badge variant="secondary">Cantina</Badge>}
                {scrapedData.giardino && <Badge variant="secondary">Giardino</Badge>}
                {scrapedData.arredato && <Badge variant="secondary">Arredato</Badge>}
                {scrapedData.classeEnergetica && (
                  <Badge variant="outline">Classe {scrapedData.classeEnergetica}</Badge>
                )}
                {scrapedData.piano !== null && (
                  <Badge variant="outline">Piano {scrapedData.piano}</Badge>
                )}
              </div>
            </div>

            {scrapedData.descrizione && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Descrizione</Label>
                  <p className="text-sm line-clamp-4">{scrapedData.descrizione}</p>
                </div>
              </>
            )}

            {scrapedData.immagini && scrapedData.immagini.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">
                    Immagini ({scrapedData.immagini.length})
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {scrapedData.immagini.slice(0, 5).map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt={`Foto ${i + 1}`}
                        className="h-20 w-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1"
                data-testid="button-save"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salva in Acquisizione
              </Button>
              <Button
                variant="outline"
                onClick={() => setScrapedData(null)}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!scrapedData && !scrapeMutation.isPending && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Incolla l'URL di un annuncio per iniziare</p>
            <p className="text-sm mt-2">
              Funziona su iPad, iPhone e qualsiasi browser
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
