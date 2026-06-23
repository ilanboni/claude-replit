import { Link, useLocation } from "wouter";
import { Home, ListChecks, Users, Building2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation per mobile (visibile solo < md breakpoint).
 * 5 tab: Oggi · Da fare · Clienti · Immobili · Altro.
 * Ogni tab è l'ingresso di una categoria (match copre le pagine collegate),
 * così tutto resta raggiungibile dal telefono.
 */
const NAV_ITEMS = [
  { href: "/", label: "Oggi", icon: Home, match: (p: string) => p === "/" },
  { href: "/promemoria", label: "Da fare", icon: ListChecks, match: (p: string) => p.startsWith("/promemoria") },
  { href: "/clienti", label: "Clienti", icon: Users, match: (p: string) => p.startsWith("/clienti") || p.startsWith("/richieste") || p.startsWith("/matching") || p.startsWith("/appuntamenti") },
  { href: "/immobili", label: "Immobili", icon: Building2, match: (p: string) => p.startsWith("/immobili") || p.startsWith("/acquisizione") || p.startsWith("/mercato") || p.startsWith("/pluricondivisi") || p.startsWith("/bozze") || p.startsWith("/pipeline-privati") },
  { href: "/impostazioni-pwa", label: "Altro", icon: Menu, match: (p: string) => p.startsWith("/impostazioni") || p.startsWith("/bot") || p.startsWith("/whatsapp") || p.startsWith("/comunicazioni") || p.startsWith("/attivita") || p.startsWith("/analytics") || p.startsWith("/operativo") || p.startsWith("/comandi") },
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
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
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
