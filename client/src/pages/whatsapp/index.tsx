import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Search,
  CheckCheck,
  Check,
  Clock,
  User,
  Home,
  MoreVertical,
  Wifi,
  WifiOff,
  Plus,
  X,
  RefreshCw,
  Bot,
  BotOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import type { WhatsappConversation, WhatsappMessage, Cliente } from "@shared/schema";

function useWhatsAppWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/whatsapp`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WhatsApp WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
          const convId = data.data?.conversationId;
          if (convId) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/whatsapp/conversations", convId] 
            });
          }
        } else if (data.type === "conversation_update") {
          queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
          const convId = data.data?.conversationId || data.data?.id;
          if (convId) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/whatsapp/conversations", convId] 
            });
          }
        }
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    };

    ws.onclose = () => {
      console.log("WhatsApp WebSocket disconnected");
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected };
}

export default function WhatsAppPage() {
  const { toast } = useToast();
  const { isConnected } = useWhatsAppWebSocket();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [phoneFromUrl, setPhoneFromUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const phone = params.get("phone");
    if (phone) {
      setPhoneFromUrl(phone);
      setLocation("/whatsapp", { replace: true });
    }
  }, [searchString, setLocation]);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<WhatsappConversation[]>({
    queryKey: ["/api/whatsapp/conversations"],
    refetchInterval: isConnected ? false : 5000
  });

  useEffect(() => {
    if (phoneFromUrl && !loadingConversations && !selectedConversationId) {
      const normalizedPhone = phoneFromUrl.replace(/\D/g, '');
      const matchingConv = conversations.find(c => {
        const convPhone = c.phoneNumber.replace(/\D/g, '');
        return convPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(convPhone) ||
               convPhone === normalizedPhone || convPhone === '39' + normalizedPhone ||
               normalizedPhone === '39' + convPhone;
      });
      if (matchingConv) {
        setSelectedConversationId(matchingConv.id);
      } else {
        // No existing conversation - open new chat dialog with pre-filled phone
        setNewPhoneNumber(phoneFromUrl);
        setNewChatOpen(true);
      }
      setPhoneFromUrl(null);
    }
  }, [phoneFromUrl, conversations, loadingConversations, selectedConversationId]);

  const { data: conversationData, isLoading: loadingMessages } = useQuery<{ 
    conversation: WhatsappConversation; 
    messages: WhatsappMessage[] 
  }>({
    queryKey: ["/api/whatsapp/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
    refetchInterval: isConnected ? false : 3000
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"]
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; content: string; clienteId?: number }) => {
      const res = await apiRequest("POST", "/api/whatsapp/send", data);
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations", selectedConversationId] });
      }
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile inviare il messaggio", variant: "destructive" });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const res = await apiRequest("POST", `/api/whatsapp/conversations/${conversationId}/read`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const res = await apiRequest("DELETE", `/api/whatsapp/conversations/${conversationId}`, {});
      return res.json();
    },
    onSuccess: () => {
      setSelectedConversationId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
      toast({
        title: "Chat eliminata",
        description: "La conversazione è stata eliminata con successo"
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la conversazione",
        variant: "destructive"
      });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whatsapp/sync", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations", selectedConversationId] });
      }
      toast({
        title: "Sincronizzazione completata",
        description: `${data.synced} nuovi messaggi sincronizzati`
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile sincronizzare i messaggi",
        variant: "destructive"
      });
    }
  });

  const toggleBotMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const res = await apiRequest("POST", `/api/whatsapp/conversations/${conversationId}/toggle-bot`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations", selectedConversationId] });
      }
      toast({
        title: data.botDisattivato ? "Bot disattivato" : "Bot attivato",
        description: data.botDisattivato 
          ? "Gestione manuale attiva - nessuna risposta automatica" 
          : "Risposte automatiche riattivate"
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile modificare lo stato del bot",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages]);

  useEffect(() => {
    if (selectedConversationId && conversationData?.conversation.nonLetti) {
      markReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId, conversationData?.conversation.nonLetti]);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const cliente = c.clienteId ? clienti.find(cl => cl.id === c.clienteId) : null;
    return (
      c.phoneNumber.includes(query) ||
      c.nome?.toLowerCase().includes(query) ||
      cliente?.nome?.toLowerCase().includes(query) ||
      cliente?.cognome?.toLowerCase().includes(query)
    );
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !conversationData?.conversation) return;
    
    sendMessageMutation.mutate({
      phoneNumber: conversationData.conversation.phoneNumber,
      content: messageText.trim(),
      clienteId: conversationData.conversation.clienteId || undefined
    });
  };

  const handleNewChat = () => {
    if (!newPhoneNumber.trim() || !newMessage.trim()) {
      toast({ title: "Errore", description: "Inserisci numero e messaggio", variant: "destructive" });
      return;
    }
    
    sendMessageMutation.mutate({
      phoneNumber: newPhoneNumber.trim(),
      content: newMessage.trim()
    }, {
      onSuccess: () => {
        setNewChatOpen(false);
        setNewPhoneNumber("");
        setNewMessage("");
        toast({ title: "Inviato", description: "Messaggio WhatsApp inviato" });
      }
    });
  };

  const getConversationName = (conversation: WhatsappConversation & { clienteNome?: string | null }) => {
    // Use clienteNome from backend if available (includes linked client name)
    if ((conversation as any).clienteNome) {
      return (conversation as any).clienteNome;
    }
    // Fallback: try to find client locally
    if (conversation.clienteId) {
      const cliente = clienti.find(c => c.id === conversation.clienteId);
      if (cliente) return `${cliente.nome} ${cliente.cognome}`;
    }
    return conversation.nome || `+${conversation.phoneNumber}`;
  };

  const getInitials = (conversation: WhatsappConversation) => {
    const name = getConversationName(conversation);
    if (name.startsWith("+")) return <Phone className="h-4 w-4" />;
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getMessageStatus = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "pending":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full" data-testid="page-whatsapp">
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold">WhatsApp</h2>
            <div className="ml-auto flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant="secondary">
                {conversations.filter(c => (c.nonLetti ?? 0) > 0).length}
              </Badge>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-sync"
                title="Sincronizza messaggi da WhatsApp"
              >
                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              </Button>
              <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-new-chat">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuova Chat WhatsApp</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Numero di telefono</label>
                      <Input
                        placeholder="Es: 3331234567 o +393331234567"
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value)}
                        data-testid="input-new-phone"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Messaggio</label>
                      <Input
                        placeholder="Scrivi il tuo messaggio..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleNewChat()}
                        data-testid="input-new-message"
                      />
                    </div>
                    <Button 
                      onClick={handleNewChat} 
                      className="w-full"
                      disabled={sendMessageMutation.isPending}
                      data-testid="button-send-new-chat"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Invia Messaggio
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca conversazioni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4 text-center text-muted-foreground">
              Caricamento...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nessuna conversazione
            </div>
          ) : (
            (() => {
              // Raggruppa conversazioni per clienteId (se presente)
              const grouped = new Map<string, typeof filteredConversations>();
              const ungrouped: typeof filteredConversations = [];
              
              filteredConversations.forEach(conv => {
                if (conv.clienteId) {
                  const key = `cliente-${conv.clienteId}`;
                  if (!grouped.has(key)) {
                    grouped.set(key, []);
                  }
                  grouped.get(key)!.push(conv);
                } else {
                  ungrouped.push(conv);
                }
              });

              // Ordina i gruppi per data più recente
              const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
                const aDate = Math.max(...a[1].map(c => new Date(c.ultimoMessaggioData || 0).getTime()));
                const bDate = Math.max(...b[1].map(c => new Date(c.ultimoMessaggioData || 0).getTime()));
                return bDate - aDate;
              });

              const renderConversation = (conversation: WhatsappConversation & { clienteNome?: string | null }, isSubItem = false) => {
                const hasUnread = (conversation.nonLetti ?? 0) > 0;
                return (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover-elevate ${
                      selectedConversationId === conversation.id 
                        ? "bg-accent" 
                        : hasUnread 
                          ? "bg-green-50 dark:bg-green-950/30" 
                          : ""
                    } ${isSubItem ? "pl-6 border-l-2 border-green-200 dark:border-green-800 ml-3" : ""}`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    data-testid={`conversation-item-${conversation.id}`}
                  >
                    <Avatar className={isSubItem ? "h-8 w-8" : ""}>
                      <AvatarFallback className={`bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ${isSubItem ? "text-xs" : ""}`}>
                        {isSubItem ? <Phone className="h-3 w-3" /> : getInitials(conversation)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-medium truncate ${isSubItem ? "text-sm" : ""}`}>
                          {isSubItem ? `+${conversation.phoneNumber}` : getConversationName(conversation)}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {conversation.ultimoMessaggioData && 
                            formatDistanceToNow(new Date(conversation.ultimoMessaggioData), { 
                              addSuffix: false, 
                              locale: it 
                            })
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground truncate">
                          {conversation.ultimoMessaggio || "Nessun messaggio"}
                        </span>
                        {hasUnread && (
                          <Badge className="bg-green-500 text-white shrink-0">
                            {conversation.nonLetti}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {sortedGroups.map(([key, convs]) => {
                    if (convs.length === 1) {
                      return renderConversation(convs[0]);
                    }
                    // Ordina per data più recente
                    const sorted = [...convs].sort((a, b) => 
                      new Date(b.ultimoMessaggioData || 0).getTime() - new Date(a.ultimoMessaggioData || 0).getTime()
                    );
                    const totalUnread = sorted.reduce((sum, c) => sum + (c.nonLetti ?? 0), 0);
                    const hasUnread = totalUnread > 0;
                    
                    return (
                      <div key={key} className={`${hasUnread ? "bg-green-50/50 dark:bg-green-950/20" : ""}`}>
                        {sorted.map((conv, idx) => renderConversation(conv, idx > 0))}
                      </div>
                    );
                  })}
                  {ungrouped.map(conv => renderConversation(conv))}
                </>
              );
            })()
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-muted/30">
        {selectedConversationId && conversationData ? (
          <>
            <div className="flex items-center gap-3 p-3 border-b bg-background">
              <Avatar>
                <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {getInitials(conversationData.conversation)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">
                  {getConversationName(conversationData.conversation)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  +{conversationData.conversation.phoneNumber}
                  {conversationData.conversation.clienteId && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <User className="h-3 w-3" />
                      Cliente collegato
                    </>
                  )}
                  {conversationData.conversation.immobileId && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <Home className="h-3 w-3" />
                      Immobile #{conversationData.conversation.immobileId}
                    </>
                  )}
                </div>
              </div>
              <Button 
                size="icon" 
                variant={conversationData.conversation.botDisattivato ? "destructive" : "default"}
                onClick={() => toggleBotMutation.mutate(selectedConversationId)}
                disabled={toggleBotMutation.isPending}
                title={conversationData.conversation.botDisattivato ? "Bot disattivato - clicca per riattivare" : "Bot attivo - clicca per disattivare"}
                data-testid="button-toggle-bot"
              >
                {conversationData.conversation.botDisattivato ? (
                  <BotOff className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-conversation-menu">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    data-testid="button-delete-conversation"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare questa chat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione eliminerà permanentemente tutti i messaggi della conversazione.
                    Non sarà possibile recuperarli.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      if (selectedConversationId) {
                        deleteConversationMutation.mutate(selectedConversationId);
                      }
                    }}
                    data-testid="button-confirm-delete"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-3xl mx-auto">
                {loadingMessages ? (
                  <div className="text-center text-muted-foreground py-8">
                    Caricamento messaggi...
                  </div>
                ) : conversationData.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nessun messaggio in questa conversazione
                  </div>
                ) : (
                  conversationData.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.direction === "outbound"
                            ? "bg-green-600 text-white"
                            : "bg-card border"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          message.direction === "outbound" ? "text-green-200" : "text-muted-foreground"
                        }`}>
                          <span className="text-xs">
                            {format(new Date(message.createdAt), "HH:mm", { locale: it })}
                          </span>
                          {message.direction === "outbound" && getMessageStatus(message.status || "pending")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t bg-background">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Input
                  placeholder="Scrivi un messaggio..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Seleziona una conversazione per iniziare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
