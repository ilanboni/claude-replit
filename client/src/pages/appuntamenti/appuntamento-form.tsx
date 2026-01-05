import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import type { Appuntamento, Cliente, Immobile } from "@shared/schema";

const formSchema = z.object({
  clienteId: z.number({ required_error: "Seleziona un cliente" }),
  immobileId: z.number().optional().nullable(),
  dataOra: z.string().min(1, "Seleziona data e ora"),
  luogo: z.string().optional(),
  note: z.string().optional(),
  confermato: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface AppuntamentoFormProps {
  appuntamento?: Appuntamento | null;
  preselectedClienteId?: number;
  preselectedImmobileId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AppuntamentoForm({ 
  appuntamento, 
  preselectedClienteId,
  preselectedImmobileId,
  onSuccess, 
  onCancel 
}: AppuntamentoFormProps) {
  const { toast } = useToast();
  const isEditing = !!appuntamento;

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const formatDateForInput = (date: Date | string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clienteId: appuntamento?.clienteId ?? preselectedClienteId ?? undefined,
      immobileId: appuntamento?.immobileId ?? preselectedImmobileId ?? null,
      dataOra: appuntamento ? formatDateForInput(appuntamento.dataOra) : "",
      luogo: appuntamento?.luogo ?? "",
      note: appuntamento?.note ?? "",
      confermato: appuntamento?.confermato ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        dataOra: new Date(data.dataOra).toISOString(),
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/appuntamenti/${appuntamento.id}`, payload);
      }
      return apiRequest("POST", "/api/appuntamenti", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appuntamenti"] });
      toast({
        title: isEditing ? "Appuntamento aggiornato" : "Appuntamento creato",
        description: isEditing 
          ? "Le modifiche sono state salvate"
          : "Il nuovo appuntamento è stato creato",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: `Impossibile ${isEditing ? "aggiornare" : "creare"} l'appuntamento`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="clienteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente *</FormLabel>
              <Select 
                onValueChange={(v) => field.onChange(parseInt(v))} 
                value={field.value?.toString() ?? ""}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-cliente">
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clienti.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nome} {c.cognome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="immobileId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immobile (opzionale)</FormLabel>
              <Select 
                onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} 
                value={field.value?.toString() ?? ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona immobile..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {immobili.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.titolo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dataOra"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data e Ora *</FormLabel>
              <FormControl>
                <Input 
                  type="datetime-local" 
                  {...field} 
                  data-testid="input-datetime"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="luogo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Luogo</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Es: Via Roma 1, Milano" 
                  {...field} 
                  data-testid="input-luogo"
                />
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
                  placeholder="Eventuali note sull'appuntamento..."
                  className="resize-none min-h-20"
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
          name="confermato"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <FormLabel className="!mt-0">Confermato</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-confermato"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-appointment">
            {mutation.isPending
              ? "Salvataggio..."
              : isEditing
              ? "Salva Modifiche"
              : "Crea Appuntamento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
