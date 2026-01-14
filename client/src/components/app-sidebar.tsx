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
  TrendingUp,
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

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clienti", url: "/clienti", icon: Users },
  { title: "Immobili", url: "/immobili", icon: Building2 },
  { title: "Richieste", url: "/richieste", icon: FileText },
  { title: "Comunicazioni", url: "/comunicazioni", icon: MessageSquare },
  { title: "Appuntamenti", url: "/appuntamenti", icon: Calendar },
  { title: "Conferma Appuntamenti", url: "/conferma-appuntamenti", icon: CalendarCheck },
  { title: "Attività", url: "/attivita", icon: ClipboardList },
  { title: "Matching", url: "/matching", icon: Sparkles },
  { title: "Acquisizione", url: "/acquisizione", icon: Search },
  { title: "Mercato", url: "/mercato", icon: TrendingUp },
  { title: "Bot WhatsApp", url: "/bot", icon: Bot },
  { title: "WhatsApp Chat", url: "/whatsapp", icon: Phone },
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
            <h1 className="text-lg font-semibold">ImmoGest</h1>
            <p className="text-xs text-muted-foreground">CRM Immobiliare</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principale</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase()}`}
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
