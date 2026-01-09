import { google } from "googleapis";
import { storage } from "./storage";
import type { CalendarEvent, InsertCalendarEvent } from "@shared/schema";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

let oauth2Client: any = null;

function getOAuth2Client() {
  if (!oauth2Client) {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/calendar/callback`
    );
  }
  return oauth2Client;
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function handleCallback(code: string): Promise<{ email: string }> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  
  client.setCredentials(tokens);
  
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || "";
  
  await storage.upsertOauthToken("google_calendar", {
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: JSON.stringify({ email, scopes: SCOPES }),
  });
  
  return { email };
}

async function getAuthenticatedClient() {
  const token = await storage.getOauthToken("google_calendar");
  if (!token || !token.accessToken) {
    return null;
  }
  
  const client = getOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt?.getTime(),
  });
  
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await storage.upsertOauthToken("google_calendar", {
        accessToken: credentials.access_token || "",
        refreshToken: credentials.refresh_token || token.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        scope: token.scope,
      });
      client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to refresh Google Calendar token:", error);
      return null;
    }
  }
  
  return client;
}

export async function isCalendarConnected(): Promise<{ connected: boolean; email?: string }> {
  const token = await storage.getOauthToken("google_calendar");
  if (!token || !token.accessToken) {
    return { connected: false };
  }
  let email: string | undefined;
  try {
    const scopeData = token.scope ? JSON.parse(token.scope) : {};
    email = scopeData.email;
  } catch {}
  return { connected: true, email };
}

export async function createGoogleCalendarEvent(event: CalendarEvent): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
  const client = await getAuthenticatedClient();
  if (!client) {
    return { success: false, error: "Not authenticated with Google Calendar" };
  }
  
  const calendar = google.calendar({ version: "v3", auth: client });
  
  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: new Date(event.startDate).toISOString(),
          timeZone: "Europe/Rome",
        },
        end: {
          dateTime: event.endDate ? new Date(event.endDate).toISOString() : new Date(new Date(event.startDate).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: "Europe/Rome",
        },
      },
    });
    
    return { success: true, googleEventId: response.data.id || undefined };
  } catch (error: any) {
    console.error("Error creating Google Calendar event:", error);
    return { success: false, error: error.message };
  }
}

export async function syncEventToGoogleCalendar(eventId: number): Promise<{ success: boolean; error?: string }> {
  const event = await storage.getCalendarEvent(eventId);
  if (!event) {
    return { success: false, error: "Event not found" };
  }
  
  if (event.syncStatus === "synced" && event.googleEventId) {
    return { success: true };
  }
  
  const result = await createGoogleCalendarEvent(event);
  
  if (result.success && result.googleEventId) {
    await storage.updateCalendarEvent(eventId, {
      syncStatus: "synced",
      googleEventId: result.googleEventId,
      lastSyncAt: new Date(),
    });
    return { success: true };
  } else {
    await storage.updateCalendarEvent(eventId, {
      syncStatus: "failed",
      syncError: result.error || "Unknown error",
    });
    return { success: false, error: result.error };
  }
}

export function isGoogleCalendarConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
}
