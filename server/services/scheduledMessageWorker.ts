import { storage } from "../storage";
import { sendWhatsAppMessage } from "../ultramsg";
import { processChatbotMessage } from "./chatbotService";
import { whatsappWS } from "../websocket";

let isProcessing = false;
let workerInterval: NodeJS.Timeout | null = null;

const APPOINTMENT_PATTERNS = [
  /\b(\d{1,2}[:.]\d{2})\b/,
  /\b(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\b/i,
  /\b(mattina|pomeriggio|sera)\b/i,
  /\b(ore\s+\d{1,2})\b/i,
  /\b(alle\s+\d{1,2})\b/i,
  /\b(tra le\s+\d{1,2})\b/i,
  /\b(fascia|orario|appuntamento|visita|incontro|fissare|confermare)\b/i,
  /\b(disponibil[ei]|preferisce|andrebbe bene|va bene)\b/i,
];

function containsAppointmentProposal(text: string): boolean {
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const pattern of APPOINTMENT_PATTERNS) {
    if (pattern.test(lowerText)) {
      matchCount++;
    }
  }
  return matchCount >= 2;
}

export async function processScheduledMessages(): Promise<void> {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  try {
    const pendingMessages = await storage.getPendingScheduledMessages();
    
    if (pendingMessages.length > 0) {
      console.log(`[ScheduledWorker] Found ${pendingMessages.length} pending messages to process`);
    }
    
    for (const scheduled of pendingMessages) {
      const currentAttempts = (scheduled.attempts || 0) + 1;
      
      try {
        await storage.updateScheduledBotMessage(scheduled.id, { 
          status: "processing"
        });
        
        console.log(`[ScheduledWorker] Processing message ${scheduled.id} for ${scheduled.phoneNumber} (attempt ${currentAttempts})`);
        
        const botResponse = await processChatbotMessage(
          scheduled.campaignMessageId,
          scheduled.phoneNumber,
          scheduled.userMessage
        );
        
        if (botResponse) {
          console.log(`[ScheduledWorker] Generated response: ${botResponse.substring(0, 100)}...`);
          
          if (containsAppointmentProposal(botResponse)) {
            console.log(`[ScheduledWorker] ⚠️ Response contains appointment/time proposal - holding for approval`);
            
            await storage.updateScheduledBotMessage(scheduled.id, {
              status: "pending_approval",
              botResponse: botResponse,
              attempts: currentAttempts
            });
            
            const conversation = await storage.getWhatsappConversation(scheduled.conversationId);
            const contactName = conversation?.nome || scheduled.phoneNumber;
            
            await storage.createNotifica({
              tipo: "sistema",
              titolo: `🤖 Bot: risposta da approvare per ${contactName}`,
              messaggio: `Il bot ha generato una risposta che propone orari/appuntamenti per ${contactName} (${scheduled.phoneNumber}).\n\nRisposta proposta:\n"${botResponse}"\n\nMessaggio del cliente:\n"${scheduled.userMessage}"\n\nVai su WhatsApp per approvare o modificare la risposta.`,
              letta: false,
              archiviata: false,
              priorita: 1,
            });
            
            if (whatsappWS) {
              whatsappWS.broadcast({
                type: "bot_approval_needed",
                scheduledMessageId: scheduled.id,
                conversationId: scheduled.conversationId,
                phoneNumber: scheduled.phoneNumber,
                contactName,
                botResponse,
                userMessage: scheduled.userMessage,
              });
            }
            
            continue;
          }
          
          const sendResult = await sendWhatsAppMessage(scheduled.phoneNumber, botResponse);
          
          if (sendResult.success) {
            console.log(`[ScheduledWorker] Response sent successfully to ${scheduled.phoneNumber}`);
            
            const botMessage = await storage.createWhatsappMessage({
              conversationId: scheduled.conversationId,
              whatsappMessageId: sendResult.messageId || null,
              direction: "outbound",
              messageType: "chat",
              content: botResponse,
              mediaUrl: null,
              status: "sent"
            });
            
            await storage.updateWhatsappConversation(scheduled.conversationId, {
              ultimoMessaggio: botResponse.substring(0, 100),
              ultimoMessaggioData: new Date()
            });
            
            if (whatsappWS) {
              const finalConversation = await storage.getWhatsappConversation(scheduled.conversationId);
              whatsappWS.notifyNewMessage(scheduled.conversationId, { ...botMessage, conversationId: scheduled.conversationId });
              if (finalConversation) {
                whatsappWS.notifyConversationUpdate({ ...finalConversation, conversationId: finalConversation.id });
              }
            }
            
            await storage.updateScheduledBotMessage(scheduled.id, {
              status: "sent",
              sentAt: new Date(),
              botResponse: botResponse,
              attempts: currentAttempts
            });
            
          } else {
            throw new Error(`Failed to send: ${sendResult.error}`);
          }
        } else {
          await storage.updateScheduledBotMessage(scheduled.id, {
            status: "failed",
            lastError: "No response generated by bot",
            attempts: currentAttempts
          });
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[ScheduledWorker] Error processing message ${scheduled.id}:`, errorMessage);
        
        if (currentAttempts >= 3) {
          await storage.updateScheduledBotMessage(scheduled.id, {
            status: "failed",
            lastError: errorMessage,
            attempts: currentAttempts
          });
          console.log(`[ScheduledWorker] Message ${scheduled.id} marked as failed after ${currentAttempts} attempts`);
        } else {
          await storage.updateScheduledBotMessage(scheduled.id, {
            status: "pending",
            lastError: errorMessage,
            attempts: currentAttempts
          });
          console.log(`[ScheduledWorker] Message ${scheduled.id} requeued for retry (attempt ${currentAttempts}/3)`);
        }
      }
    }
    
  } catch (error) {
    console.error("[ScheduledWorker] Error in worker loop:", error);
  } finally {
    isProcessing = false;
  }
}

export function startScheduledMessageWorker(): void {
  if (workerInterval) {
    console.log("[ScheduledWorker] Worker already running");
    return;
  }
  
  console.log("[ScheduledWorker] Starting worker (polling every 30 seconds)");
  
  processScheduledMessages();
  
  workerInterval = setInterval(processScheduledMessages, 30 * 1000);
}

export function stopScheduledMessageWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[ScheduledWorker] Worker stopped");
  }
}
