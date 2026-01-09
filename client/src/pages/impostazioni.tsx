import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, CheckCircle, AlertCircle, Upload, Download } from "lucide-react";

type SyncResult = {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  deleted?: number;
};

export default function Impostazioni() {
  const [isSyncingFrom, setIsSyncingFrom] = useState(false);
  const [isSyncingTo, setIsSyncingTo] = useState(false);
  const [syncFromResult, setSyncFromResult] = useState<SyncResult | null>(null);
  const [syncToResult, setSyncToResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const handleSyncFromProduction = async () => {
    setIsSyncingFrom(true);
    setSyncFromResult(null);
    
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

      setSyncFromResult(result);
      toast({
        title: "Sincronizzazione completata",
        description: result.message,
      });
    } catch (error: any) {
      setSyncFromResult({
        success: false,
        message: error.message,
      });
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingFrom(false);
    }
  };

  const handleSyncToProduction = async () => {
    if (!confirm("Sei sicuro di voler inviare i dati locali alla produzione? Questo sovrascriverà i dati esistenti.")) {
      return;
    }
    
    setIsSyncingTo(true);
    setSyncToResult(null);
    
    try {
      const response = await fetch("/api/admin/sync-to-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Errore durante la sincronizzazione");
      }

      setSyncToResult(result);
      toast({
        title: "Sincronizzazione completata",
        description: result.message,
      });
    } catch (error: any) {
      setSyncToResult({
        success: false,
        message: error.message,
      });
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingTo(false);
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
            Sincronizza i dati tra ambiente di sviluppo e produzione.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isProduction ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>La sincronizzazione è disponibile solo nell'ambiente di sviluppo</span>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Da Produzione → Sviluppo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Scarica i dati dalla produzione e li importa qui in sviluppo.
                </p>
                <Button 
                  onClick={handleSyncFromProduction} 
                  disabled={isSyncingFrom || isSyncingTo}
                  variant="outline"
                  data-testid="button-sync-from-production"
                >
                  {isSyncingFrom ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scaricando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Scarica da Produzione
                    </>
                  )}
                </Button>
                {syncFromResult && (
                  <div className={`p-4 rounded-md ${syncFromResult.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                    <div className="flex items-center gap-2">
                      {syncFromResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={syncFromResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                        {syncFromResult.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Da Sviluppo → Produzione
                </h3>
                <p className="text-sm text-muted-foreground">
                  Invia i dati locali alla produzione. Attenzione: sovrascrive i dati esistenti.
                </p>
                <Button 
                  onClick={handleSyncToProduction} 
                  disabled={isSyncingFrom || isSyncingTo}
                  data-testid="button-sync-to-production"
                >
                  {isSyncingTo ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Inviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Invia a Produzione
                    </>
                  )}
                </Button>
                {syncToResult && (
                  <div className={`p-4 rounded-md ${syncToResult.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                    <div className="flex items-center gap-2">
                      {syncToResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={syncToResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                        {syncToResult.message}
                      </span>
                    </div>
                    {syncToResult.success && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>Nuovi: {syncToResult.imported}</p>
                        <p>Aggiornati: {syncToResult.updated}</p>
                        <p>Eliminati: {syncToResult.deleted}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
