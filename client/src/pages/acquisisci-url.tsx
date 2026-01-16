import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  Phone,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";

interface SimilarProperty {
  id: number;
  titolo: string | null;
  indirizzo: string | null;
  zona: string | null;
  mq: number | null;
  prezzo: string | null;
  statoContatto: string | null;
  urlAnnuncio: string | null;
  fonte: string | null;
}

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
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<SimilarProperty[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
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

  const handleSave = async () => {
    if (!scrapedData) return;
    
    setIsCheckingDuplicate(true);
    try {
      // Check for duplicates first
      const res = await apiRequest("POST", "/api/scrape/check-duplicate", {
        indirizzo: scrapedData.indirizzo,
        titolo: scrapedData.titolo,
        zona: scrapedData.zona,
        mq: scrapedData.mq,
        prezzo: scrapedData.prezzo,
        urlAnnuncio: scrapedData.urlAnnuncio
      });
      const result = await res.json();
      
      if (result.isDuplicate && result.exactMatch) {
        // Exact URL match - block save
        toast({
          title: "Duplicato trovato",
          description: "Questo annuncio è già presente nel sistema",
          variant: "destructive",
        });
        setIsCheckingDuplicate(false);
        return;
      }
      
      if (result.hasSimilar && result.similar?.length > 0) {
        // Similar properties found - ask for confirmation
        setSimilarProperties(result.similar);
        setShowDuplicateDialog(true);
        setIsCheckingDuplicate(false);
        return;
      }
      
      // No duplicates - proceed with save
      saveMutation.mutate(scrapedData);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante il controllo duplicati",
        variant: "destructive",
      });
    } finally {
      setIsCheckingDuplicate(false);
    }
  };
  
  const handleConfirmSave = () => {
    if (scrapedData) {
      setShowDuplicateDialog(false);
      setSimilarProperties([]);
      saveMutation.mutate(scrapedData);
    }
  };
  
  const handleCancelSave = () => {
    setShowDuplicateDialog(false);
    setSimilarProperties([]);
    toast({
      title: "Scartato",
      description: "Immobile non salvato per evitare duplicati",
    });
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
                disabled={saveMutation.isPending || isCheckingDuplicate}
                className="flex-1"
                data-testid="button-save"
              >
                {(saveMutation.isPending || isCheckingDuplicate) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isCheckingDuplicate ? "Controllo duplicati..." : "Salva in Acquisizione"}
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

      {/* Dialog conferma duplicato */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Possibile duplicato trovato
            </DialogTitle>
            <DialogDescription>
              Abbiamo trovato {similarProperties.length} immobil{similarProperties.length === 1 ? 'e' : 'i'} simil{similarProperties.length === 1 ? 'e' : 'i'} nel sistema. Vuoi procedere comunque?
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            {/* Nuovo immobile */}
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950" data-testid="card-new-property">
              <Badge className="mb-2 bg-green-600">NUOVO</Badge>
              <h4 className="font-medium text-sm truncate" data-testid="text-new-title">{scrapedData?.titolo || scrapedData?.indirizzo || "Immobile"}</h4>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                {scrapedData?.indirizzo && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate" data-testid="text-new-address">{scrapedData.indirizzo}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {scrapedData?.mq && (
                    <span className="flex items-center gap-1" data-testid="text-new-mq">
                      <Ruler className="h-3 w-3" />
                      {scrapedData.mq} mq
                    </span>
                  )}
                  {scrapedData?.prezzo && (
                    <span className="flex items-center gap-1" data-testid="text-new-price">
                      <Euro className="h-3 w-3" />
                      {formatPrice(scrapedData.prezzo)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="text-new-portal">
                  {scrapedData?.portale}
                </div>
              </div>
            </div>
            
            {/* Immobili esistenti simili */}
            {similarProperties.map((prop) => (
              <div key={prop.id} className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950" data-testid={`card-similar-property-${prop.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">ESISTENTE</Badge>
                  {prop.statoContatto === "contattato" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Contattato
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm truncate" data-testid={`text-similar-title-${prop.id}`}>{prop.titolo || prop.indirizzo || prop.zona || "Immobile"}</h4>
                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  {(prop.indirizzo || prop.zona) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate" data-testid={`text-similar-address-${prop.id}`}>{prop.indirizzo || prop.zona}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {prop.mq && (
                      <span className="flex items-center gap-1" data-testid={`text-similar-mq-${prop.id}`}>
                        <Ruler className="h-3 w-3" />
                        {prop.mq} mq
                      </span>
                    )}
                    {prop.prezzo && (
                      <span className="flex items-center gap-1" data-testid={`text-similar-price-${prop.id}`}>
                        <Euro className="h-3 w-3" />
                        {formatPrice(Number(prop.prezzo))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{prop.fonte}</span>
                    {prop.urlAnnuncio && (
                      <a 
                        href={prop.urlAnnuncio} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                        data-testid={`link-similar-url-${prop.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Apri
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={handleCancelSave}
              data-testid="button-cancel-duplicate"
            >
              Scarta (duplicato)
            </Button>
            <Button 
              onClick={handleConfirmSave}
              data-testid="button-confirm-save"
            >
              Conferma nuovo immobile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
