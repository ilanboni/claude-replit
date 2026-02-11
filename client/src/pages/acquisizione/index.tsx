import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ImmobileEsterno } from "@shared/schema";
import { 
  Search, Star, StarOff, Phone, Mail, ExternalLink, MapPin, Home, Euro, 
  Trash2, MessageSquare, Copy, Check, Loader2, Sparkles, Building2, Plus,
  Image, FileText, Upload, X, Ruler, Bath, Eye, Send, FileEdit, ClipboardCheck,
  BarChart3, TrendingUp, Bot, RefreshCcw, Link2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

interface ParsedListing {
  titolo?: string;
  descrizione?: string;
  indirizzo?: string;
  zona?: string;
  citta?: string;
  mq?: number;
  prezzo?: number;
  piano?: number;
  pianiEdificio?: number;
  camere?: number;
  bagni?: number;
  // Caratteristiche booleane
  ascensore?: boolean;
  balcone?: boolean;
  terrazzo?: boolean;
  box?: boolean;
  cantina?: boolean;
  giardino?: boolean;
  arredato?: boolean;
  // Stato immobile
  statoNuovo?: boolean;
  statoRistrutturato?: boolean;
  statoBuono?: boolean;
  statoDaRistrutturare?: boolean;
  // Info aggiuntive
  classeEnergetica?: string;
  prestazioneEnergetica?: string;
  speseCondominiali?: number;
  riscaldamento?: string;
  esposizione?: string;
  annoCostruzione?: number;
  // Contatti
  contattoNome?: string;
  contattoTelefono?: string;
  contattoEmail?: string;
  // Meta
  fonte?: string;
  dataPubblicazione?: string;
  riferimentoAnnuncio?: string;
  caratteristiche?: Record<string, any>;
}

function ParseAnnuncioForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [annuncioText, setAnnuncioText] = useState("");
  const [annuncioUrl, setAnnuncioUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedListing | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (data: { text: string; url?: string }) => {
      const res = await apiRequest("POST", "/api/acquisizione/parse", data);
      return res.json();
    },
    onSuccess: (data: ParsedListing) => {
      setParsedData(data);
      setShowPreview(true);
      toast({
        title: "Annuncio analizzato",
        description: "Verifica i dati estratti e salva l'immobile",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile analizzare l'annuncio",
        variant: "destructive",
      });
    },
  });

  const parseImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file);
      
      if (file.type === "application/pdf") {
        // Convert PDF pages to high-resolution images for AI Vision (handles text in images)
        let pdfImages: string[] = [];
        let pdfText = "";
        
        try {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          const textParts: string[] = [];
          
          // Process each page: extract text AND render to image(s)
          const MAX_CANVAS_DIM = 6000; // Browser limit ~8192, use 6000 for safety margin
          const RENDER_SCALE = 1.5; // Good quality without excessive size
          
          for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Max 5 pages
            const page = await pdf.getPage(i);
            
            // Extract text
            try {
              const content = await page.getTextContent();
              const pageText = content.items
                .map((item: any) => item.str)
                .join(" ");
              textParts.push(pageText);
            } catch {}
            
            // Render page to image(s) - slice if too tall
            try {
              const viewport = page.getViewport({ scale: RENDER_SCALE });
              const pageWidth = viewport.width;
              const pageHeight = viewport.height;
              
              console.log(`PDF page ${i}: natural size ${Math.round(pageWidth)}x${Math.round(pageHeight)}`);
              
              if (pageHeight <= MAX_CANVAS_DIM) {
                // Page fits in one canvas
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                if (context) {
                  canvas.width = pageWidth;
                  canvas.height = pageHeight;
                  await page.render({ canvasContext: context, viewport, canvas } as any).promise;
                  const imageData = canvas.toDataURL("image/jpeg", 0.85);
                  pdfImages.push(imageData.split(",")[1]);
                  console.log(`  -> Single image: ${Math.round(pageWidth)}x${Math.round(pageHeight)}`);
                }
              } else {
                // Page too tall - render in vertical slices
                const numSlices = Math.ceil(pageHeight / MAX_CANVAS_DIM);
                console.log(`  -> Slicing into ${numSlices} parts`);
                
                for (let sliceIdx = 0; sliceIdx < numSlices; sliceIdx++) {
                  const yOffset = sliceIdx * MAX_CANVAS_DIM;
                  const sliceHeight = Math.min(MAX_CANVAS_DIM, pageHeight - yOffset);
                  
                  const canvas = document.createElement("canvas");
                  const context = canvas.getContext("2d");
                  if (context) {
                    canvas.width = pageWidth;
                    canvas.height = sliceHeight;
                    
                    // Use transform to shift the render area up
                    context.translate(0, -yOffset);
                    
                    await page.render({ 
                      canvasContext: context, 
                      viewport,
                      canvas
                    } as any).promise;
                    
                    const imageData = canvas.toDataURL("image/jpeg", 0.85);
                    pdfImages.push(imageData.split(",")[1]);
                    console.log(`  -> Slice ${sliceIdx + 1}/${numSlices}: y=${yOffset}, h=${Math.round(sliceHeight)}`);
                  }
                }
              }
            } catch (renderErr) {
              console.log("Page render failed:", renderErr);
            }
          }
          
          pdfText = textParts.join("\n\n");
        } catch (e) {
          console.log("Client-side PDF processing failed:", e);
        }
        
        // If we have images, use vision endpoint for better extraction
        if (pdfImages.length > 0) {
          const res = await apiRequest("POST", "/api/acquisizione/parse-pdf-vision", {
            pdfImages: pdfImages,
            pdfText: pdfText,
          });
          return res.json();
        }
        
        // Fallback to text-only parsing
        const res = await apiRequest("POST", "/api/acquisizione/parse-pdf", {
          pdfBase64: base64,
          pdfText: pdfText,
        });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/acquisizione/parse-image", {
          imageBase64: base64,
          mimeType: file.type,
        });
        return res.json();
      }
    },
    onSuccess: (data: ParsedListing) => {
      setParsedData(data);
      setShowPreview(true);
      toast({
        title: "File analizzato",
        description: "Verifica i dati estratti e salva l'immobile",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile analizzare il file",
        variant: "destructive",
      });
    },
  });

  // Check phone duplicate
  const checkPhoneDuplicate = async (phone: string): Promise<boolean> => {
    if (!phone.trim()) return false;
    setCheckingPhone(true);
    setPhoneError(null);
    try {
      const res = await fetch(`/api/acquisizione/check-phone?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.exists) {
        setPhoneError(`Numero già presente: ${data.immobile?.titolo || 'altro immobile'}`);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setCheckingPhone(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ParsedListing) => {
      const phoneToUse = manualPhone.trim() || data.contattoTelefono;
      const res = await apiRequest("POST", "/api/acquisizione", {
        ...data,
        contattoTelefono: phoneToUse || undefined,
        testoOriginale: annuncioText || undefined,
        urlAnnuncio: annuncioUrl || undefined,
      });
      return res.json();
    },
    onSuccess: (result: { immobile: any; clienteProspect: any }) => {
      const hasProspect = result.clienteProspect;
      toast({
        title: "Immobile salvato",
        description: hasProspect 
          ? `Immobile aggiunto e cliente prospect "${result.clienteProspect.nome} ${result.clienteProspect.cognome}" creato`
          : "L'immobile e stato aggiunto alla lista",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare l'immobile",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAnnuncioText("");
    setAnnuncioUrl("");
    setSelectedFile(null);
    setFilePreview(null);
    setParsedData(null);
    setShowPreview(false);
    setManualPhone("");
    setPhoneError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato non supportato",
        description: "Usa immagini JPEG, PNG, GIF, WebP o PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "Il file deve essere inferiore a 100MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    if (file.type === "application/pdf") {
      setFilePreview("pdf");
    } else {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleParseText = () => {
    if (!annuncioText.trim()) {
      toast({
        title: "Testo richiesto",
        description: "Incolla il testo dell'annuncio per analizzarlo",
        variant: "destructive",
      });
      return;
    }
    parseMutation.mutate({ text: annuncioText, url: annuncioUrl || undefined });
  };

  const handleParseImage = () => {
    if (!selectedFile) {
      toast({
        title: "Immagine richiesta",
        description: "Carica uno screenshot dell'annuncio",
        variant: "destructive",
      });
      return;
    }
    parseImageMutation.mutate(selectedFile);
  };

  const isParsing = parseMutation.isPending || parseImageMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={inputMode === "text" ? "default" : "outline"}
          onClick={() => setInputMode("text")}
          className="flex-1"
          data-testid="button-mode-text"
        >
          <FileText className="h-4 w-4 mr-2" />
          Testo
        </Button>
        <Button
          variant={inputMode === "image" ? "default" : "outline"}
          onClick={() => setInputMode("image")}
          className="flex-1"
          data-testid="button-mode-image"
        >
          <Image className="h-4 w-4 mr-2" />
          Screenshot
        </Button>
      </div>

      {inputMode === "text" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="text">Testo dell'annuncio</Label>
            <Textarea
              id="text"
              placeholder="Incolla qui il testo completo dell'annuncio immobiliare..."
              value={annuncioText}
              onChange={(e) => setAnnuncioText(e.target.value)}
              className="min-h-[200px]"
              data-testid="textarea-annuncio-text"
            />
            <p className="text-sm text-muted-foreground">
              Copia e incolla il testo dell'annuncio da Immobiliare.it, Idealista, Subito o altri portali
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL annuncio (opzionale)</Label>
            <Input
              id="url"
              placeholder="https://www.immobiliare.it/annunci/..."
              value={annuncioUrl}
              onChange={(e) => setAnnuncioUrl(e.target.value)}
              data-testid="input-annuncio-url"
            />
          </div>

          <Button 
            onClick={handleParseText} 
            disabled={isParsing || !annuncioText.trim()}
            className="w-full"
            data-testid="button-parse-annuncio"
          >
            {parseMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analizza con AI
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Screenshot o PDF dell'annuncio</Label>
            {!filePreview ? (
              <label 
                className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 cursor-pointer hover-elevate transition-colors"
                data-testid="label-file-upload"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">Clicca per caricare un file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Immagini (JPEG, PNG, GIF, WebP) o PDF (max 100MB)
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </label>
            ) : filePreview === "pdf" ? (
              <div className="relative flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                <FileText className="h-12 w-12 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium">{selectedFile?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile && (selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-full max-h-[300px] object-contain rounded-lg border"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Carica uno screenshot o PDF della pagina dell'annuncio. L'AI estrarrà automaticamente tutti i dati.
            </p>
          </div>

          <Button 
            onClick={handleParseImage} 
            disabled={isParsing || !selectedFile}
            className="w-full"
            data-testid="button-parse-screenshot"
          >
            {parseImageMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analizza File con AI
              </>
            )}
          </Button>
        </>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Dati estratti dall'annuncio</DialogTitle>
          </DialogHeader>
          
          {parsedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <Label className="text-muted-foreground text-xs">Titolo</Label>
                  <p className="font-medium">{parsedData.titolo || "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Zona</Label>
                  <p>{parsedData.zona || "-"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Citta</Label>
                  <p>{parsedData.citta || "-"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Indirizzo</Label>
                  <p>{parsedData.indirizzo || "-"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Prezzo</Label>
                  <p className="font-semibold text-primary">
                    {parsedData.prezzo ? `${parsedData.prezzo.toLocaleString('it-IT')}` : "-"}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Metri quadri</Label>
                  <p>{parsedData.mq ? `${parsedData.mq} mq` : "-"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Camere</Label>
                  <p>{parsedData.camere || "-"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Bagni</Label>
                  <p>{parsedData.bagni || "-"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Piano</Label>
                  <p>{parsedData.piano !== undefined ? (parsedData.piano === 0 ? "Terra" : `${parsedData.piano}`) : "-"}{parsedData.pianiEdificio ? ` / ${parsedData.pianiEdificio}` : ""}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Fonte</Label>
                  <p>{parsedData.fonte || "-"}</p>
                </div>

                <div className="col-span-3 border-t pt-4">
                  <Label className="text-muted-foreground text-xs mb-2 block">Caratteristiche</Label>
                  <div className="flex gap-2 flex-wrap">
                    {parsedData.ascensore && <Badge variant="outline">Ascensore</Badge>}
                    {parsedData.balcone && <Badge variant="outline">Balcone</Badge>}
                    {parsedData.terrazzo && <Badge variant="outline">Terrazzo</Badge>}
                    {parsedData.box && <Badge variant="outline">Box</Badge>}
                    {parsedData.cantina && <Badge variant="outline">Cantina</Badge>}
                    {parsedData.giardino && <Badge variant="outline">Giardino</Badge>}
                    {parsedData.arredato && <Badge variant="outline">Arredato</Badge>}
                    {parsedData.statoNuovo && <Badge variant="secondary">Nuovo</Badge>}
                    {parsedData.statoRistrutturato && <Badge variant="secondary">Ristrutturato</Badge>}
                    {parsedData.statoBuono && <Badge variant="secondary">Buono stato</Badge>}
                    {parsedData.statoDaRistrutturare && <Badge variant="secondary">Da ristrutturare</Badge>}
                    {!parsedData.ascensore && !parsedData.balcone && !parsedData.terrazzo && !parsedData.box && !parsedData.cantina && !parsedData.giardino && !parsedData.arredato && !parsedData.statoNuovo && !parsedData.statoRistrutturato && !parsedData.statoBuono && !parsedData.statoDaRistrutturare && (
                      <span className="text-muted-foreground text-sm">Nessuna caratteristica rilevata</span>
                    )}
                  </div>
                </div>

                <div className="col-span-3 border-t pt-4 grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Classe energetica</Label>
                    <p>{parsedData.classeEnergetica || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Spese condominiali</Label>
                    <p>{parsedData.speseCondominiali ? `${parsedData.speseCondominiali.toLocaleString('it-IT')}/mese` : "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Riscaldamento</Label>
                    <p>{parsedData.riscaldamento || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Esposizione</Label>
                    <p>{parsedData.esposizione || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Anno costruzione</Label>
                    <p>{parsedData.annoCostruzione || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Riferimento</Label>
                    <p>{parsedData.riferimentoAnnuncio || "-"}</p>
                  </div>
                </div>

                <div className="col-span-3 border-t pt-4">
                  <Label className="text-muted-foreground text-xs font-semibold">Telefono Proprietario *</Label>
                  <div className="flex gap-2 mt-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Inserisci numero telefono (es. 3331234567)"
                        value={manualPhone || parsedData.contattoTelefono || ""}
                        onChange={(e) => {
                          setManualPhone(e.target.value);
                          setPhoneError(null);
                        }}
                        onBlur={() => {
                          const phone = manualPhone.trim() || parsedData.contattoTelefono || "";
                          if (phone) checkPhoneDuplicate(phone);
                        }}
                        className={phoneError ? "border-red-500" : ""}
                        data-testid="input-phone-manual"
                      />
                      {phoneError && (
                        <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                      )}
                      {checkingPhone && (
                        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Verifica duplicati...
                        </p>
                      )}
                    </div>
                  </div>
                  {parsedData.contattoEmail && (
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{parsedData.contattoEmail}</span>
                    </div>
                  )}
                </div>

                {parsedData.descrizione && (
                  <div className="col-span-3">
                    <Label className="text-muted-foreground text-xs">Descrizione</Label>
                    <p className="text-sm mt-1 text-muted-foreground line-clamp-4">{parsedData.descrizione}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-modify-preview">
              Modifica
            </Button>
            <Button 
              onClick={async () => {
                if (!parsedData) return;
                const phone = manualPhone.trim() || parsedData.contattoTelefono || "";
                if (!phone) {
                  setPhoneError("Inserisci il numero di telefono del proprietario");
                  return;
                }
                const isDuplicate = await checkPhoneDuplicate(phone);
                if (isDuplicate) return;
                saveMutation.mutate(parsedData);
              }}
              disabled={saveMutation.isPending || checkingPhone || !!phoneError}
              data-testid="button-save-immobile"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Salva Immobile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatsData {
  dailyStats: Array<{ date: string; sent: number; responses: number; whatsapp: number; form: number }>;
  totals: {
    totalSent: number;
    totalResponses: number;
    totalWhatsApp: number;
    totalForm: number;
    totalPending: number;
    totalContacted: number;
    totalInterested: number;
    totalDiscarded: number;
  };
  responseRate: number;
  responseTypes: Record<string, number>;
  sourceStats: Record<string, number>;
  lastUpdated: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatisticsTab() {
  const { data: stats, isLoading, refetch } = useQuery<StatsData>({
    queryKey: ["/api/acquisizione/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun dato disponibile</p>
        </CardContent>
      </Card>
    );
  }

  const sourceData = Object.entries(stats.sourceStats).map(([name, value]) => ({ name, value }));
  const responseTypeData = Object.entries(stats.responseTypes)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ 
      name: name === 'interessato' ? 'Interessati' : 
            name === 'nonInteressato' ? 'Non interessati' :
            name === 'richiestaInfo' ? 'Richiesta info' :
            name === 'appuntamento' ? 'Appuntamento' : 'Altro', 
      value 
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Statistiche Campagne</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-stats">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Messaggi Inviati</CardDescription>
            <CardTitle className="text-3xl">{stats.totals.totalSent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.totals.totalWhatsApp} WhatsApp</span>
              {" / "}
              <span className="text-blue-600">{stats.totals.totalForm} Form</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risposte Ricevute</CardDescription>
            <CardTitle className="text-3xl">{stats.totals.totalResponses}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600 font-medium">{stats.responseRate}%</span>
              <span className="text-muted-foreground">tasso di risposta</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interessati</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.totals.totalInterested}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Proprietari interessati alla collaborazione
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Da Contattare</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.totals.totalPending}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Annunci in attesa di contatto
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Messaggi per Giorno</CardTitle>
            <CardDescription>Andamento ultimi 30 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="sent" name="Inviati" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="responses" name="Risposte" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">WhatsApp vs Form</CardTitle>
            <CardDescription>Trend messaggi per canale</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="form" name="Form" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fonti Annunci</CardTitle>
            <CardDescription>Distribuzione per portale</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {sourceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipi di Risposta</CardTitle>
            <CardDescription>Analisi delle risposte ricevute</CardDescription>
          </CardHeader>
          <CardContent>
            {responseTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={responseTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {responseTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nessuna risposta ricevuta
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Ultimo aggiornamento: {new Date(stats.lastUpdated).toLocaleString('it-IT')}
      </p>
    </div>
  );
}

function AIReportTab() {
  const { toast } = useToast();
  const [report, setReport] = useState<{ report: string; generatedAt: string; dataSnapshot: any } | null>(null);
  
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/acquisizione/ai-report", {});
      return res.json();
    },
    onSuccess: (data) => {
      setReport(data);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile generare il report AI",
        variant: "destructive",
      });
    },
  });

  const formatReport = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.substring(2)}</h2>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.substring(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-base font-medium mt-3 mb-1">{line.substring(4)}</h4>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 my-1">{line.substring(2)}</li>;
      }
      if (line.match(/^\d+\. /)) {
        return <li key={i} className="ml-4 my-1 list-decimal">{line.substring(line.indexOf(' ') + 1)}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold my-2">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="my-1">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Report AI
          </h2>
          <p className="text-muted-foreground text-sm">
            Analisi intelligente delle performance e consigli personalizzati
          </p>
        </div>
        <Button 
          onClick={() => generateReportMutation.mutate()}
          disabled={generateReportMutation.isPending}
          data-testid="button-generate-ai-report"
        >
          {generateReportMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generazione...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Genera Report
            </>
          )}
        </Button>
      </div>

      {!report && !generateReportMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 mb-4">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-medium">Analisi AI delle Campagne</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              Clicca su "Genera Report" per ottenere un'analisi completa delle tue campagne 
              di acquisizione con consigli pratici per migliorare le performance.
            </p>
          </CardContent>
        </Card>
      )}

      {generateReportMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analisi in corso...</p>
            <p className="text-sm text-muted-foreground mt-1">
              L'AI sta elaborando i dati delle tue campagne
            </p>
          </CardContent>
        </Card>
      )}

      {report && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Generato</CardTitle>
                <CardDescription>
                  {new Date(report.generatedAt).toLocaleString('it-IT')}
                </CardDescription>
              </div>
              {report.dataSnapshot && (
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-lg">{report.dataSnapshot.totalSent}</div>
                    <div className="text-muted-foreground text-xs">Inviati</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg text-green-600">{report.dataSnapshot.responseRate}%</div>
                    <div className="text-muted-foreground text-xs">Risposte</div>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            {formatReport(report.report)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ImmobileEsternoCard({ 
  immobile, 
  onGenerateMessage, 
  onDelete 
}: { 
  immobile: ImmobileEsterno;
  onGenerateMessage: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [formMessageGenerated, setFormMessageGenerated] = useState<string | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  // Funzione clipboard con fallback
  const copyToClipboardFallback = (text: string): boolean => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  const generateFormMessageMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-form-message", {
        immobileId: immobile.id,
        indirizzo: immobile.indirizzo,
        zona: immobile.zona,
        mq: immobile.mq,
        prezzo: immobile.prezzo,
        titolo: immobile.titolo,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setFormMessageGenerated(data.message);
      // Mostra dialog con messaggio per copia manuale
      setShowMessageDialog(true);
      toast({ title: "Messaggio generato!", description: "Copia dal dialog e incolla nel form" });
      // URL già aperto nel click handler (sincrono)
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile generare il messaggio", variant: "destructive" });
    },
  });

  const registerFormSentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acquisizione/${immobile.id}/register-form-sent`, {
        message: formMessageGenerated || "Messaggio inviato via form portale",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invio registrato", description: "Il contatto è stato salvato" });
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      setFormMessageGenerated(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile registrare l'invio", variant: "destructive" });
    },
  });

  const togglePreferitoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acquisizione/${immobile.id}/toggle-preferito`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
    },
  });

  const copyPhone = () => {
    if (immobile.contattoTelefono) {
      // Fallback clipboard per compatibilità
      const textArea = document.createElement("textarea");
      textArea.value = immobile.contattoTelefono;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Telefono copiato" });
    }
  };

  const statoColors: Record<string, string> = {
    nuovo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    contattato: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    interessato: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    scartato: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  const getStatoLabel = () => {
    if (immobile.statoNuovo) return "Nuovo";
    if (immobile.statoRistrutturato) return "Ristrutturato";
    if (immobile.statoBuono) return "Buono Stato";
    if (immobile.statoDaRistrutturare) return "Da Ristrutturare";
    return null;
  };

  const features = [];
  if (immobile.ascensore) features.push("Ascensore");
  if (immobile.balcone) features.push("Balcone");
  if (immobile.terrazzo) features.push("Terrazzo");
  if (immobile.box) features.push("Box");
  if (immobile.cantina) features.push("Cantina");
  if (immobile.giardino) features.push("Giardino");
  if (immobile.arredato) features.push("Arredato");

  // Determina il tipo di contatto: telefono (WhatsApp) o solo form
  const hasPhone = !!immobile.contattoTelefono;
  const cardBorderClass = hasPhone 
    ? "border-l-4 border-l-green-500" // Verde per WhatsApp
    : "border-l-4 border-l-blue-500"; // Blu per Form

  return (
    <Card className={`relative hover-elevate ${cardBorderClass}`} data-testid={`card-immobile-esterno-${immobile.id}`}>
      <div className="aspect-video bg-muted flex items-center justify-center">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium line-clamp-2" data-testid={`text-property-title-${immobile.id}`}>
                {immobile.titolo}
              </h3>
              {immobile.idWeb && (
                <Badge variant="outline" className="text-xs font-mono" data-testid={`badge-id-web-${immobile.id}`}>
                  {immobile.idWeb}
                </Badge>
              )}
            </div>
            {(immobile.zona || immobile.citta || immobile.indirizzo) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {[immobile.zona, immobile.citta].filter(Boolean).join(", ") || immobile.indirizzo}
                </span>
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => togglePreferitoMutation.mutate()}
            disabled={togglePreferitoMutation.isPending}
            data-testid={`button-toggle-preferito-${immobile.id}`}
          >
            {immobile.preferito ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold" data-testid={`text-property-price-${immobile.id}`}>
            {immobile.prezzo 
              ? `€${Number(immobile.prezzo).toLocaleString('it-IT')}` 
              : "Prezzo N/D"}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {immobile.mq && (
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {immobile.mq} mq
            </span>
          )}
          {immobile.camere && (
            <span className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              {immobile.camere} cam.
            </span>
          )}
          {immobile.bagni && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {immobile.bagni} bagni
            </span>
          )}
          {immobile.piano !== null && immobile.piano !== undefined && (
            <span className="flex items-center gap-1">
              Piano {immobile.piano}{immobile.pianiEdificio ? `/${immobile.pianiEdificio}` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge className={statoColors[immobile.statoContatto || 'nuovo']}>
            {immobile.statoContatto || 'nuovo'}
          </Badge>
          {immobile.multiAgenzia && (
            <Badge className="bg-orange-500 text-white" data-testid={`badge-multi-agenzia-${immobile.id}`}>
              MULTI-AGENZIA
            </Badge>
          )}
          {getStatoLabel() && (
            <Badge variant="secondary">{getStatoLabel()}</Badge>
          )}
          {immobile.classeEnergetica && (
            <Badge variant="outline">Classe {immobile.classeEnergetica}</Badge>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        )}

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {immobile.descrizione && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descrizione</p>
                <p className="text-sm">{immobile.descrizione}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              {immobile.speseCondominiali && (
                <div>
                  <span className="text-muted-foreground">Spese cond.: </span>
                  <span className="font-medium">€{immobile.speseCondominiali}/mese</span>
                </div>
              )}
              {immobile.riscaldamento && (
                <div>
                  <span className="text-muted-foreground">Riscaldamento: </span>
                  <span className="font-medium">{immobile.riscaldamento}</span>
                </div>
              )}
              {immobile.esposizione && (
                <div>
                  <span className="text-muted-foreground">Esposizione: </span>
                  <span className="font-medium">{immobile.esposizione}</span>
                </div>
              )}
              {immobile.annoCostruzione && (
                <div>
                  <span className="text-muted-foreground">Anno: </span>
                  <span className="font-medium">{immobile.annoCostruzione}</span>
                </div>
              )}
              {immobile.riferimentoAnnuncio && (
                <div>
                  <span className="text-muted-foreground">Rif: </span>
                  <span className="font-medium font-mono text-xs">{immobile.riferimentoAnnuncio}</span>
                </div>
              )}
            </div>

            {(immobile.contattoNome || immobile.contattoTelefono || immobile.contattoEmail) && (
              <div className="p-3 bg-muted rounded-md space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Contatto</p>
                {immobile.contattoNome && (
                  <p className="font-medium">{immobile.contattoNome}</p>
                )}
                {immobile.contattoTelefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${immobile.contattoTelefono}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {immobile.contattoTelefono}
                    </a>
                    <Button size="icon" variant="ghost" onClick={copyPhone}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                {immobile.contattoEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{immobile.contattoEmail}</span>
                  </div>
                )}
              </div>
            )}

            {immobile.fonte && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>{immobile.fonte}</span>
                {immobile.urlAnnuncio && (
                  <a 
                    href={immobile.urlAnnuncio} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-auto text-primary hover:underline flex items-center gap-1"
                  >
                    Vedi annuncio <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-0 pb-4 px-4 flex-wrap">
        <Link href={`/acquisizione/${immobile.id}`}>
          <Button 
            variant="default" 
            size="sm"
            data-testid={`button-view-${immobile.id}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            Vedi Scheda
          </Button>
        </Link>
        {immobile.urlAnnuncio && (
          <a 
            href={immobile.urlAnnuncio} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button 
              variant="outline" 
              size="sm"
              data-testid={`button-link-${immobile.id}`}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Annuncio
            </Button>
          </a>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-${immobile.id}`}
        >
          {expanded ? "Meno" : "Altro"}
        </Button>
        {hasPhone ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onGenerateMessage(immobile.id)}
            data-testid={`button-generate-message-${immobile.id}`}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Messaggio
          </Button>
        ) : (
          <>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                generateFormMessageMutation.mutate();
              }}
              disabled={generateFormMessageMutation.isPending}
              title="Genera messaggio"
              data-testid={`button-form-message-${immobile.id}`}
            >
              {generateFormMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileEdit className="h-4 w-4 text-blue-600" />
              )}
            </Button>
            {formMessageGenerated && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => registerFormSentMutation.mutate()}
                disabled={registerFormSentMutation.isPending}
                title="Registra invio"
                data-testid={`button-register-form-${immobile.id}`}
              >
                {registerFormSentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 text-green-600" />
                )}
              </Button>
            )}
          </>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onDelete(immobile.id)}
          data-testid={`button-delete-immobile-${immobile.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>

      {/* Dialog per mostrare e copiare il messaggio generato */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Messaggio Generato</DialogTitle>
            <DialogDescription>
              Seleziona tutto il testo e copialo (Ctrl+C), poi incollalo nel form del portale
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <textarea
              readOnly
              value={formMessageGenerated || ""}
              className="w-full h-48 p-3 text-sm border rounded-md bg-muted font-mono"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              data-testid="textarea-generated-message"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {formMessageGenerated?.length || 0} caratteri
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (formMessageGenerated) {
                  const textArea = document.createElement("textarea");
                  textArea.value = formMessageGenerated;
                  textArea.style.position = "fixed";
                  textArea.style.left = "-999999px";
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                  toast({ title: "Copiato!" });
                }
              }}
              data-testid="button-copy-message-dialog"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copia
            </Button>
            <Button onClick={() => setShowMessageDialog(false)} data-testid="button-close-message-dialog">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function AcquisizionePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("daInviare");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [selectedImmobileId, setSelectedImmobileId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [messageCopied, setMessageCopied] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  const { data: immobili = [], isLoading } = useQuery<ImmobileEsterno[]>({
    queryKey: ["/api/acquisizione"],
  });

  // Divide in Da Inviare (no messaggio) e Inviati (messaggio inviato)
  const daInviare = immobili.filter(i => !i.messaggioInviato && i.statoContatto !== 'contattato');
  const inviati = immobili.filter(i => i.messaggioInviato || i.statoContatto === 'contattato');
  const preferiti = immobili.filter(i => i.preferito);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/acquisizione/${id}`, undefined);
    },
    onSuccess: () => {
      toast({ title: "Immobile eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      setDeletingId(null);
    },
  });

  const generateMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/acquisizione/${id}/generate-message`, {});
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      setGeneratedMessage(data.message);
    },
    onError: () => {
      setMessageDialogOpen(false);
      toast({
        title: "Errore",
        description: "Impossibile generare il messaggio",
        variant: "destructive",
      });
    },
  });

  const handleGenerateMessage = (id: number) => {
    setSelectedImmobileId(id);
    setGeneratedMessage("");
    setMessageDialogOpen(true);
    generateMessageMutation.mutate(id);
  };

  const copyMessage = () => {
    // Fallback clipboard per compatibilità
    const textArea = document.createElement("textarea");
    textArea.value = generatedMessage;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
    toast({ title: "Messaggio copiato" });
  };

  const sendWhatsappMessage = async () => {
    if (!selectedImmobileId || !generatedMessage) return;
    
    const immobile = immobili.find(i => i.id === selectedImmobileId);
    if (!immobile?.contattoTelefono) {
      toast({
        title: "Telefono mancante",
        description: "Inserisci il numero di telefono per inviare il messaggio",
        variant: "destructive",
      });
      return;
    }

    setSendingWhatsapp(true);
    try {
      const res = await apiRequest("POST", `/api/acquisizione/${selectedImmobileId}/send-whatsapp`, {
        message: generatedMessage,
        phone: immobile.contattoTelefono,
      });
      const result = await res.json();
      
      if (result.success) {
        toast({ 
          title: "Messaggio inviato", 
          description: `WhatsApp inviato a ${immobile.contattoTelefono}` 
        });
        setMessageDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
        queryClient.invalidateQueries({ queryKey: ["/api/comunicazioni"] });
        setActiveTab("inviati");
      } else {
        throw new Error(result.error || "Invio fallito");
      }
    } catch (error: any) {
      toast({
        title: "Errore invio",
        description: error.message || "Impossibile inviare il messaggio WhatsApp",
        variant: "destructive",
      });
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const displayedImmobili = activeTab === "preferiti" ? preferiti : activeTab === "inviati" ? inviati : daInviare;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-acquisizione-title">Acquisizione</h1>
          <p className="text-muted-foreground">
            Analizza annunci di privati e genera messaggi personalizzati
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/acquisizione/url">
            <Button data-testid="button-acquisisci-url">
              <Link2 className="h-4 w-4 mr-2" />
              Da URL (iPad)
            </Button>
          </Link>
          <Button variant="outline" asChild data-testid="button-search-immobiliare">
            <a
              href="https://www.immobiliare.it/vendita-case/milano/da-privati/?utm_source=chatgpt.com"
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ricerca immobiliare.it
            </a>
          </Button>
          <Button variant="outline" asChild data-testid="button-search-idealista">
            <a
              href="https://www.idealista.it/vendita-case/milano-milano/?ordine=da-privati-asc&utm_source=chatgpt.com"
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ricerca idealista.it
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="daInviare" data-testid="tab-da-inviare">
            Da Inviare ({daInviare.length})
          </TabsTrigger>
          <TabsTrigger value="inviati" data-testid="tab-inviati">
            <Check className="h-4 w-4 mr-1" />
            Inviati ({inviati.length})
          </TabsTrigger>
          <TabsTrigger value="preferiti" data-testid="tab-preferiti">
            <Star className="h-4 w-4 mr-1" />
            Preferiti ({preferiti.length})
          </TabsTrigger>
          <TabsTrigger value="nuovo" data-testid="tab-nuovo">
            <Plus className="h-4 w-4 mr-1" />
            Nuovo
          </TabsTrigger>
          <TabsTrigger value="statistiche" data-testid="tab-statistiche">
            <BarChart3 className="h-4 w-4 mr-1" />
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">
            <Bot className="h-4 w-4 mr-1" />
            Report AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daInviare" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : daInviare.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nessun annuncio da inviare</h3>
                <p className="text-muted-foreground text-center mt-1">
                  Aggiungi un annuncio per generare il messaggio
                </p>
                <Button className="mt-4" onClick={() => setActiveTab("nuovo")} data-testid="button-add-annuncio-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Annuncio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {daInviare.map((immobile: ImmobileEsterno) => (
                <ImmobileEsternoCard
                  key={immobile.id}
                  immobile={immobile}
                  onGenerateMessage={handleGenerateMessage}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inviati" className="mt-6">
          {inviati.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Check className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nessun messaggio inviato</h3>
                <p className="text-muted-foreground text-center mt-1">
                  I messaggi inviati appariranno qui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inviati.map((immobile: ImmobileEsterno) => (
                <ImmobileEsternoCard
                  key={immobile.id}
                  immobile={immobile}
                  onGenerateMessage={handleGenerateMessage}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preferiti" className="mt-6">
          {preferiti.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Star className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nessun preferito</h3>
                <p className="text-muted-foreground text-center mt-1">
                  Aggiungi immobili ai preferiti per contattare i proprietari
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preferiti.map((immobile: ImmobileEsterno) => (
                <ImmobileEsternoCard
                  key={immobile.id}
                  immobile={immobile}
                  onGenerateMessage={handleGenerateMessage}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nuovo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Analizza Annuncio
              </CardTitle>
              <CardDescription>
                Incolla il testo di un annuncio immobiliare e l'AI estrarrà automaticamente tutti i dati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParseAnnuncioForm onSuccess={() => setActiveTab("daInviare")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistiche" className="mt-6">
          <StatisticsTab />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <AIReportTab />
        </TabsContent>
      </Tabs>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Messaggio per il proprietario</DialogTitle>
          </DialogHeader>
          
          {generateMessageMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Generazione messaggio con mirroring...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Messaggio generato con frasi di mirroring dall'annuncio. Puoi modificarlo prima di copiarlo.
              </p>
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="min-h-[200px]"
                data-testid="textarea-generated-message"
              />
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)} data-testid="button-close-message-dialog">
              Chiudi
            </Button>
            <Button variant="secondary" onClick={copyMessage} disabled={!generatedMessage} data-testid="button-copy-message">
              {messageCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copia
                </>
              )}
            </Button>
            <Button 
              onClick={sendWhatsappMessage} 
              disabled={!generatedMessage || sendingWhatsapp}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-send-whatsapp"
            >
              {sendingWhatsapp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo immobile?</AlertDialogTitle>
            <AlertDialogDescription>
              L'immobile verrà rimosso definitivamente dalla lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
