import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

/**
 * AppShell responsive:
 *  - mobile (< md): nessuna sidebar, header compatto, bottom nav (MobileNav)
 *  - desktop (>= md): sidebar + header completo come prima
 *
 * Il contenuto principale riserva padding-bottom su mobile per non finire
 * sotto la bottom nav (h-16 + safe-area-inset-bottom).
 */
interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-[100dvh] w-full">
        {/* Sidebar solo su desktop */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header: su mobile è compatto, su desktop ha SidebarTrigger */}
          <header className="flex items-center gap-3 h-12 md:h-14 border-b px-3 md:px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30"
                  style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="hidden md:block">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <GlobalSearch />
            <div className="flex items-center gap-1">
              <NotificationsBell />
              <ThemeToggle />
            </div>
          </header>

          {/* Contenuto principale — su mobile aggiunge pb-20 per bottom nav */}
          <main
            className="flex-1 overflow-auto pb-20 md:pb-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
            data-testid="app-main"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav fixed, visibile solo su mobile */}
      <MobileNav />
    </SidebarProvider>
  );
}
