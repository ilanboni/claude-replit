import { Link, useLocation } from "wouter";
import { Home, Users, Building2, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation per mobile (visibile solo < md breakpoint).
 * 5 tab principali: Home (Oggi), Clienti, Immobili, Attività, Settings.
 * Posizionata in fondo con safe-area-inset per iPhone con notch.
 */
const NAV_ITEMS = [
  { href: "/", label: "Oggi", icon: Home, match: (path: string) => path === "/" },
  { href: "/clienti", label: "Clienti", icon: Users, match: (path: string) => path.startsWith("/clienti") || path.startsWith("/richieste") || path.startsWith("/matching") },
  { href: "/immobili", label: "Immobili", icon: Building2, match: (path: string) => path.startsWith("/immobili") || path.startsWith("/acquisizione") || path.startsWith("/mercato") || path.startsWith("/bozze") || path.startsWith("/pipeline-privati") || path.startsWith("/pluricondivisi") },
  { href: "/attivita", label: "Attività", icon: Activity, match: (path: string) => path.startsWith("/attivita") || path.startsWith("/comunicazioni") || path.startsWith("/appuntamenti") || path.startsWith("/whatsapp") || path.startsWith("/analytics") },
  { href: "/impostazioni-pwa", label: "Settings", icon: Settings, match: (path: string) => path.startsWith("/impostazioni") || path.startsWith("/bot") },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="mobile-bottom-nav"
    >
      <ul className="grid grid-cols-5 h-16">
        {NAV_ITEMS.map((item) => {
          const active = item.match(location);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:text-primary"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
