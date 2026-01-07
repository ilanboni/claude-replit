import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Bot, 
  Send, 
  MessageCircle, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  Play,
  Pause,
  Eye,
  RefreshCw,
  User,
  X,
  FileText,
  Target,
  Settings,
  Loader2
} from "lucide-react";
import type { WhatsappCampaign, CampaignMessage, ImmobileEsterno } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PropertyContext {
  titolo: string;
  testoAnnuncio: string;
  proprietario: string;
}

export default function BotPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("acquisizione");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsappCampaign | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([]);
  const [aiInputMessage, setAiInputMessage] = useState("");
  const [propertyContext, setPropertyContext] = useState<PropertyContext>({
    titolo: "Trilocale luminoso zona Navigli",
    testoAnnuncio: `VENDESI TRILOCALE LUMINOSO ZONA NAVIGLI

Splendido appartamento di 85 mq in via Corsico 15, a due passi dai Navigli. L'immobile, posto al terzo piano con ascensore, è composto da: ingresso, soggiorno con cucina a vista, due camere da letto, bagno finestrato e ripostiglio.

Caratteristiche principali:
- Doppia esposizione est/ovest
- Parquet in tutte le stanze
- Aria condizionata
- Cantina di pertinenza
- Classe energetica C

L'appartamento è stato ristrutturato nel 2019 con materiali di pregio. Ideale per giovani coppie o piccole famiglie. NO AGENZIE.

Prezzo: EUR 320.000 trattabili
Contatto: Mario Rossi - 333 1234567`,
    proprietario: "Mario Rossi"
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery<WhatsappCampaign[]>({
    queryKey: ["/api/whatsapp-campaigns"],
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<CampaignMessage[]>({
    queryKey: ["/api/campaign-messages"],
    queryFn: async () => {
      const res = await fetch("/api/campaign-messages?hasResponse=true");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: properties = [] } = useQuery<ImmobileEsterno[]>({
    queryKey: ["/api/acquisizione"],
    queryFn: async () => {
      const res = await fetch("/api/acquisizione?withPhone=true");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async (data: { message: string; history: ChatMessage[]; property: PropertyContext }) => {
      const res = await apiRequest("POST", "/api/bot/simulate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }]);
    }
  });

  const startCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await apiRequest("POST", `/api/whatsapp-campaigns/${campaignId}/start`, {});
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore nell'avvio della campagna");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-messages"] });
      toast({
        title: "Campagna avviata",
        description: `Inviati ${data.sent} messaggi su ${data.total}${data.failed > 0 ? ` (${data.failed} falliti)` : ""}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile avviare la campagna",
        variant: "destructive"
      });
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: { name: string; propertyIds: number[] }) => {
      const res = await apiRequest("POST", "/api/whatsapp-campaigns/create-with-recipients", data);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Errore nella creazione della campagna");
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-messages"] });
      setShowNewCampaignDialog(false);
      setNewCampaignName("");
      setSelectedProperties([]);
      toast({
        title: "Campagna creata",
        description: `Campagna "${data.campaign.name}" creata con ${data.recipientsAdded} destinatari`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare la campagna",
        variant: "destructive"
      });
    }
  });

  const sendAutomaticMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whatsapp-campaigns/send-automatic", {});
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Errore nell'invio automatico");
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-campaigns"] });
      toast({
        title: "Messaggi inviati",
        description: `Inviati ${data.sent} messaggi su ${data.total}${data.failed > 0 ? ` (${data.failed} falliti)` : ""}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare i messaggi",
        variant: "destructive"
      });
    }
  });

  const generateInitialMessageMutation = useMutation({
    mutationFn: async (data: { testoAnnuncio: string; titolo: string }) => {
      const res = await apiRequest("POST", "/api/bot/generate-initial-message", data);
      return res.json();
    },
    onSuccess: (data) => {
      setIsSimulating(true);
      setChatMessages([{
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }]);
    }
  });

  const aiChatMutation = useMutation({
    mutationFn: async (data: { message: string; campaignContext: string; history: ChatMessage[] }) => {
      const res = await apiRequest("POST", "/api/ai/campaign-assistant", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAiChatMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }]);
    }
  });

  const handleAiSendMessage = () => {
    if (!aiInputMessage.trim() || aiChatMutation.isPending || !selectedCampaign) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: aiInputMessage.trim(),
      timestamp: new Date()
    };

    setAiChatMessages(prev => [...prev, userMessage]);
    setAiInputMessage("");

    const campaignContext = `
CAMPAGNA: ${selectedCampaign.name}
TEMPLATE MESSAGGIO: ${selectedCampaign.template}
ISTRUZIONI: ${selectedCampaign.instructions || 'Nessuna'}
GESTIONE OBIEZIONI: ${JSON.stringify(selectedCampaign.objectionHandling || {}, null, 2)}
    `.trim();

    aiChatMutation.mutate({
      message: aiInputMessage.trim(),
      campaignContext,
      history: aiChatMessages
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const propertiesWithPhone = properties.filter(p => p.contattoTelefono && p.contattoTelefono !== "non disponibile");
  const propertiesToContact = propertiesWithPhone.filter(p => p.statoContatto !== "contattato");

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const activeConversations = conversations.filter(c => c.conversationActive);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || simulateMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    simulateMutation.mutate({
      message: inputMessage.trim(),
      history: chatMessages,
      property: propertyContext
    });
  };

  const handleStartSimulation = () => {
    // Generate initial message with AI mirroring
    generateInitialMessageMutation.mutate({
      testoAnnuncio: propertyContext.testoAnnuncio,
      titolo: propertyContext.titolo
    });
  };

  const handleResetSimulation = () => {
    setChatMessages([]);
    setIsSimulating(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Attiva</Badge>;
      case "paused":
        return <Badge variant="secondary">In Pausa</Badge>;
      case "completed":
        return <Badge variant="outline">Completata</Badge>;
      case "draft":
        return <Badge variant="outline">Bozza</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMessageStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="secondary"><Send className="w-3 h-3 mr-1" />Inviato</Badge>;
      case "delivered":
        return <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Consegnato</Badge>;
      case "read":
        return <Badge variant="default"><Eye className="w-3 h-3 mr-1" />Letto</Badge>;
      case "responded":
        return <Badge className="bg-green-600"><MessageCircle className="w-3 h-3 mr-1" />Risposta</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Errore</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />In attesa</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Bot WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Gestione messaggi automatici e conversazioni con i proprietari
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-campagne-attive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campagne Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-campagne-attive">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-conversazioni-attive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversazioni Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversazioni-attive">{activeConversations.length}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-proprietari-contattabili">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proprietari Contattabili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-proprietari-contattabili">{propertiesWithPhone.length}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-risposte-totali">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risposte Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-risposte-totali">{conversations.filter(c => c.response).length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="acquisizione" className="gap-2" data-testid="tab-acquisizione">
            <Send className="h-4 w-4" />
            Messaggi Acquisizione
          </TabsTrigger>
          <TabsTrigger value="conversazioni" className="gap-2" data-testid="tab-conversazioni">
            <MessageCircle className="h-4 w-4" />
            Risposte Clienti
          </TabsTrigger>
          <TabsTrigger value="simulatore" className="gap-2" data-testid="tab-simulatore">
            <Bot className="h-4 w-4" />
            Simulatore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acquisizione" className="space-y-4">
          {/* Main Action Card - Automatic Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Invia Messaggi Acquisizione</CardTitle>
              <CardDescription>
                Invia automaticamente messaggi personalizzati a tutti i proprietari con telefono dalla sezione Acquisizione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{propertiesWithPhone.length}</div>
                  <div className="text-sm text-muted-foreground">Totale con telefono</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{propertiesToContact.length}</div>
                  <div className="text-sm text-muted-foreground">Da contattare</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{propertiesWithPhone.length - propertiesToContact.length}</div>
                  <div className="text-sm text-muted-foreground">Gia contattati</div>
                </div>
              </div>

              {/* Action Button */}
              {propertiesToContact.length > 0 ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <Button
                    size="lg"
                    onClick={() => sendAutomaticMutation.mutate()}
                    disabled={sendAutomaticMutation.isPending}
                    className="w-full max-w-md"
                    data-testid="button-avvia-campagna-automatica"
                  >
                    {sendAutomaticMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Invia Messaggi a {propertiesToContact.length} Proprietari
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    I messaggi verranno personalizzati con indirizzo e caratteristiche di ogni immobile
                  </p>
                </div>
              ) : propertiesWithPhone.length > 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">Tutti i proprietari sono stati contattati</p>
                  <p className="text-sm">Importa nuovi immobili dalla sezione Acquisizione per continuare</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nessun immobile con telefono</p>
                  <p className="text-sm">Importa immobili con numero di telefono dalla sezione Acquisizione</p>
                </div>
              )}

              {/* Preview of properties to contact */}
              {propertiesToContact.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Anteprima destinatari:</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {propertiesToContact.slice(0, 20).map((property) => (
                        <div
                          key={property.id}
                          className="flex items-center justify-between p-3 border rounded-lg text-sm"
                          data-testid={`property-to-contact-${property.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{property.titolo}</p>
                            <p className="text-muted-foreground text-xs">
                              {property.indirizzo} - {property.contattoTelefono}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 ml-2">
                            {property.mq ? `${property.mq} mq` : ""}
                          </Badge>
                        </div>
                      ))}
                      {propertiesToContact.length > 20 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{propertiesToContact.length - 20} altri immobili
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign History */}
          {campaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Storico Campagne</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-3 border rounded-lg text-sm"
                        data-testid={`campaign-row-${campaign.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{campaign.name}</span>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{campaign.sentCount || 0} inviati</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedCampaign(campaign)}
                            data-testid={`button-view-campaign-${campaign.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversazioni" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversazioni con Proprietari</CardTitle>
              <CardDescription>
                Storico delle risposte ricevute e conversazioni gestite dal bot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConversations ? (
                <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nessuna conversazione ancora</p>
                    <p className="text-sm text-muted-foreground">
                      Le risposte ai messaggi di acquisizione appariranno qui
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {conversations.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 border rounded-lg space-y-2"
                        data-testid={`conversation-row-${message.id}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{message.ownerName || "Proprietario"}</span>
                            <span className="text-muted-foreground">{message.phoneNumber}</span>
                            {getMessageStatusBadge(message.status)}
                            {message.conversationActive && (
                              <Badge variant="default" className="bg-blue-600">
                                <Bot className="w-3 h-3 mr-1" />
                                Bot Attivo
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline" data-testid={`button-view-conversation-${message.id}`}>
                            Vedi Chat
                          </Button>
                        </div>
                        {message.response && (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <p className="text-sm font-medium mb-1">Ultima risposta:</p>
                            <p className="text-sm">{message.response}</p>
                          </div>
                        )}
                        {message.lastBotMessage && (
                          <div className="p-3 bg-primary/5 rounded-md">
                            <p className="text-sm font-medium mb-1 flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              Risposta Bot:
                            </p>
                            <p className="text-sm">{message.lastBotMessage}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulatore" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Contesto Immobile</CardTitle>
                <CardDescription>
                  Configura i dettagli dell'immobile per la simulazione
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titolo Annuncio</label>
                  <Input
                    value={propertyContext.titolo}
                    onChange={(e) => setPropertyContext(prev => ({ ...prev, titolo: e.target.value }))}
                    placeholder="es. Trilocale luminoso zona Navigli"
                    data-testid="input-titolo-simulazione"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Proprietario</label>
                  <Input
                    value={propertyContext.proprietario}
                    onChange={(e) => setPropertyContext(prev => ({ ...prev, proprietario: e.target.value }))}
                    placeholder="es. Mario Rossi"
                    data-testid="input-proprietario-simulazione"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Testo Completo Annuncio</label>
                  <Textarea
                    value={propertyContext.testoAnnuncio}
                    onChange={(e) => setPropertyContext(prev => ({ ...prev, testoAnnuncio: e.target.value }))}
                    placeholder="Incolla qui il testo completo dell'annuncio del proprietario..."
                    className="min-h-[200px] text-sm"
                    data-testid="input-testo-annuncio-simulazione"
                  />
                  <p className="text-xs text-muted-foreground">
                    Il bot usera questo testo per fare mirroring delle parole del proprietario
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  {!isSimulating ? (
                    <Button 
                      onClick={handleStartSimulation} 
                      className="flex-1" 
                      disabled={generateInitialMessageMutation.isPending}
                      data-testid="button-avvia-simulazione"
                    >
                      {generateInitialMessageMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generazione mirroring...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Avvia Simulazione
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handleResetSimulation} variant="outline" className="flex-1" data-testid="button-reset-simulazione">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Nuova Simulazione
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Chat Simulazione
                </CardTitle>
                <CardDescription>
                  Scrivi come se fossi un proprietario e vedi le risposte del bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Bot className="h-12 w-12 mb-4" />
                      <p className="font-medium">Simulatore Conversazione</p>
                      <p className="text-sm">
                        Configura l'immobile e avvia la simulazione per testare il bot
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                            data-testid={`chat-message-${index}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {msg.role === "assistant" ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                              <span className="text-xs font-medium">
                                {msg.role === "assistant" ? "Dott. Boni" : "Proprietario"}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {simulateMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 animate-pulse" />
                              <span className="text-sm text-muted-foreground">Sta scrivendo...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </ScrollArea>
                {isSimulating && (
                  <div className="flex gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Scrivi come se fossi il proprietario..."
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-messaggio-simulazione"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || simulateMutation.isPending}
                      size="icon"
                      className="h-[60px]"
                      data-testid="button-invia-messaggio-simulazione"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Dettagli Campagna */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {selectedCampaign?.name}
            </DialogTitle>
            <DialogDescription>
              Dettagli e configurazione della campagna
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              <div className="space-y-6">
                {/* Statistiche */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{selectedCampaign.totalTargets || 0}</div>
                      <div className="text-xs text-muted-foreground">Destinatari</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{selectedCampaign.sentCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Inviati</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{selectedCampaign.respondedCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Risposte</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{selectedCampaign.convertedCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Convertiti</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Template Messaggio */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Template Messaggio Iniziale
                  </h3>
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {selectedCampaign.template}
                  </div>
                </div>

                {/* Istruzioni Bot */}
                {selectedCampaign.instructions && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Istruzioni per il Bot
                    </h3>
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {selectedCampaign.instructions}
                    </div>
                  </div>
                )}

                {/* Gestione Obiezioni */}
                {selectedCampaign.objectionHandling && Object.keys(selectedCampaign.objectionHandling).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Gestione Obiezioni ({Object.keys(selectedCampaign.objectionHandling).length})
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(selectedCampaign.objectionHandling).map(([key, handler]: [string, any]) => (
                        <div key={key} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-1">{key.replace(/_/g, ' ').toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Trigger: {handler.triggers?.join(', ')}
                          </div>
                          <div className="text-sm bg-muted p-2 rounded">
                            {handler.responses?.[0]?.substring(0, 200)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Template */}
                {selectedCampaign.followUpTemplate && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Template Follow-up (dopo {selectedCampaign.followUpDelayDays || 3} giorni)
                    </h3>
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedCampaign.followUpTemplate}
                    </div>
                  </div>
                )}

                {/* Chat con AI per migliorare la campagna */}
                <div className="space-y-2 border-t pt-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Assistente AI - Migliora la Campagna
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Chiedi suggerimenti per migliorare template, istruzioni o gestione obiezioni
                  </p>
                  
                  {/* Chat messages */}
                  <div className="bg-muted/50 rounded-lg p-3 min-h-[150px] max-h-[250px] overflow-y-auto space-y-3">
                    {aiChatMessages.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Scrivi una domanda per migliorare la campagna...
                      </div>
                    ) : (
                      aiChatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-lg text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background border"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        </div>
                      ))
                    )}
                    {aiChatMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-background border p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 animate-pulse" />
                            <span className="text-sm text-muted-foreground">Sta pensando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      value={aiInputMessage}
                      onChange={(e) => setAiInputMessage(e.target.value)}
                      placeholder="Es: Come posso migliorare il template? Aggiungi un'obiezione per..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAiSendMessage();
                        }
                      }}
                      data-testid="input-ai-campaign-chat"
                    />
                    <Button
                      onClick={handleAiSendMessage}
                      disabled={!aiInputMessage.trim() || aiChatMutation.isPending}
                      size="icon"
                      data-testid="button-send-ai-campaign"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nuova Campagna */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova Campagna di Acquisizione</DialogTitle>
            <DialogDescription>
              Crea una campagna per contattare proprietari privati con messaggi WhatsApp automatici
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome campagna</label>
              <Input
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Es: Acquisizione zona Navigli - Gennaio 2026"
                data-testid="input-nome-campagna"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona destinatari</label>
              <p className="text-sm text-muted-foreground">
                Scegli gli immobili dai quali inviare messaggi ai proprietari
              </p>
              
              {propertiesWithPhone.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessun immobile con telefono disponibile</p>
                  <p className="text-xs">Importa immobili con numero di telefono dalla sezione Acquisizione</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] border rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <span className="text-sm text-muted-foreground">
                        {selectedProperties.length} selezionati su {propertiesWithPhone.length}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (selectedProperties.length === propertiesWithPhone.length) {
                            setSelectedProperties([]);
                          } else {
                            setSelectedProperties(propertiesWithPhone.map(p => p.id));
                          }
                        }}
                        data-testid="button-seleziona-tutti"
                      >
                        {selectedProperties.length === propertiesWithPhone.length ? "Deseleziona tutti" : "Seleziona tutti"}
                      </Button>
                    </div>
                    {propertiesWithPhone.map((property) => (
                      <div
                        key={property.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover-elevate ${
                          selectedProperties.includes(property.id) ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => {
                          setSelectedProperties(prev => 
                            prev.includes(property.id) 
                              ? prev.filter(id => id !== property.id)
                              : [...prev, property.id]
                          );
                        }}
                        data-testid={`property-select-${property.id}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedProperties.includes(property.id) 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedProperties.includes(property.id) && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{property.titolo}</div>
                          <div className="text-sm text-muted-foreground">{property.indirizzo}</div>
                          <div className="text-xs text-muted-foreground">
                            {property.contattoNome || "Proprietario"} - {property.contattoTelefono}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {property.prezzo ? `${Number(property.prezzo).toLocaleString('it-IT')}` : "N/D"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewCampaignDialog(false);
                  setNewCampaignName("");
                  setSelectedProperties([]);
                }}
                data-testid="button-annulla-campagna"
              >
                Annulla
              </Button>
              <Button
                onClick={() => {
                  createCampaignMutation.mutate({
                    name: newCampaignName || `Campagna ${new Date().toLocaleDateString('it-IT')}`,
                    propertyIds: selectedProperties
                  });
                }}
                disabled={selectedProperties.length === 0 || createCampaignMutation.isPending}
                data-testid="button-crea-campagna"
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Campagna ({selectedProperties.length} destinatari)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
