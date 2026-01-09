import OpenAI from "openai";
import { storage } from "../storage";
import type { WhatsappCampaign, CampaignMessage, BotConversationLog, ImmobileEsterno } from "@shared/schema";
import { BOT_CONFIG, FOLLOWUP_BOT_CONFIG, checkForObjection, generateBotSystemPrompt } from "../bot-config";

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

function analyzeClientPersonality(conversationHistory: BotConversationLog[], currentMessage?: string): string {
  // Analizza i messaggi precedenti + il messaggio corrente
  const historyMessages = conversationHistory.map(log => log.userMessage);
  
  // Aggiungi il messaggio corrente per analisi anche al primo contatto
  if (currentMessage) {
    historyMessages.push(currentMessage);
  }
  
  if (historyMessages.length === 0) {
    return "";
  }

  const allMessages = historyMessages.join(" ");
  const messageCount = historyMessages.length;
  
  // Indicatori di personalità basati sui messaggi
  const indicators: string[] = [];
  
  // Lunghezza messaggi (conciso vs prolisso)
  const avgLength = allMessages.length / messageCount;
  if (avgLength < 50) {
    indicators.push("CONCISO: Il cliente scrive messaggi brevi e diretti. Rispondi in modo altrettanto conciso.");
  } else if (avgLength > 200) {
    indicators.push("PROLISSO: Il cliente scrive messaggi dettagliati. Puoi essere leggermente più espansivo nelle risposte.");
  }
  
  // Formalità
  const formalWords = ["gentilmente", "cortesemente", "la prego", "distinti saluti", "cordiali saluti", "egregio", "spettabile"];
  const informalWords = ["ciao", "ok", "va bene", "sì", "no", "grazie mille", "perfetto"];
  const hasFormality = formalWords.some(w => allMessages.toLowerCase().includes(w));
  const hasInformality = informalWords.some(w => allMessages.toLowerCase().includes(w));
  
  if (hasFormality && !hasInformality) {
    indicators.push("FORMALE: Il cliente usa un linguaggio molto formale. Mantieni un registro altrettanto formale.");
  } else if (hasInformality && !hasFormality) {
    indicators.push("INFORMALE: Il cliente usa un tono informale. Puoi essere leggermente più diretto mantenendo il Lei.");
  }
  
  // Emotività
  const emotionalWords = ["preoccupato", "urgente", "importante", "necessario", "devo", "ho bisogno", "problema"];
  const hasEmotional = emotionalWords.some(w => allMessages.toLowerCase().includes(w));
  if (hasEmotional) {
    indicators.push("EMOTIVO: Il cliente mostra preoccupazione o urgenza. Sii particolarmente empatico e rassicurante.");
  }
  
  // Pragmatico/Business
  const businessWords = ["prezzo", "costo", "provvigione", "mandato", "tempo", "quando", "quanto"];
  const hasBusiness = businessWords.some(w => allMessages.toLowerCase().includes(w));
  if (hasBusiness) {
    indicators.push("PRAGMATICO: Il cliente è orientato ai fatti e numeri. Sii concreto e diretto.");
  }
  
  // Scettico
  const skepticWords = ["non credo", "non sono sicuro", "forse", "vedremo", "ci penso", "non so"];
  const hasSkeptic = skepticWords.some(w => allMessages.toLowerCase().includes(w));
  if (hasSkeptic) {
    indicators.push("SCETTICO: Il cliente mostra dubbi. Non forzare, offri valore e rassicurazione senza pressing.");
  }

  if (indicators.length === 0) {
    return "";
  }

  return `
=== MIRRORING LINGUISTICO (ADATTA IL TUO STILE) ===
Basandoti sui messaggi precedenti del cliente, sono emersi questi tratti:
${indicators.join("\n")}

IMPORTANTE: Adatta il tuo linguaggio per creare empatia. Usa parole e frasi simili a quelle del cliente.
Se il cliente usa termini tecnici, usali anche tu. Se è sintetico, sii sintetico. Se è formale, sii formale.`;
}

