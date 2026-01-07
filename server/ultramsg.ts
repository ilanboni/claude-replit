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
