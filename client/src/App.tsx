import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell } from "@/components/notifications-bell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center gap-4 h-14 border-b px-4 shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <GlobalSearch />
                  <div className="flex items-center gap-1">
                    <NotificationsBell />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
