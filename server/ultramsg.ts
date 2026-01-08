const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
const ULTRAMSG_API_KEY = process.env.ULTRAMSG_API_KEY;

interface UltraMsgResponse {
  sent: string;
  message: string;
  id?: string;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_API_KEY) {
    console.error("UltraMsg credentials not configured");
    return { success: false, error: "UltraMsg non configurato" };
  }

  let phoneNumber = to.replace(/\D/g, '');
  if (!phoneNumber.startsWith('39') && phoneNumber.length === 10) {
    phoneNumber = '39' + phoneNumber;
  }

  const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: ULTRAMSG_API_KEY,
        to: phoneNumber,
        body: body,
      }),
    });

    const data = await response.json() as UltraMsgResponse;
    
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
