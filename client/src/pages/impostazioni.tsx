import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, CheckCircle, AlertCircle } from "lucide-react";

export default function Impostazioni() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    updated?: number;
    skipped?: number;
  } | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch("/api/admin/sync-from-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Errore durante la sincronizzazione");
      }

      setSyncResult(result);
      toast({
        title: "Sincronizzazione completata",
        description: result.message,
      });
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.message,
      });
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isProduction = window.location.hostname === "cavour.replit.app";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground">Configurazione e strumenti di amministrazione</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronizzazione Database
          </CardTitle>
          <CardDescription>
            Sincronizza i dati dal database di produzione a quello di sviluppo.
            Questa funzione importa clienti, immobili e altri dati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProduction ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>La sincronizzazione è disponibile solo nell'ambiente di sviluppo</span>
            </div>
          ) : (
            <>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                data-testid="button-sync-database"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizzazione in corso...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizza da Produzione
                  </>
                )}
              </Button>

              {syncResult && (
                <div className={`p-4 rounded-md ${syncResult.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                  <div className="flex items-center gap-2">
                    {syncResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={syncResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                      {syncResult.message}
                    </span>
                  </div>
                  {syncResult.success && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Nuovi: {syncResult.imported}</p>
                      <p>Aggiornati: {syncResult.updated}</p>
                      <p>Ignorati: {syncResult.skipped}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
