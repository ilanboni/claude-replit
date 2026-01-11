import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Sparkles, Loader2 } from "lucide-react";
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
import type { Richiesta, Cliente } from "@shared/schema";

const formSchema = z.object({
  clienteId: z.number({ required_error: "Seleziona un cliente" }),
  descrizioneLibera: z.string().optional(),
  budgetMassimo: z.string().optional(),
  mqMinimi: z.number().optional().nullable(),
  zona: z.string().optional(),
  pianoTutti: z.boolean(),
  pianoTerra: z.boolean(),
  pianoIntermedi: z.boolean(),
  pianoUltimo: z.boolean(),
  statoNuovo: z.boolean(),
  statoRistrutturato: z.boolean(),
  statoBuono: z.boolean(),
  statoDaRistrutturare: z.boolean(),
  balcone: z.boolean(),
  terrazzo: z.boolean(),
  ascensore: z.boolean(),
  box: z.boolean(),
  caratteristicheObbligatorie: z.array(z.string()),
  caratteristicheGradite: z.array(z.string()),
  camereMinime: z.number().optional().nullable(),
  bagniMinimi: z.number().optional().nullable(),
  priorita: z.number(),
  ratingRichiesta: z.number(),
  attiva: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface RichiestaFormProps {
  richiesta?: Richiesta | null;
  clienteId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RichiestaForm({ richiesta, clienteId, onSuccess, onCancel }: RichiestaFormProps) {
  const { toast } = useToast();
  const isEditing = !!richiesta;

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const compratori = clienti.filter(c => c.tipoCliente === "compratore" || c.tipoCliente === "entrambi");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clienteId: richiesta?.clienteId ?? clienteId ?? undefined,
      descrizioneLibera: richiesta?.descrizioneLibera ?? "",
      budgetMassimo: richiesta?.budgetMassimo?.toString() ?? "",
      mqMinimi: richiesta?.mqMinimi ?? null,
      zona: richiesta?.zona ?? "",
      pianoTutti: richiesta?.pianoTutti ?? true,
      pianoTerra: richiesta?.pianoTerra ?? false,
      pianoIntermedi: richiesta?.pianoIntermedi ?? false,
      pianoUltimo: richiesta?.pianoUltimo ?? false,
      statoNuovo: richiesta?.statoNuovo ?? false,
      statoRistrutturato: richiesta?.statoRistrutturato ?? false,
      statoBuono: richiesta?.statoBuono ?? true,
      statoDaRistrutturare: richiesta?.statoDaRistrutturare ?? false,
      balcone: richiesta?.balcone ?? false,
      terrazzo: richiesta?.terrazzo ?? false,
      ascensore: richiesta?.ascensore ?? false,
      box: richiesta?.box ?? false,
      caratteristicheObbligatorie: richiesta?.caratteristicheObbligatorie ?? [],
      caratteristicheGradite: richiesta?.caratteristicheGradite ?? [],
      camereMinime: richiesta?.camereMinime ?? null,
      bagniMinimi: richiesta?.bagniMinimi ?? null,
      priorita: richiesta?.priorita ?? 2,
      ratingRichiesta: richiesta?.ratingRichiesta ?? 3,
      attiva: richiesta?.attiva ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        budgetMassimo: data.budgetMassimo || null,
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/richieste/${richiesta.id}`, payload);
      }
      return apiRequest("POST", "/api/richieste", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/richieste"] });
      if (richiesta) {
        queryClient.invalidateQueries({ queryKey: ["/api/richieste", richiesta.id] });
      }
      toast({
        title: isEditing ? "Richiesta aggiornata" : "Richiesta creata",
        description: isEditing 
          ? "Le modifiche sono state salvate con successo"
          : "La nuova richiesta è stata creata con successo",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: `Impossibile ${isEditing ? "aggiornare" : "creare"} la richiesta`,
        variant: "destructive",
      });
    },
  });

  const aiParseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/ai/parse-request", { text });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.zona) form.setValue("zona", data.zona);
      if (data.budgetMassimo) form.setValue("budgetMassimo", data.budgetMassimo.toString());
      if (data.mqMinimi) form.setValue("mqMinimi", data.mqMinimi);
      if (data.camereMinime) form.setValue("camereMinime", data.camereMinime);
      if (data.bagniMinimi) form.setValue("bagniMinimi", data.bagniMinimi);
      
      if (data.pianoTerra !== undefined) form.setValue("pianoTerra", data.pianoTerra);
      if (data.pianoIntermedi !== undefined) form.setValue("pianoIntermedi", data.pianoIntermedi);
      if (data.pianoUltimo !== undefined) form.setValue("pianoUltimo", data.pianoUltimo);
      if (data.pianoTutti !== undefined) form.setValue("pianoTutti", data.pianoTutti);
      
      if (data.statoNuovo !== undefined) form.setValue("statoNuovo", data.statoNuovo);
      if (data.statoRistrutturato !== undefined) form.setValue("statoRistrutturato", data.statoRistrutturato);
      if (data.statoBuono !== undefined) form.setValue("statoBuono", data.statoBuono);
      if (data.statoDaRistrutturare !== undefined) form.setValue("statoDaRistrutturare", data.statoDaRistrutturare);
      
      const obbligatorie = data.caratteristicheObbligatorie && Array.isArray(data.caratteristicheObbligatorie) ? data.caratteristicheObbligatorie : [];
      const gradite = data.caratteristicheGradite && Array.isArray(data.caratteristicheGradite) ? data.caratteristicheGradite : [];
      
      form.setValue("caratteristicheObbligatorie", obbligatorie);
      form.setValue("caratteristicheGradite", gradite);
      
      const allFeatures = [...obbligatorie, ...gradite];
      form.setValue("balcone", allFeatures.includes("balcone"));
      form.setValue("terrazzo", allFeatures.includes("terrazzo"));
      form.setValue("ascensore", allFeatures.includes("ascensore"));
      form.setValue("box", allFeatures.includes("box"));
      
      toast({
        title: "Analisi completata",
        description: "I campi sono stati compilati automaticamente dall'IA",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile analizzare il testo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleAIParse = () => {
    const text = form.getValues("descrizioneLibera");
    if (text) {
      aiParseMutation.mutate(text);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!clienteId && (
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
                    {compratori.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nome} {c.cognome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Solo clienti registrati come compratori
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="descrizioneLibera"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione Richiesta</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Es: Cerco casa a Brera, minimo 100mq, almeno due bagni, ultimo piano, terrazzo obbligatorio..."
                  className="resize-none min-h-24"
                  {...field}
                  data-testid="textarea-descrizione"
                />
              </FormControl>
              <FormDescription>
                Descrivi la richiesta in linguaggio naturale. L'IA analizzerà il testo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAIParse}
          disabled={aiParseMutation.isPending || !form.watch("descrizioneLibera")}
          data-testid="button-ai-parse"
        >
          {aiParseMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisi in corso...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analizza con IA
            </>
          )}
        </Button>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="zona"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona</FormLabel>
                <FormControl>
                  <Input placeholder="Es: Brera, Navigli" {...field} data-testid="input-zona" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budgetMassimo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Massimo (€)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="500000" {...field} data-testid="input-budget" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mqMinimi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mq Minimi</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="80" 
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="camereMinime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Camere Minime</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="2" 
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
            name="bagniMinimi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bagni Minimi</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1" 
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
          <FormLabel className="text-base">Piano Preferito</FormLabel>
          <p className="text-sm text-muted-foreground mb-2">Seleziona i piani accettati. Se nessuno selezionato = indifferente.</p>
          <div className="grid gap-3 sm:grid-cols-4 mt-3">
            {[
              { name: "pianoTerra" as const, label: "Piano terra" },
              { name: "pianoIntermedi" as const, label: "Piani intermedi" },
              { name: "pianoUltimo" as const, label: "Ultimo piano" },
              { name: "pianoTutti" as const, label: "Qualsiasi" },
            ].map((piano) => (
              <FormField
                key={piano.name}
                control={form.control}
                name={piano.name}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (piano.name === "pianoTutti" && checked) {
                            form.setValue("pianoTerra", false);
                            form.setValue("pianoIntermedi", false);
                            form.setValue("pianoUltimo", false);
                          } else if (piano.name !== "pianoTutti" && checked) {
                            form.setValue("pianoTutti", false);
                          }
                          field.onChange(checked);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">{piano.label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <FormLabel className="text-base">Stato Accettato</FormLabel>
          <p className="text-sm text-muted-foreground mb-2">Seleziona gli stati accettati. Se nessuno selezionato = indifferente.</p>
          <div className="grid gap-3 sm:grid-cols-4 mt-3">
            {[
              { name: "statoNuovo" as const, label: "Nuovo" },
              { name: "statoRistrutturato" as const, label: "Ristrutturato" },
              { name: "statoBuono" as const, label: "Buono stato" },
              { name: "statoDaRistrutturare" as const, label: "Da ristrutturare" },
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
          <p className="text-sm text-muted-foreground mb-3">Per ogni caratteristica, indica se è obbligatoria, gradita, o non rilevante.</p>
          <div className="space-y-3">
            {[
              { id: "balcone", label: "Balcone" },
              { id: "terrazzo", label: "Terrazzo" },
              { id: "ascensore", label: "Ascensore" },
              { id: "box", label: "Box/Garage" },
            ].map((feat) => {
              const obbligatorie = form.watch("caratteristicheObbligatorie") || [];
              const gradite = form.watch("caratteristicheGradite") || [];
              const isObbligatoria = obbligatorie.includes(feat.id);
              const isGradita = gradite.includes(feat.id);
              
              const handleChange = (type: "obbligatoria" | "gradita" | "none") => {
                let newObb = obbligatorie.filter((f: string) => f !== feat.id);
                let newGrad = gradite.filter((f: string) => f !== feat.id);
                
                if (type === "obbligatoria") {
                  newObb = [...newObb, feat.id];
                } else if (type === "gradita") {
                  newGrad = [...newGrad, feat.id];
                }
                
                form.setValue("caratteristicheObbligatorie", newObb);
                form.setValue("caratteristicheGradite", newGrad);
                form.setValue(feat.id as "balcone" | "terrazzo" | "ascensore" | "box", type !== "none");
              };
              
              return (
                <div key={feat.id} className="flex items-center gap-4 p-2 rounded-md border" data-testid={`feature-row-${feat.id}`}>
                  <span className="font-medium min-w-24">{feat.label}</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`feat-${feat.id}`}
                        checked={!isObbligatoria && !isGradita}
                        onChange={() => handleChange("none")}
                        className="w-4 h-4"
                        data-testid={`radio-${feat.id}-none`}
                      />
                      <span className="text-sm text-muted-foreground">Non rilevante</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`feat-${feat.id}`}
                        checked={isGradita}
                        onChange={() => handleChange("gradita")}
                        className="w-4 h-4"
                        data-testid={`radio-${feat.id}-gradita`}
                      />
                      <span className="text-sm">Gradita</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`feat-${feat.id}`}
                        checked={isObbligatoria}
                        onChange={() => handleChange("obbligatoria")}
                        className="w-4 h-4"
                        data-testid={`radio-${feat.id}-obbligatoria`}
                      />
                      <span className="text-sm font-medium text-primary">Obbligatoria</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="priorita"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priorità</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger data-testid="select-priorita">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Media</SelectItem>
                    <SelectItem value="3">Bassa</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ratingRichiesta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating Richiesta</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {r} {r === 1 ? "stella" : "stelle"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="attiva"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-4">
              <div>
                <FormLabel className="text-base">Richiesta Attiva</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Le richieste inattive non generano matching
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-attiva"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Annulla
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-request">
            {mutation.isPending
              ? "Salvataggio..."
              : isEditing
              ? "Salva Modifiche"
              : "Crea Richiesta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
