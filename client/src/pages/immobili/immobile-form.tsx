import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import type { Immobile, Cliente } from "@shared/schema";

const formSchema = z.object({
  proprietarioId: z.number().optional().nullable(),
  titolo: z.string().min(1, "Il titolo è obbligatorio"),
  descrizione: z.string().optional(),
  indirizzo: z.string().optional(),
  zona: z.string().optional(),
  idPortale: z.string().optional().nullable(),
  mq: z.number().optional().nullable(),
  prezzo: z.string().optional(),
  piano: z.number().optional().nullable(),
  statoNuovo: z.boolean(),
  statoRistrutturato: z.boolean(),
  statoBuono: z.boolean(),
  statoDaRistrutturare: z.boolean(),
  balcone: z.boolean(),
  terrazzo: z.boolean(),
  ascensore: z.boolean(),
  box: z.boolean(),
  camere: z.number().optional().nullable(),
  bagni: z.number().optional().nullable(),
  esclusiva: z.boolean(),
  multiagenzia: z.boolean(),
  fonte: z.string(),
  attivo: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface ImmobileFormProps {
  immobile?: Immobile | null;
  preselectedProprietarioId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ImmobileForm({ immobile, preselectedProprietarioId, onSuccess, onCancel }: ImmobileFormProps) {
  const { toast } = useToast();
  const isEditing = !!immobile;

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const venditori = clienti.filter(c => c.tipoCliente === "venditore" || c.tipoCliente === "entrambi");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proprietarioId: immobile?.proprietarioId ?? preselectedProprietarioId ?? null,
      titolo: immobile?.titolo ?? "",
      descrizione: immobile?.descrizione ?? "",
      indirizzo: immobile?.indirizzo ?? "",
      zona: immobile?.zona ?? "",
      idPortale: immobile?.idPortale ?? "",
      mq: immobile?.mq ?? null,
      prezzo: immobile?.prezzo?.toString() ?? "",
      piano: immobile?.piano ?? null,
      statoNuovo: immobile?.statoNuovo ?? false,
      statoRistrutturato: immobile?.statoRistrutturato ?? false,
      statoBuono: immobile?.statoBuono ?? true,
      statoDaRistrutturare: immobile?.statoDaRistrutturare ?? false,
      balcone: immobile?.balcone ?? false,
      terrazzo: immobile?.terrazzo ?? false,
      ascensore: immobile?.ascensore ?? false,
      box: immobile?.box ?? false,
      camere: immobile?.camere ?? null,
      bagni: immobile?.bagni ?? null,
      esclusiva: immobile?.esclusiva ?? false,
      multiagenzia: immobile?.multiagenzia ?? false,
      fonte: immobile?.fonte ?? "privato",
      attivo: immobile?.attivo ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        prezzo: data.prezzo || null,
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/immobili/${immobile.id}`, payload);
      }
      return apiRequest("POST", "/api/immobili", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili"] });
      if (immobile) {
        queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobile.id] });
      }
      toast({
        title: isEditing ? "Immobile aggiornato" : "Immobile creato",
        description: isEditing 
          ? "Le modifiche sono state salvate con successo"
          : "Il nuovo immobile è stato aggiunto con successo",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: `Impossibile ${isEditing ? "aggiornare" : "creare"} l'immobile`,
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
        <FormField
          control={form.control}
          name="titolo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo *</FormLabel>
              <FormControl>
                <Input placeholder="Es: Appartamento luminoso centro storico" {...field} data-testid="input-titolo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="proprietarioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proprietario</FormLabel>
              <Select 
                onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} 
                value={field.value?.toString() ?? ""}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-proprietario">
                    <SelectValue placeholder="Seleziona proprietario..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {venditori.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nome} {c.cognome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Solo clienti registrati come venditori
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="indirizzo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input placeholder="Via Roma, 1" {...field} data-testid="input-indirizzo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona</FormLabel>
                <FormControl>
                  <Input placeholder="Es: Centro, Brera, Navigli" {...field} data-testid="input-zona" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="idPortale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Portale</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Es: Prima (per Via Primaticcio)" 
                  {...field} 
                  value={field.value ?? ""}
                  data-testid="input-id-portale" 
                />
              </FormControl>
              <FormDescription>
                Identificativo breve per matching richieste dai portali (Idealista, Immobiliare.it)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="prezzo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prezzo (€)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="350000" {...field} data-testid="input-prezzo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mq"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metri Quadri</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="100" 
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-mq"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="piano"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Piano</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="3" 
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-piano"
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
            name="camere"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Camere</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="3" 
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-camere"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bagni"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Bagni</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="2" 
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-bagni"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormLabel className="text-base">Stato Immobile</FormLabel>
          <div className="grid gap-3 sm:grid-cols-2 mt-3">
            {[
              { name: "statoNuovo" as const, label: "Nuovo" },
              { name: "statoRistrutturato" as const, label: "Ristrutturato" },
              { name: "statoBuono" as const, label: "Buono Stato" },
              { name: "statoDaRistrutturare" as const, label: "Da Ristrutturare" },
            ].map((stato) => (
              <FormField
                key={stato.name}
                control={form.control}
                name={stato.name}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid={`checkbox-${stato.name}`}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">{stato.label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <FormLabel className="text-base">Caratteristiche</FormLabel>
          <div className="grid gap-3 sm:grid-cols-2 mt-3">
            {[
              { name: "balcone" as const, label: "Balcone" },
              { name: "terrazzo" as const, label: "Terrazzo" },
              { name: "ascensore" as const, label: "Ascensore" },
              { name: "box" as const, label: "Box/Garage" },
            ].map((feat) => (
              <FormField
                key={feat.name}
                control={form.control}
                name={feat.name}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid={`checkbox-${feat.name}`}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">{feat.label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="descrizione"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrizione dettagliata dell'immobile..."
                  className="resize-none min-h-24"
                  {...field}
                  data-testid="textarea-descrizione"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fonte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fonte</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-fonte">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="privato">Privato</SelectItem>
                    <SelectItem value="agenzia">Agenzia</SelectItem>
                    <SelectItem value="scraping">Scraping</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="esclusiva"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel className="!mt-0">Esclusiva</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-esclusiva"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multiagenzia"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel className="!mt-0">Multiagenzia</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-multiagenzia"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="attivo"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-4">
              <div>
                <FormLabel className="text-base">Immobile Attivo</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Gli immobili inattivi non appariranno nei risultati di matching
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
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-property">
            {mutation.isPending
              ? "Salvataggio..."
              : isEditing
              ? "Salva Modifiche"
              : "Crea Immobile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
