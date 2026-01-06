import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Eye
} from "lucide-react";
import type { WhatsappCampaign, CampaignMessage, ImmobileEsterno } from "@shared/schema";

export default function BotPage() {
  const [activeTab, setActiveTab] = useState("acquisizione");

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

  const propertiesWithPhone = properties.filter(p => p.contattoTelefono && p.contattoTelefono !== "non disponibile");

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const activeConversations = conversations.filter(c => c.conversationActive);

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campagne Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversazioni Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proprietari Contattabili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{propertiesWithPhone.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risposte Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter(c => c.response).length}</div>
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
        </TabsList>

        <TabsContent value="acquisizione" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Campagne di Acquisizione</CardTitle>
                <CardDescription>
                  Invia messaggi automatici ai proprietari privati per acquisire immobili
                </CardDescription>
              </div>
              <Button data-testid="button-nuova-campagna">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Campagna
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nessuna campagna ancora</p>
                    <p className="text-sm text-muted-foreground">
                      Crea una nuova campagna per iniziare a contattare i proprietari privati
                    </p>
                  </div>
                  <Button data-testid="button-crea-prima-campagna">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea la prima campagna
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                        data-testid={`campaign-row-${campaign.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{campaign.name}</span>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign.totalTargets || 0} destinatari
                            </span>
                            <span className="flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              {campaign.sentCount || 0} inviati
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {campaign.respondedCount || 0} risposte
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {campaign.status === "draft" && (
                            <Button size="sm" data-testid={`button-start-campaign-${campaign.id}`}>
                              <Play className="h-4 w-4 mr-1" />
                              Avvia
                            </Button>
                          )}
                          {campaign.status === "active" && (
                            <Button size="sm" variant="secondary" data-testid={`button-pause-campaign-${campaign.id}`}>
                              <Pause className="h-4 w-4 mr-1" />
                              Pausa
                            </Button>
                          )}
                          <Button size="sm" variant="outline" data-testid={`button-view-campaign-${campaign.id}`}>
                            Dettagli
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {propertiesWithPhone.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proprietari Contattabili</CardTitle>
                <CardDescription>
                  Immobili con numero di telefono disponibile per l'acquisizione
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {propertiesWithPhone.slice(0, 10).map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center justify-between p-3 border rounded-lg text-sm"
                        data-testid={`property-contactable-${property.id}`}
                      >
                        <div>
                          <p className="font-medium">{property.titolo}</p>
                          <p className="text-muted-foreground">
                            {property.contattoNome || "Privato"} - {property.contattoTelefono}
                          </p>
                        </div>
                        <Badge variant="outline">{property.statoContatto}</Badge>
                      </div>
                    ))}
                    {propertiesWithPhone.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        +{propertiesWithPhone.length - 10} altri immobili
                      </p>
                    )}
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
      </Tabs>
    </div>
  );
}
