import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Cliente } from "@shared/schema";

const formSchema = z.object({
  appellativo: z.string().optional(),
  nome: z.string().min(1, "Il nome è obbligatorio"),
  cognome: z.string().min(1, "Il cognome è obbligatorio"),
  telefono: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  compleanno: z.string().optional(),
  religione: z.string().optional(),
  note: z.string().optional(),
  tipoCliente: z.enum(["compratore", "venditore", "entrambi"]),
  ratingCliente: z.number().min(1).max(5),
  attivo: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface ClienteFormProps {
  cliente?: Cliente | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClienteForm({ cliente, onSuccess, onCancel }: ClienteFormProps) {
  const { toast } = useToast();
  const isEditing = !!cliente;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appellativo: cliente?.appellativo ?? "",
      nome: cliente?.nome ?? "",
      cognome: cliente?.cognome ?? "",
      telefono: cliente?.telefono ?? "",
      email: cliente?.email ?? "",
      compleanno: cliente?.compleanno ?? "",
      religione: cliente?.religione ?? "",
      note: cliente?.note ?? "",
      tipoCliente: (cliente?.tipoCliente as "compratore" | "venditore" | "entrambi") ?? "compratore",
      ratingCliente: cliente?.ratingCliente ?? 3,
      attivo: cliente?.attivo ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/clienti/${cliente.id}`, data);
      }
      return apiRequest("POST", "/api/clienti", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
      if (cliente) {
        queryClient.invalidateQueries({ queryKey: ["/api/clienti", cliente.id] });
      }
      toast({
        title: isEditing ? "Cliente aggiornato" : "Cliente creato",
        description: isEditing 
          ? "Le modifiche sono state salvate con successo"
          : "Il nuovo cliente è stato aggiunto con successo",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: `Impossibile ${isEditing ? "aggiornare" : "creare"} il cliente`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="appellativo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Appellativo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-appellativo">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Sig.">Sig.</SelectItem>
                    <SelectItem value="Sig.ra">Sig.ra</SelectItem>
                    <SelectItem value="Dott.">Dott.</SelectItem>
                    <SelectItem value="Dott.ssa">Dott.ssa</SelectItem>
                    <SelectItem value="Ing.">Ing.</SelectItem>
                    <SelectItem value="Avv.">Avv.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipoCliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo Cliente *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-tipo-cliente">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="compratore">Compratore</SelectItem>
                    <SelectItem value="venditore">Venditore</SelectItem>
                    <SelectItem value="entrambi">Entrambi</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Mario" {...field} data-testid="input-nome" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cognome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome *</FormLabel>
                <FormControl>
                  <Input placeholder="Rossi" {...field} data-testid="input-cognome" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input placeholder="+39 333 1234567" {...field} data-testid="input-telefono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="mario.rossi@email.com" 
                    {...field} 
                    data-testid="input-email" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="compleanno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data di Nascita</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-compleanno" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="religione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Religione</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-religione">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cattolica">Cattolica</SelectItem>
                    <SelectItem value="ebraica">Ebraica</SelectItem>
                    <SelectItem value="musulmana">Musulmana</SelectItem>
                    <SelectItem value="ortodossa">Ortodossa</SelectItem>
                    <SelectItem value="altra">Altra</SelectItem>
                    <SelectItem value="nessuna">Nessuna</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ratingCliente"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating Cliente</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => field.onChange(star)}
                      className="focus:outline-none"
                      data-testid={`button-rating-${star}`}
                    >
                      <svg
                        className={`h-8 w-8 transition-colors ${
                          star <= field.value
                            ? "fill-amber-400 text-amber-400"
                            : "fill-none text-muted-foreground/30 hover:text-amber-200"
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Inserisci eventuali note sul cliente..."
                  className="resize-none min-h-24"
                  {...field}
                  data-testid="textarea-note"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attivo"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-4">
              <div>
                <FormLabel className="text-base">Cliente Attivo</FormLabel>
                <p className="text-sm text-muted-foreground">
                  I clienti inattivi non appariranno nelle ricerche
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-attivo"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Annulla
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-client">
            {mutation.isPending
              ? "Salvataggio..."
              : isEditing
              ? "Salva Modifiche"
              : "Crea Cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
