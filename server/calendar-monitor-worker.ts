import { storage } from "./storage";
import { isCalendarConnected } from "./google-calendar-service";

let lastCalendarStatus: boolean | null = null;
let workerInterval: NodeJS.Timeout | null = null;

export async function checkCalendarConnection(): Promise<{ connected: boolean; wasDisconnected: boolean; isFirstCheck: boolean }> {
  const status = await isCalendarConnected();
  const wasConnected = lastCalendarStatus;
  const wasDisconnected = wasConnected === true && status.connected === false;
  const isFirstCheck = lastCalendarStatus === null;
  
  lastCalendarStatus = status.connected;
  
  return { connected: status.connected, wasDisconnected, isFirstCheck };
}

async function createDisconnectionNotification(): Promise<void> {
  const existingNotifications = await storage.getNotifiche();
  const hasRecentCalendarNotification = existingNotifications.some(
    n => n.tipo === "calendario_disconnesso" && !n.letta && !n.archiviata
  );
  
  if (!hasRecentCalendarNotification) {
    await storage.createNotifica({
      tipo: "calendario_disconnesso",
      titolo: "Google Calendar disconnesso",
      messaggio: "Il calendario Google si è disconnesso. Gli appuntamenti non verranno sincronizzati. Vai su Impostazioni > Calendario per ricollegare.",
      priorita: 1,
      letta: false,
      archiviata: false,
    });
    console.log("[CalendarMonitor] Created disconnection notification");
  }
}

async function runCheck(): Promise<void> {
  try {
    const result = await checkCalendarConnection();
    console.log(`[CalendarMonitor] Check result: connected=${result.connected}, wasDisconnected=${result.wasDisconnected}, isFirstCheck=${result.isFirstCheck}`);
    
    if (result.wasDisconnected) {
      console.log("[CalendarMonitor] Calendar disconnected! Creating notification...");
      await createDisconnectionNotification();
    }
    
    if (!result.connected && result.isFirstCheck) {
      console.log("[CalendarMonitor] First check: calendar not connected, checking for existing notification...");
      await createDisconnectionNotification();
    }
  } catch (error) {
    console.error("[CalendarMonitor] Error checking calendar connection:", error);
  }
}

export function startCalendarMonitorWorker(intervalMinutes: number = 10): void {
  console.log(`[CalendarMonitor] Starting worker (checking every ${intervalMinutes} minutes)`);
  
  setTimeout(() => {
    runCheck();
  }, 5000);
  
  workerInterval = setInterval(() => {
    runCheck();
  }, intervalMinutes * 60 * 1000);
}

export function stopCalendarMonitorWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[CalendarMonitor] Worker stopped");
  }
}