function buildSystemPrompt(context: BotContext, currentUserMessage?: string): string {
  const { propertyDetails, conversationHistory } = context;
  
  // Analizza la personalità del cliente per il mirroring (include messaggio corrente)
  const personalityAnalysis = analyzeClientPersonality(conversationHistory, currentUserMessage);
  
  // Determina quale configurazione usare basandosi sulla storia della conversazione:
  // - Se c'è già una storia (follow-up) -> usa FOLLOWUP_BOT_CONFIG con framework EARA
  // - Se è il primo messaggio del cliente -> usa BOT_CONFIG originale
  const isFollowUp = conversationHistory.length > 0;
  
  console.log(`[ChatBot] Building prompt with ${isFollowUp ? 'FOLLOWUP_BOT_CONFIG (EARA)' : 'BOT_CONFIG (initial)'} - history: ${conversationHistory.length} messages`);
  
  // Per i follow-up (risposte ai messaggi successivi dei clienti) usa FOLLOWUP_BOT_CONFIG con framework EARA
  if (isFollowUp) {
    const cfg = FOLLOWUP_BOT_CONFIG;
    
    const priceStr = propertyDetails.price ? `€${propertyDetails.price.toLocaleString("it-IT")}` : "Da definire";
    const sizeStr = propertyDetails.size ? `${propertyDetails.size}m²` : "Non specificata";
    const allowedActions = cfg.conversation_rules.allowed_actions.map(a => `- ${a}`).join("\n");
    const forbiddenActions = cfg.conversation_rules.forbidden_actions.map(a => `- ${a}`).join("\n");
    const earaSteps = cfg.objection_framework.steps.map(s => `**${s.step} - ${s.label}:** ${s.examples[0]}`).join("\n");
    const objectionResponses = cfg.auto_objections.map(obj => `Se dice: ${obj.keywords.slice(0, 3).join(", ")}...
Rispondi: "${obj.response.substring(0, 150)}..."`).join("\n\n");
    
    return `Sei ${cfg.bot_profile.identity.role}.
${cfg.bot_profile.identity.positioning}

=== IDENTITÀ ===
Se ti chiedono se sei un'IA: "${cfg.bot_profile.identity.transparency_if_asked_ai}"

=== IMMOBILE IN DISCUSSIONE ===
- Indirizzo: ${propertyDetails.address || "Non specificato"}
- Prezzo: ${priceStr}
- Dimensione: ${sizeStr}

=== STILE DI COMUNICAZIONE ===
- Formalità: ${cfg.bot_profile.voice.formality}
- Tono: ${cfg.bot_profile.voice.tone}
- Stile: ${cfg.bot_profile.voice.style}
- MAI: ${cfg.bot_profile.voice.never.join(", ")}
${personalityAnalysis}

=== OBIETTIVI ===
- Primario: ${cfg.conversation_rules.primary_goal}
- Secondario: ${cfg.conversation_rules.secondary_goal}

=== METODO CONVERSAZIONE ===
- Rapporto ascolto/parlare: ${cfg.conversation_rules.method.listen_ratio}
- Usa validazione e parafrasi

=== AZIONI PERMESSE ===
${allowedActions}

=== AZIONI VIETATE ===
${forbiddenActions}

=== FRAMEWORK OBIEZIONI: EARA ===
Quando il proprietario solleva un'obiezione, segui questi passaggi:
${earaSteps}

=== RISPOSTE OBIEZIONI ===
${objectionResponses}

=== ESCALATION ===
Passa al Dott. Boni se: ${cfg.handoff_rules.when_to_escalate_to_human.join(", ")}
Messaggio: "${cfg.handoff_rules.handoff_message}"

=== ISTRUZIONI FINALI ===
1. Rispondi SOLO in italiano
2. Messaggi BREVI (max 3-4 frasi, stile WhatsApp)
3. Segui SEMPRE il framework EARA per le obiezioni
4. NON inventare informazioni
5. L'obiettivo è SEMPRE proporre un incontro breve
6. USA IL MIRRORING: Adatta il tuo linguaggio allo stile del cliente`;
  }
  
  // Per il primo messaggio usa BOT_CONFIG originale
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
${personalityAnalysis}

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
5. L'obiettivo è SEMPRE proporre un incontro breve
6. USA IL MIRRORING: Adatta il tuo linguaggio allo stile del cliente`;
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
      { role: "system", content: buildSystemPrompt(context, userMessage) }
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
