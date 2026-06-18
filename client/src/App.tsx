import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/app-shell";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Home from "@/pages/home";
import Pluricondivisi from "@/pages/pluricondivisi";
import PluricondivisoDetailPage from "@/pages/pluricondivisi-detail";
import ImpostazioniPWA from "@/pages/impostazioni-pwa";
import Promemoria from "@/pages/promemoria";
import Comandi from "@/pages/comandi";
import ClientiPage from "@/pages/clienti";
import ClienteDetailPage from "@/pages/clienti/[id]";
import ImmobiliPage from "@/pages/immobili";
import ImmobileDetailPage from "@/pages/immobili/detail";
import ImmobileEsternoDetailPage from "@/pages/immobili/esterno-detail";
import RichiestePage from "@/pages/richieste";
import RichiestaDetailPage from "@/pages/richieste/[id]";
import ComunicazioniPage from "@/pages/comunicazioni";
import AppuntamentiPage from "@/pages/appuntamenti";
import MatchingPage from "@/pages/matching";
import AcquisizionePage from "@/pages/acquisizione";
import AcquisizioneDetailPage from "@/pages/acquisizione/detail";
import AcquisisciUrlPage from "@/pages/acquisisci-url";
import MercatoPage from "@/pages/mercato";
import MercatoDetailPage from "@/pages/mercato/detail";
import BotPage from "@/pages/bot";
import WhatsAppPage from "@/pages/whatsapp";
import AttivitaPage from "@/pages/attivita";
import ConfermaAppuntamentiPage from "@/pages/conferma-appuntamenti";
import ImpostazioniPage from "@/pages/impostazioni";
import BozzePage from "@/pages/bozze";
import PipelinePrivatiPage from "@/pages/pipeline-privati";
import AnalyticsOutreachPage from "@/pages/analytics-outreach";
import OperativoPage from "@/pages/operativo";

function Router() {
  return (
    <Switch>
      {/* Nuova homepage "OGGI" mobile-first */}
      <Route path="/" component={Home} />
      {/* Vecchia dashboard analytics raggiungibile esplicitamente */}
      <Route path="/dashboard" component={Dashboard} />

      {/* Nuove pagine PWA mobile-first */}
      <Route path="/pluricondivisi" component={Pluricondivisi} />
      <Route path="/pluricondivisi/:id" component={PluricondivisoDetailPage} />
      <Route path="/impostazioni-pwa" component={ImpostazioniPWA} />
      <Route path="/promemoria" component={Promemoria} />
      <Route path="/comandi" component={Comandi} />

      <Route path="/clienti" component={ClientiPage} />
      <Route path="/clienti/:id" component={ClienteDetailPage} />
      <Route path="/immobili" component={ImmobiliPage} />
      <Route path="/immobili/:id" component={ImmobileDetailPage} />
      <Route path="/immobili/esterno/:id" component={ImmobileEsternoDetailPage} />
      <Route path="/richieste" component={RichiestePage} />
      <Route path="/richieste/:id" component={RichiestaDetailPage} />
      <Route path="/comunicazioni" component={ComunicazioniPage} />
      <Route path="/appuntamenti" component={AppuntamentiPage} />
      <Route path="/conferma-appuntamenti" component={ConfermaAppuntamentiPage} />
      <Route path="/matching" component={MatchingPage} />
      <Route path="/acquisizione" component={AcquisizionePage} />
      <Route path="/acquisizione/url" component={AcquisisciUrlPage} />
      <Route path="/acquisizione/:id" component={AcquisizioneDetailPage} />
      <Route path="/mercato" component={MercatoPage} />
      <Route path="/mercato/:id" component={MercatoDetailPage} />
      <Route path="/bot" component={BotPage} />
      <Route path="/whatsapp" component={WhatsAppPage} />
      <Route path="/attivita" component={AttivitaPage} />
      <Route path="/impostazioni" component={ImpostazioniPage} />
      <Route path="/bozze" component={BozzePage} />
      <Route path="/pipeline-privati" component={PipelinePrivatiPage} />
      <Route path="/analytics-outreach" component={AnalyticsOutreachPage} />
      <Route path="/operativo" component={OperativoPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppShell>
            <Router />
          </AppShell>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
