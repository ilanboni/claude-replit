import OpenAI from "openai";
import { storage } from "../storage";
import type { WhatsappCampaign, CampaignMessage, BotConversationLog, ImmobileEsterno } from "@shared/schema";
import { BOT_CONFIG, checkForObjection, generateBotSystemPrompt } from "../bot-config";

interface BotContext {
  campaign: WhatsappCampaign;
  campaignMessage: CampaignMessage;
  conversationHistory: BotConversationLog[];
  propertyDetails: {
    address?: string;
    price?: number;
    size?: number;
    type?: string;
  };
}

interface BotResponse {
  message: string;
  intent: string | null;
  confidence: number | null;
  shouldEndConversation: boolean;
  suggestedActions: string[];
}

function buildSystemPrompt(context: BotContext): string {
  const { propertyDetails } = context;
  const cfg = BOT_CONFIG;
  
  return `Sei "${cfg.bot_name}". ${cfg.identity.presentation}

=== CHI SEI ===
${cfg.identity.background}
${cfg.identity.positioning}

=== IMMOBILE IN DISCUSSIONE ===
- Indirizzo: ${propertyDetails.address || "Non specificato"}
- Prezzo: ${propertyDetails.price ? `€${propertyDetails.price.toLocaleString("it-IT")}` : "Da definire"}
- Dimensione: ${propertyDetails.size ? `${propertyDetails.size}m²` : "Non specificata"}

=== STILE DI COMUNICAZIONE ===
- Dai SEMPRE del Lei
- Frasi ${cfg.language.style.sentences}
- Tono: ${cfg.language.style.tone}
- EVITA: ${cfg.language.style.avoid.join(", ")}

=== OBIETTIVI ===
Primario: ${cfg.goals.primary}
Secondario: ${cfg.goals.secondary}

=== REGOLE COMPORTAMENTALI (SEGUI SEMPRE) ===
${cfg.global_behavior_rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

=== STRATEGIA CONVERSAZIONE ===
Struttura risposta: ${cfg.conversation_strategy.structure.join(" → ")}

Frasi per proporre appuntamento:
${cfg.conversation_strategy.appointment_phrases.map(p => `- "${p}"`).join("\n")}

Per chiedere disponibilità:
${cfg.conversation_strategy.time_suggestions.map(p => `- "${p}"`).join("\n")}

=== GESTIONE OBIEZIONI ===
${cfg.objection_handlers.map(h => `
**${h.name.toUpperCase()}**
Se il proprietario dice: ${h.triggers.join(", ")}
Rispondi:
${h.responses.map(r => `- "${r}"`).join("\n")}`).join("\n")}

=== DOMANDE TECNICHE ===
"${cfg.technical_question_redirect.response}"

=== FALLBACK ===
"${cfg.fallback.response}"

=== CHIUSURA ===
Se appuntamento fissato: "${cfg.closing_templates.with_appointment[0]}"
Se non interessato: "${cfg.closing_templates.without_appointment[0]}"
Firma: "${cfg.closing_templates.signature}"

=== ISTRUZIONI FINALI ===
1. Rispondi SOLO in italiano
2. Messaggi BREVI (max 3-4 frasi, stile WhatsApp)
3. Segui SEMPRE: Empatia → Ricalco → Valore incontro → Proposta appuntamento
4. NON inventare informazioni
5. L'obiettivo è SEMPRE proporre un incontro breve`;
}

export async function generateBotResponse(
  userMessage: string,
  context: BotContext
): Promise<BotResponse> {
  try {
    const openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(context) }
    ];

    for (const log of context.conversationHistory) {
      messages.push(
        { role: "user", content: log.userMessage },
        { role: "assistant", content: log.botResponse }
      );
    }
    messages.push({ role: "user", content: userMessage });

    const intentCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 200,
      tools: [{
        type: "function",
        function: {
          name: "analyze_intent",
          parameters: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["schedule_visit", "ask_price", "ask_details", "not_interested", 
                       "already_sold", "wants_callback", "negotiation", "general_question", "unclear"]
              },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              should_end: { type: "boolean" },
              suggested_actions: { type: "array", items: { type: "string" } }
            },
            required: ["intent", "confidence", "should_end", "suggested_actions"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "analyze_intent" } }
    });

    let intent = null, confidence = null, shouldEnd = false, suggestedActions: string[] = [];
    const toolCall = intentCompletion.choices[0]?.message?.tool_calls?.[0] as any;
    if (toolCall?.function?.arguments) {
      try {
        const analysis = JSON.parse(toolCall.function.arguments);
        intent = analysis.intent;
        confidence = analysis.confidence;
        shouldEnd = analysis.should_end;
        suggestedActions = analysis.suggested_actions || [];
      } catch (e) {
        console.error("[ChatBot] Error parsing intent analysis:", e);
      }
    }

    const textCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 200
    });

    const botMessage = textCompletion.choices[0]?.message?.content?.trim() 
      || "Grazie per il messaggio. Un nostro agente ti contatterà a breve.";

    return { message: botMessage, intent, confidence, shouldEndConversation: shouldEnd, suggestedActions };
  } catch (error) {
    console.error("[ChatBot] Error generating response:", error);
    return {
      message: "Grazie per il messaggio. Un nostro agente ti contatterà a breve.",
      intent: "unclear", 
      confidence: null, 
      shouldEndConversation: false,
      suggestedActions: ["Contatto manuale richiesto"]
    };
  }
}

export async function processChatbotMessage(
  campaignMessageId: number,
  phoneNumber: string,
  userMessage: string
): Promise<string> {
  const campaignMessage = await storage.getCampaignMessage(campaignMessageId);
  if (!campaignMessage) throw new Error(`Campaign message ${campaignMessageId} not found`);

  const campaign = await storage.getWhatsappCampaign(campaignMessage.campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignMessage.campaignId} not found`);

  const conversationHistory = await storage.getBotConversationLogs(campaignMessageId);

  let propertyDetails: BotContext["propertyDetails"] = {};
  if (campaignMessage.immobileEsternoId) {
    const property = await storage.getImmobileEsterno(campaignMessage.immobileEsternoId);
    if (property) {
      propertyDetails = {
        address: property.indirizzo || undefined,
        price: property.prezzo ? Number(property.prezzo) : undefined,
        size: property.mq || undefined,
        type: "Appartamento"
      };
    }
  }

  const context: BotContext = {
    campaign,
    campaignMessage,
    conversationHistory,
    propertyDetails
  };

  const botResponse = await generateBotResponse(userMessage, context);

  await storage.createBotConversationLog({
    campaignMessageId,
    phoneNumber,
    userMessage,
    botResponse: botResponse.message,
    intent: botResponse.intent,
    confidence: botResponse.confidence,
    metadata: {
      shouldEndConversation: botResponse.shouldEndConversation,
      suggestedActions: botResponse.suggestedActions
    }
  });

  const updateData: Partial<typeof campaignMessage> = {
    response: userMessage,
    respondedAt: new Date(),
    lastBotMessage: botResponse.message,
    lastBotMessageAt: new Date(),
  };
  
  if (botResponse.shouldEndConversation) {
    updateData.conversationActive = false;
  }

  await storage.updateCampaignMessage(campaignMessageId, updateData);

  return botResponse.message;
}

export async function isBotActiveForMessage(campaignMessageId: number): Promise<boolean> {
  const cm = await storage.getCampaignMessage(campaignMessageId);
  return cm?.conversationActive || false;
}
