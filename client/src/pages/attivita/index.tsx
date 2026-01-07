import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  Phone,
  Building2,
  User,
  Calendar,
  MoreVertical,
  Check,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { AttivitaCliente, AttivitaImmobile } from "@shared/schema";

function StatoBadge({ stato }: { stato: string }) {
  const config = {
    da_fare: { label: "Da fare", variant: "destructive" as const, icon: AlertCircle },
    in_corso: { label: "In corso", variant: "secondary" as const, icon: Clock },
    fatto: { label: "Fatto", variant: "default" as const, icon: CheckCircle2 },
  };
  
  const { label, variant, icon: Icon } = config[stato as keyof typeof config] || config.da_fare;
  
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function AttivitaClienteCard({ 
  attivita, 
  onUpdateStato 
}: { 
  attivita: AttivitaCliente;
  onUpdateStato: (id: number, stato: string) => void;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-attivita-cliente-${attivita.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <Link href={`/clienti/${attivita.clienteId}`}>
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Cliente #{attivita.clienteId}
                </span>
              </Link>
              {attivita.fonte && (
                <Badge variant="outline" className="gap-1">
                  {attivita.fonte === "email" ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                  {attivita.fonte}
                </Badge>
              )}
            </div>
            <h4 className="font-medium text-sm">{attivita.titolo}</h4>
            {attivita.descrizione && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{attivita.descrizione}</p>
            )}
            {attivita.immobileId && (
              <div className="flex items-center gap-1 mt-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <Link href={`/immobili/${attivita.immobileId}`}>
                  <span className="text-xs text-primary hover:underline cursor-pointer">
                    Immobile #{attivita.immobileId}
                  </span>
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(attivita.createdAt), "d MMM yyyy, HH:mm", { locale: it })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatoBadge stato={attivita.stato || "da_fare"} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid={`button-attivita-menu-${attivita.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onUpdateStato(attivita.id, "in_corso")}
                  data-testid={`menu-in-corso-${attivita.id}`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Segna in corso
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateStato(attivita.id, "fatto")}
                  data-testid={`menu-fatto-${attivita.id}`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Segna completato
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateStato(attivita.id, "da_fare")}
                  data-testid={`menu-da-fare-${attivita.id}`}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Segna da fare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttivitaImmobileCard({ 
  attivita, 
  onUpdateStato 
}: { 
  attivita: AttivitaImmobile;
  onUpdateStato: (id: number, stato: string) => void;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-attivita-immobile-${attivita.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Link href={`/immobili/${attivita.immobileId}`}>
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Immobile #{attivita.immobileId}
                </span>
              </Link>
            </div>
            <h4 className="font-medium text-sm">{attivita.titolo}</h4>
            {attivita.descrizione && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{attivita.descrizione}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(attivita.createdAt), "d MMM yyyy, HH:mm", { locale: it })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatoBadge stato={attivita.stato || "da_fare"} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid={`button-immobile-menu-${attivita.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onUpdateStato(attivita.id, "in_corso")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Segna in corso
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateStato(attivita.id, "fatto")}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Segna completato
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateStato(attivita.id, "da_fare")}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Segna da fare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AttivitaPage() {
  const { toast } = useToast();
  
  const { data: attivitaClienti, isLoading: loadingClienti } = useQuery<AttivitaCliente[]>({
    queryKey: ["/api/attivita-cliente"],
  });
  
  const { data: attivitaImmobili, isLoading: loadingImmobili } = useQuery<AttivitaImmobile[]>({
    queryKey: ["/api/attivita-immobile"],
  });
  
  const updateClienteStato = useMutation({
    mutationFn: async ({ id, stato }: { id: number; stato: string }) => {
      return apiRequest("PATCH", `/api/attivita-cliente/${id}`, { stato });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-cliente"] });
      toast({ title: "Stato aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare lo stato", variant: "destructive" });
    },
  });
  
  const updateImmobileStato = useMutation({
    mutationFn: async ({ id, stato }: { id: number; stato: string }) => {
      return apiRequest("PATCH", `/api/attivita/${id}`, { stato });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-immobile"] });
      toast({ title: "Stato aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare lo stato", variant: "destructive" });
    },
  });
  
  const attivitaClienteDaFare = attivitaClienti?.filter(a => a.stato === "da_fare" || !a.stato) || [];
  const attivitaClienteInCorso = attivitaClienti?.filter(a => a.stato === "in_corso") || [];
  const attivitaClienteFatte = attivitaClienti?.filter(a => a.stato === "fatto") || [];
  
  const attivitaImmobileDaFare = attivitaImmobili?.filter(a => a.stato === "da_fare" || !a.stato) || [];
  const attivitaImmobileInCorso = attivitaImmobili?.filter(a => a.stato === "in_corso") || [];
  const attivitaImmobileFatte = attivitaImmobili?.filter(a => a.stato === "fatto") || [];
  
  const totalDaFare = attivitaClienteDaFare.length + attivitaImmobileDaFare.length;
  const totalInCorso = attivitaClienteInCorso.length + attivitaImmobileInCorso.length;
  const totalFatte = attivitaClienteFatte.length + attivitaImmobileFatte.length;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Attività</h1>
            <p className="text-muted-foreground">Gestisci le attività da completare</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {totalDaFare} da fare
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {totalInCorso} in corso
            </Badge>
            <Badge className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {totalFatte} completate
            </Badge>
          </div>
        </div>
        
        <Tabs defaultValue="clienti" className="w-full">
          <TabsList>
            <TabsTrigger value="clienti" data-testid="tab-clienti">
              <User className="h-4 w-4 mr-2" />
              Clienti ({attivitaClienti?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="immobili" data-testid="tab-immobili">
              <Building2 className="h-4 w-4 mr-2" />
              Immobili ({attivitaImmobili?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clienti" className="mt-4 space-y-4">
            {loadingClienti ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : attivitaClienti?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nessuna attività cliente</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {attivitaClienteDaFare.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Da fare ({attivitaClienteDaFare.length})
                    </h3>
                    {attivitaClienteDaFare.map(a => (
                      <AttivitaClienteCard 
                        key={a.id} 
                        attivita={a} 
                        onUpdateStato={(id, stato) => updateClienteStato.mutate({ id, stato })}
                      />
                    ))}
                  </div>
                )}
                
                {attivitaClienteInCorso.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      In corso ({attivitaClienteInCorso.length})
                    </h3>
                    {attivitaClienteInCorso.map(a => (
                      <AttivitaClienteCard 
                        key={a.id} 
                        attivita={a} 
                        onUpdateStato={(id, stato) => updateClienteStato.mutate({ id, stato })}
                      />
                    ))}
                  </div>
                )}
                
                {attivitaClienteFatte.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Completate ({attivitaClienteFatte.length})
                    </h3>
                    {attivitaClienteFatte.map(a => (
                      <AttivitaClienteCard 
                        key={a.id} 
                        attivita={a} 
                        onUpdateStato={(id, stato) => updateClienteStato.mutate({ id, stato })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="immobili" className="mt-4 space-y-4">
            {loadingImmobili ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : attivitaImmobili?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nessuna attività immobile</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {attivitaImmobileDaFare.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Da fare ({attivitaImmobileDaFare.length})
                    </h3>
                    {attivitaImmobileDaFare.map(a => (
                      <AttivitaImmobileCard 
                        key={a.id} 
                        attivita={a} 
                        onUpdateStato={(id, stato) => updateImmobileStato.mutate({ id, stato })}
                      />
                    ))}
                  </div>
                )}
                
                {attivitaImmobileInCorso.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      In corso ({attivitaImmobileInCorso.length})
                    </h3>
                    {attivitaImmobileInCorso.map(a => (
                      <AttivitaImmobileCard 
                        key={a.id} 
                        attivita={a} 
                        onUpdateStato={(id, stato) => updateImmobileStato.mutate({ id, stato })}
                      />
                    ))}
                  </div>
                )}
                
                {attivitaImmobileFatte.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Completate ({attivitaImmobileFatte.length})
                    </h3>
                    {attivitaImmobileFatte.map(a => (
                      <AttivitaImmobileCard 
                        key={a.id} 
                        attivita={a} 
                        onUpdateStato={(id, stato) => updateImmobileStato.mutate({ id, stato })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
