const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
const ULTRAMSG_API_KEY = process.env.ULTRAMSG_API_KEY;

interface UltraMsgResponse {
  sent: string;
  message: string;
  id?: string;
}

// Normalizza un numero di telefono italiano al formato internazionale (39xxxxxxxxxx)
export function normalizeItalianPhone(phone: string): string {
  // Rimuovi tutti i caratteri non numerici
  let cleaned = phone.replace(/\D/g, '');
  
  // Rimuovi eventuale prefisso 0039
  if (cleaned.startsWith('0039')) {
    cleaned = cleaned.slice(4);
  }
  // Rimuovi eventuale prefisso 39 iniziale per riaggiungerlo uniformemente
  else if (cleaned.startsWith('39') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }
  
  // Se è un numero italiano (10 cifre che inizia con 3), aggiungi 39
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return '39' + cleaned;
  }
  
  // Se è già nel formato corretto (12 cifre che inizia con 39)
  if (cleaned.length === 12 && cleaned.startsWith('39')) {
    return cleaned;
  }
  
  // Per altri formati, aggiungi 39 se sembra un numero italiano senza prefisso
  if (cleaned.length === 10) {
    return '39' + cleaned;
  }
  
  return cleaned;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_API_KEY) {
    console.error("UltraMsg credentials not configured");
    return { success: false, error: "UltraMsg non configurato" };
  }

  const phoneNumber = normalizeItalianPhone(to);
  console.log(`[WhatsApp] Normalizing phone: "${to}" -> "${phoneNumber}"`);

  const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: ULTRAMSG_API_KEY,
        to: phoneNumber,
        body: body,
      }),
    });

    const rawText = await response.text();
    console.log(`[WhatsApp] API response status=${response.status}, body=${rawText.slice(0, 500)}`);

    let data: UltraMsgResponse;
    try {
      data = JSON.parse(rawText) as UltraMsgResponse;
    } catch (parseErr) {
      console.error(`[WhatsApp] Non-JSON response from UltraMsg: ${rawText.slice(0, 200)}`);
      return { success: false, error: `Risposta non valida da UltraMsg: ${rawText.slice(0, 100)}` };
    }
    
    if (data.sent === 'true' || data.sent === true as any) {
      console.log(`WhatsApp message sent to ${phoneNumber}:`, data);
      return { success: true, messageId: data.id };
    } else {
      console.error(`Failed to send WhatsApp to ${phoneNumber}:`, data);
      return { success: false, error: data.message || 'Invio fallito' };
    }
  } catch (error) {
    console.error("UltraMsg API error:", error);
    return { success: false, error: String(error) };
  }
}

export function isUltraMsgConfigured(): boolean {
  return !!(ULTRAMSG_INSTANCE_ID && ULTRAMSG_API_KEY);
}

interface UltraMsgMessage {
  id: number;
  from: string;
  to: string;
  body: string;
  type: string;
  ack: string;
  created_at: number;
  sent_at?: number;
  metadata?: Record<string, unknown>;
}

interface UltraMsgMessagesResponse {
  total: number;
  pages: number;
  limit: number;
  page: number;
  messages: UltraMsgMessage[];
}

export async function fetchRecentMessages(limit: number = 20): Promise<{ success: boolean; messages?: UltraMsgMessage[]; error?: string }> {
  if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_API_KEY) {
    return { success: false, error: "UltraMsg non configurato" };
  }

  const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages?token=${ULTRAMSG_API_KEY}&limit=${limit}&sort=desc`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as UltraMsgMessagesResponse;
    
    if (data.messages) {
      return { success: true, messages: data.messages };
    } else {
      return { success: false, error: 'Nessun messaggio trovato' };
    }
  } catch (error) {
    console.error("UltraMsg fetch messages error:", error);
    return { success: false, error: String(error) };
  }
}

export async function fetchChats(): Promise<{ success: boolean; chats?: any[]; error?: string }> {
  if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_API_KEY) {
    return { success: false, error: "UltraMsg non configurato" };
  }

  const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/chats?token=${ULTRAMSG_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return { success: true, chats: data };
    } else {
      return { success: false, error: 'Formato risposta non valido' };
    }
  } catch (error) {
    console.error("UltraMsg fetch chats error:", error);
    return { success: false, error: String(error) };
  }
}
