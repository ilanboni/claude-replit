import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  CalendarCheck, 
  Plus,
  Send,
  UserPlus,
  Trash2,
  Clock, 
  MapPin, 
  User, 
  Phone,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Building
} from "lucide-react";
import type { AppointmentConfirmation, Cliente, Immobile } from "@shared/schema";

// Helper function to format client display name consistently
function formatClienteLabel(cliente: Cliente): string {
  // If both nome and cognome exist, show "Nome Cognome"
  if (cliente.nome && cliente.cognome) {
    return `${cliente.nome} ${cliente.cognome}`;
  }
  // If only cognome, show cognome
  if (cliente.cognome) {
    return cliente.cognome;
  }
  // If only nome, show nome
  if (cliente.nome) {
    return cliente.nome;
  }
  // If no name available but has linkImmobile, extract address from it
  if (cliente.linkImmobile) {
    // Try to extract address from link or show as "Proprietario [link]"
    return `Proprietario ${cliente.linkImmobile.substring(0, 30)}...`;
  }
  // Fallback to phone or ID
  return cliente.telefono ? `Proprietario ${cliente.telefono}` : `Cliente #${cliente.id}`;
}

// Helper function to format property display - show address only
function formatImmobileLabel(immobile: Immobile): string {
  // Priority: indirizzo > titolo with address extraction > zona > ID fallback
  if (immobile.indirizzo) {
    return immobile.indirizzo;
  }
  // If no direct address, try to extract from titolo (e.g., "Trilocale (Via Primaticcio 90)")
  if (immobile.titolo) {
    const addressMatch = immobile.titolo.match(/\(([^)]+)\)/);
    if (addressMatch) {
      return addressMatch[1];
    }
  }
  // Fallback to zona if nothing else
  if (immobile.zona) {
    return immobile.zona;
  }
  return `Immobile #${immobile.id}`;
}

type FormData = {
  clienteId: string;
  immobileId: string;
  salutation: string;
  cognome: string;
  telefono: string;
  dataOra: string;
  indirizzo: string;
};

const initialFormData: FormData = {
  clienteId: "manual",
  immobileId: "manual",
  salutation: "",
  cognome: "",
  telefono: "",
  dataOra: "",
  indirizzo: "",
};

export default function ConfermaAppuntamentiPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: confirmations = [], isLoading: isLoadingConfirmations } = useQuery<AppointmentConfirmation[]>({
    queryKey: ["/api/appointment-confirmations"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const { data: authStatus } = useQuery<{ connected: boolean; email?: string }>({
    queryKey: ["/api/calendar/auth-status"],
  });

  const createConfirmationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/appointment-confirmations", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conferma creata",
        description: "La conferma appuntamento è stata creata.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-confirmations"] });
      setDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendConfirmationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/appointment-confirmations/${id}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Messaggio inviato",
        description: data.message || "Il messaggio WhatsApp è stato inviato e l'evento creato nel calendario.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-clienti"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-immobili"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore invio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (confirmation: AppointmentConfirmation) => {
      const res = await apiRequest("POST", "/api/clienti", {
        nome: confirmation.clientName,
        telefono: confirmation.clientPhone,
        tipo: "acquirente",
      });
      const cliente = await res.json();
      await apiRequest("PATCH", `/api/appointment-confirmations/${confirmation.id}`, {
        clienteId: cliente.id,
      });
      return cliente;
    },
    onSuccess: () => {
      toast({
        title: "Cliente creato",
        description: "Il cliente è stato creato e collegato alla conferma.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConfirmationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointment-confirmations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Conferma eliminata",
        description: "La conferma appuntamento è stata eliminata.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-confirmations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClienteChange = (value: string) => {
    setFormData(prev => ({ ...prev, clienteId: value }));
    if (value !== "manual") {
      const cliente = clienti.find(c => c.id.toString() === value);
      if (cliente) {
        // Build full name: prefer cognome + nome, fallback to just nome or cognome
        let fullName = "";
        if (cliente.cognome && cliente.nome) {
          fullName = `${cliente.cognome}`;  // Just surname for formal Italian usage
        } else {
          fullName = cliente.cognome || cliente.nome || "";
        }
        setFormData(prev => ({
          ...prev,
          clienteId: value,
          salutation: cliente.appellativo || "",
          cognome: fullName,
          telefono: cliente.telefono || "",
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        clienteId: value,
        salutation: "",
        cognome: "",
        telefono: "",
      }));
    }
  };

  const handleImmobileChange = (value: string) => {
    setFormData(prev => ({ ...prev, immobileId: value }));
    if (value !== "manual") {
      const immobile = immobili.find(i => i.id.toString() === value);
      if (immobile) {
        setFormData(prev => ({
          ...prev,
          immobileId: value,
          indirizzo: immobile.indirizzo || "",
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        immobileId: value,
        indirizzo: "",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dataOra) {
      toast({
        title: "Errore",
        description: "Inserisci la data e ora dell'appuntamento.",
        variant: "destructive",
      });
      return;
    }

    createConfirmationMutation.mutate({
      clienteId: formData.clienteId !== "manual" ? parseInt(formData.clienteId) : null,
      immobileId: formData.immobileId !== "manual" ? parseInt(formData.immobileId) : null,
      salutation: formData.salutation,
      clientName: formData.cognome,
      clientPhone: formData.telefono,
      appointmentDate: new Date(formData.dataOra).toISOString(),
      address: formData.indirizzo,
      status: "pending",
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="bg-green-500">Inviato</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Da inviare</Badge>;
      case "synced":
        return <Badge variant="default" className="bg-blue-500">Sincronizzato</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Da inviare</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Conferme Appuntamenti
          </h1>
          <p className="text-muted-foreground">
            Gestisci e invia conferme appuntamenti tramite WhatsApp automatico
          </p>
        </div>
        <div className="flex items-center gap-2">
          {authStatus?.connected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Calendar collegato
            </Badge>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <a href="/api/calendar/auth" data-testid="button-connect-calendar">
                <LinkIcon className="h-4 w-4 mr-2" />
                Collega Calendar
              </a>
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-nuova-conferma">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Conferma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuova Conferma Appuntamento</DialogTitle>
                <DialogDescription>
                  Compila i dati per creare una nuova conferma appuntamento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select value={formData.clienteId} onValueChange={handleClienteChange}>
                    <SelectTrigger data-testid="select-cliente">
                      <SelectValue placeholder="Seleziona cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Inserimento manuale</SelectItem>
                      {clienti.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id.toString()}>
                          {formatClienteLabel(cliente)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="immobile">Immobile</Label>
                  <Select value={formData.immobileId} onValueChange={handleImmobileChange}>
                    <SelectTrigger data-testid="select-immobile">
                      <SelectValue placeholder="Seleziona immobile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Inserimento manuale</SelectItem>
                      {immobili.map(immobile => (
                        <SelectItem key={immobile.id} value={immobile.id.toString()}>
                          {formatImmobileLabel(immobile)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salutation">Intestazione</Label>
                  <Select 
                    value={formData.salutation} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, salutation: v }))}
                  >
                    <SelectTrigger data-testid="select-intestazione">
                      <SelectValue placeholder="Seleziona intestazione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Egr. Dott.">Egr. Dott.</SelectItem>
                      <SelectItem value="Gent.ma Sig.ra">Gent.ma Sig.ra</SelectItem>
                      <SelectItem value="Gent.mo Sig.">Gent.mo Sig.</SelectItem>
                      <SelectItem value="Egr. Sig.">Egr. Sig.</SelectItem>
                      <SelectItem value="Gent.ma Dott.ssa">Gent.ma Dott.ssa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome</Label>
                  <Input
                    id="cognome"
                    value={formData.cognome}
                    onChange={(e) => setFormData(prev => ({ ...prev, cognome: e.target.value }))}
                    placeholder="Inserisci cognome"
                    data-testid="input-cognome"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Numero di telefono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Inserisci numero di telefono"
                    data-testid="input-telefono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataOra">Data e ora appuntamento</Label>
                  <Input
                    id="dataOra"
                    type="datetime-local"
                    value={formData.dataOra}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataOra: e.target.value }))}
                    data-testid="input-data-ora"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="indirizzo">Indirizzo appuntamento</Label>
                  <Input
                    id="indirizzo"
                    value={formData.indirizzo}
                    onChange={(e) => setFormData(prev => ({ ...prev, indirizzo: e.target.value }))}
                    placeholder="es. viale Abruzzi 78"
                    data-testid="input-indirizzo"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createConfirmationMutation.isPending}
                    data-testid="button-crea-conferma"
                  >
                    {createConfirmationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crea Conferma
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Elenco Conferme Appuntamenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingConfirmations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : confirmations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mb-2 opacity-20" />
              <p>Nessuna conferma appuntamento</p>
              <p className="text-sm">Clicca "Nuova Conferma" per crearne una</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intestazione</TableHead>
                  <TableHead>Cognome</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Data e Ora</TableHead>
                  <TableHead>Indirizzo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmations.map((conf) => (
                  <TableRow key={conf.id} data-testid={`row-confirmation-${conf.id}`}>
                    <TableCell>{conf.salutation || "-"}</TableCell>
                    <TableCell className="font-medium">{conf.clientName || "-"}</TableCell>
                    <TableCell>{conf.clientPhone || "-"}</TableCell>
                    <TableCell>
                      {conf.appointmentDate 
                        ? format(new Date(conf.appointmentDate), "EEEE d/MM, 'alle ore' HH:mm", { locale: it })
                        : "-"}
                    </TableCell>
                    <TableCell>{conf.address || "-"}</TableCell>
                    <TableCell>{getStatusBadge(conf.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {conf.status !== "sent" && (
                          <Button
                            size="sm"
                            onClick={() => sendConfirmationMutation.mutate(conf.id)}
                            disabled={sendConfirmationMutation.isPending}
                            className="bg-green-500 hover:bg-green-600"
                            data-testid={`button-invia-${conf.id}`}
                          >
                            {sendConfirmationMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Invia
                          </Button>
                        )}
                        {!conf.clienteId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => createClientMutation.mutate(conf)}
                            disabled={createClientMutation.isPending}
                            data-testid={`button-crea-cliente-${conf.id}`}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Crea cliente
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteConfirmationMutation.mutate(conf.id)}
                          disabled={deleteConfirmationMutation.isPending}
                          data-testid={`button-elimina-${conf.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
