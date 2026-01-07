import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
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
  MoreVertical
} from "lucide-react";
import type { WhatsappConversation, WhatsappMessage, Cliente } from "@shared/schema";

export default function WhatsAppPage() {
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<WhatsappConversation[]>({
    queryKey: ["/api/whatsapp/conversations"],
    refetchInterval: 5000
  });

  const { data: conversationData, isLoading: loadingMessages } = useQuery<{ 
    conversation: WhatsappConversation; 
    messages: WhatsappMessage[] 
  }>({
    queryKey: ["/api/whatsapp/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
    refetchInterval: 3000
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

  const getConversationName = (conversation: WhatsappConversation) => {
    if (conversation.clienteId) {
      const cliente = clienti.find(c => c.id === conversation.clienteId);
      if (cliente) return `${cliente.nome} ${cliente.cognome}`;
    }
    return conversation.nome || `+${conversation.phoneNumber}`;
  };

  const getInitials = (conversation: WhatsappConversation) => {
    const name = getConversationName(conversation);
    if (name.startsWith("+")) return <Phone className="h-4 w-4" />;
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
            <Badge variant="secondary" className="ml-auto">
              {conversations.filter(c => (c.nonLetti ?? 0) > 0).length}
            </Badge>
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
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover-elevate ${
                  selectedConversationId === conversation.id ? "bg-accent" : ""
                }`}
                onClick={() => setSelectedConversationId(conversation.id)}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <Avatar>
                  <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {getInitials(conversation)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {getConversationName(conversation)}
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
                    {(conversation.nonLetti ?? 0) > 0 && (
                      <Badge className="bg-green-500 text-white shrink-0">
                        {conversation.nonLetti}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
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
              <Button size="icon" variant="ghost" data-testid="button-conversation-menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

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
