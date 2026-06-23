import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  MessageSquare,
  Calendar,
  CalendarCheck,
  Sparkles,
  Search,
  Settings,
  Bot,
  Phone,
  ClipboardList,
  ListChecks,
  TrendingUp,
  Inbox,
  Kanban,
  Terminal,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const groups = [
  {
    label: "Oggi",
    items: [
      { title: "Oggi", url: "/", icon: LayoutDashboard },
      { title: "Promemoria", url: "/promemoria", icon: ListChecks },
      { title: "Appuntamenti", url: "/appuntamenti", icon: Calendar },
    ],
  },
  {
    label: "Clienti",
    items: [
      { title: "Clienti", url: "/clienti", icon: Users },
      { title: "Richieste", url: "/richieste", icon: FileText },
      { title: "Matching", url: "/matching", icon: Sparkles },
    ],
  },
  {
    label: "Acquisizione",
    items: [
      { title: "Pluricondivisi", url: "/pluricondivisi", icon: Building2 },
      { title: "Acquisizione", url: "/acquisizione", icon: Search },
      { title: "Mercato", url: "/mercato", icon: TrendingUp },
      { title: "Pipeline privati", url: "/pipeline-privati", icon: Kanban },
    ],
  },
  {
    label: "Messaggi",
    items: [
      { title: "Bozze in attesa", url: "/bozze", icon: Inbox },
      { title: "WhatsApp", url: "/whatsapp", icon: Phone },
      { title: "Bot WhatsApp", url: "/bot", icon: Bot },
      { title: "Comunicazioni", url: "/comunicazioni", icon: MessageSquare },
    ],
  },
  {
    label: "Altro",
    items: [
      { title: "Immobili", url: "/immobili", icon: Building2 },
      { title: "Attività", url: "/attivita", icon: ClipboardList },
      { title: "Conferma appuntamenti", url: "/conferma-appuntamenti", icon: CalendarCheck },
      { title: "Analytics", url: "/analytics-outreach", icon: TrendingUp },
      { title: "Operativo", url: "/operativo", icon: Sparkles },
      { title: "Comandi", url: "/comandi", icon: Terminal },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Cavour</h1>
            <p className="text-xs text-muted-foreground">CRM Immobiliare</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    location === item.url ||
                    (item.url !== "/" && location.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="link-settings">
              <Link href="/impostazioni">
                <Settings className="h-4 w-4" />
                <span>Impostazioni</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
