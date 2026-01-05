import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Calendar, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Notifica {
  tipo: 'appuntamento' | 'compleanno';
  id: number;
  messaggio: string;
  dettaglio: string;
  data: string;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: notifiche = [] } = useQuery<Notifica[]>({
    queryKey: ["/api/notifiche"],
    refetchInterval: 60000,
  });

  const handleClick = (notifica: Notifica) => {
    if (notifica.tipo === 'appuntamento') {
      navigate('/appuntamenti');
    } else {
      navigate(`/clienti/${notifica.id}`);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {notifiche.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {notifiche.length > 9 ? '9+' : notifiche.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <h4 className="font-semibold">Notifiche</h4>
        </div>
        {notifiche.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            Nessuna notifica
          </div>
        ) : (
          <div className="max-h-80 overflow-auto">
            {notifiche.map((n, i) => (
              <button
                key={`${n.tipo}-${n.id}-${i}`}
                onClick={() => handleClick(n)}
                className="w-full flex items-start gap-3 p-3 hover-elevate text-left border-b last:border-b-0"
                data-testid={`notification-${n.tipo}-${n.id}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full 
                  ${n.tipo === 'appuntamento' ? 'bg-blue-500/10 text-blue-600' : 'bg-pink-500/10 text-pink-600'}`}
                >
                  {n.tipo === 'appuntamento' ? (
                    <Calendar className="h-4 w-4" />
                  ) : (
                    <Gift className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.messaggio}</p>
                  <p className="text-xs text-muted-foreground">{n.dettaglio}</p>
                  {n.tipo === 'appuntamento' && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {n.tipo === 'appuntamento' ? 'App' : 'Compl'}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
