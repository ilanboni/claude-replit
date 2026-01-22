import { storage } from "./storage";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const IDEALISTA_EMAIL = process.env.IDEALISTA_EMAIL;
const IDEALISTA_PASSWORD = process.env.IDEALISTA_PASSWORD;

interface IdealistaConversation {
  conversationId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  propertyRef: string | null;
  propertyTitle: string | null;
  messages: Array<{
    sender: 'contact' | 'agent';
    content: string;
    timestamp: string;
  }>;
  lastMessageDate: string;
}

interface ImportResult {
  success: boolean;
  conversationsFound: number;
  messagesImported: number;
  clientsMatched: number;
  errors: string[];
}

export function isIdealistaConfigured(): boolean {
  return !!(APIFY_API_TOKEN && IDEALISTA_EMAIL && IDEALISTA_PASSWORD);
}

async function runApifyActor(): Promise<IdealistaConversation[]> {
  if (!APIFY_API_TOKEN || !IDEALISTA_EMAIL || !IDEALISTA_PASSWORD) {
    throw new Error("Credenziali Idealista o token Apify non configurati");
  }

  const actorInput = {
    startUrls: [{ url: "https://www.idealista.it/login" }],
    linkSelector: "",
    pseudoUrls: [],
    pageFunction: `
      async function pageFunction(context) {
        const { page, request, log, enqueueLinks } = context;
        const url = request.url;
        
        // Step 1: Login
        if (url.includes('/login')) {
          log.info('Logging into Idealista...');
          
          // Wait for login form
          await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });
          
          // Fill credentials
          await page.type('input[name="email"], input[type="email"]', '${IDEALISTA_EMAIL}');
          await page.type('input[name="password"], input[type="password"]', '${IDEALISTA_PASSWORD}');
          
          // Click login button
          await page.click('button[type="submit"], input[type="submit"]');
          
          // Wait for redirect
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          
          // Navigate to conversations
          await page.goto('https://www.idealista.it/conversations', { waitUntil: 'networkidle2' });
          
          log.info('Navigated to conversations page');
        }
        
        // Step 2: Extract conversations from list
        if (url.includes('/conversations')) {
          log.info('Extracting conversations...');
          
          await page.waitForSelector('.conversation-item, .message-list-item, [data-conversation]', { timeout: 15000 }).catch(() => {});
          
          // Get all conversation links
          const conversations = await page.evaluate(() => {
            const items = document.querySelectorAll('.conversation-item, .message-list-item, [data-conversation], a[href*="/conversations/"]');
            return Array.from(items).map(item => {
              const link = item.querySelector('a') || item;
              return {
                id: link.href?.match(/conversations\\/([\\w-]+)/)?.[1] || '',
                name: item.querySelector('.contact-name, .user-name, .name')?.textContent?.trim() || '',
                preview: item.querySelector('.message-preview, .last-message, .preview')?.textContent?.trim() || '',
                date: item.querySelector('.date, .time, .timestamp')?.textContent?.trim() || ''
              };
            }).filter(c => c.id);
          });
          
          log.info(\`Found \${conversations.length} conversations\`);
          
          // For each conversation, extract full messages
          const fullConversations = [];
          for (const conv of conversations.slice(0, 20)) { // Limit to 20 most recent
            try {
              await page.goto(\`https://www.idealista.it/conversations/\${conv.id}\`, { waitUntil: 'networkidle2' });
              await page.waitForSelector('.message, .chat-message, [data-message]', { timeout: 10000 }).catch(() => {});
              
              const details = await page.evaluate(() => {
                // Extract contact info
                const contactName = document.querySelector('.contact-name, .user-name, h1, h2')?.textContent?.trim() || '';
                const contactPhone = document.querySelector('[href^="tel:"], .phone')?.textContent?.replace(/\\D/g, '') || null;
                const contactEmail = document.querySelector('[href^="mailto:"], .email')?.textContent?.trim() || null;
                
                // Extract property info
                const propertyRef = document.querySelector('.property-ref, .ref')?.textContent?.trim() || null;
                const propertyTitle = document.querySelector('.property-title, .property-name')?.textContent?.trim() || null;
                
                // Extract messages
                const messageElements = document.querySelectorAll('.message, .chat-message, [data-message]');
                const messages = Array.from(messageElements).map(msg => {
                  const isFromAgent = msg.classList.contains('sent') || msg.classList.contains('outgoing') || msg.classList.contains('mine');
                  return {
                    sender: isFromAgent ? 'agent' : 'contact',
                    content: msg.querySelector('.message-text, .content, .text, p')?.textContent?.trim() || msg.textContent?.trim() || '',
                    timestamp: msg.querySelector('.time, .timestamp, .date')?.textContent?.trim() || new Date().toISOString()
                  };
                });
                
                return { contactName, contactPhone, contactEmail, propertyRef, propertyTitle, messages };
              });
              
              if (details.messages.length > 0) {
                fullConversations.push({
                  conversationId: conv.id,
                  ...details,
                  lastMessageDate: conv.date || new Date().toISOString()
                });
              }
            } catch (err) {
              log.warning(\`Failed to extract conversation \${conv.id}: \${err.message}\`);
            }
          }
          
          return fullConversations;
        }
        
        return [];
      }
    `,
    proxyConfiguration: { useApifyProxy: true },
    maxConcurrency: 1,
    maxRequestRetries: 3,
    maxPagesPerCrawl: 25,
    waitUntil: "networkidle2"
  };

  console.log("[Idealista] Starting Apify Web Scraper actor...");

  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_API_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput)
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    throw new Error(`Failed to start Apify actor: ${error}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;
  console.log(`[Idealista] Actor run started: ${runId}`);

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  let status = "RUNNING";

  while (status === "RUNNING" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
    );
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;
    console.log(`[Idealista] Run status: ${status} (attempt ${attempts})`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Get results from dataset
  const datasetResponse = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
  );
  
  if (!datasetResponse.ok) {
    throw new Error("Failed to fetch dataset results");
  }

  const results = await datasetResponse.json();
  
  // Flatten results (each page returns an array)
  const conversations: IdealistaConversation[] = results.flat().filter((c: any) => c.conversationId);
  console.log(`[Idealista] Found ${conversations.length} conversations`);
  
  return conversations;
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 9) return null;
  return cleaned.startsWith('39') ? cleaned.slice(2) : cleaned;
}

async function matchClientByContact(phone: string | null, email: string | null, name: string | null): Promise<number | null> {
  const clienti = await storage.getClienti();
  
  // Try phone match first
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone) {
      const phoneMatch = clienti.find(c => {
        const clientPhone = normalizePhone(c.telefono);
        return clientPhone && (clientPhone === normalizedPhone || clientPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(clientPhone));
      });
      if (phoneMatch) return phoneMatch.id;
    }
  }
  
  // Try email match
  if (email) {
    const emailLower = email.toLowerCase();
    const emailMatch = clienti.find(c => c.email?.toLowerCase() === emailLower);
    if (emailMatch) return emailMatch.id;
  }
  
  // Try name match (fuzzy)
  if (name) {
    const nameParts = name.toLowerCase().split(/\s+/);
    const nameMatch = clienti.find(c => {
      const clientName = `${c.nome} ${c.cognome}`.toLowerCase();
      return nameParts.every(part => clientName.includes(part));
    });
    if (nameMatch) return nameMatch.id;
  }
  
  return null;
}

async function findPropertyByRef(ref: string | null, title: string | null): Promise<number | null> {
  if (!ref && !title) return null;
  
  // Check external properties first
  const esterni = await storage.getImmobiliEsterni();
  for (const ext of esterni) {
    if (ref && ext.riferimentoAnnuncio?.includes(ref)) return ext.id;
    if (title && ext.titolo?.toLowerCase().includes(title.toLowerCase())) return ext.id;
  }
  
  // Check internal properties
  const interni = await storage.getImmobili();
  for (const int of interni) {
    if (ref && int.riferimentoAnnuncio?.includes(ref)) return int.id;
    if (title && int.titolo?.toLowerCase().includes(title.toLowerCase())) return int.id;
  }
  
  return null;
}

export async function importIdealistaConversations(): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    conversationsFound: 0,
    messagesImported: 0,
    clientsMatched: 0,
    errors: []
  };

  try {
    const conversations = await runApifyActor();
    result.conversationsFound = conversations.length;

    for (const conv of conversations) {
      try {
        // Find or create client
        let clienteId = await matchClientByContact(conv.contactPhone, conv.contactEmail, conv.contactName);
        
        if (!clienteId && conv.contactName) {
          // Create new client
          const [nome, ...cognomeParts] = conv.contactName.split(' ');
          const cognome = cognomeParts.join(' ') || '';
          
          const newCliente = await storage.createCliente({
            nome: nome || 'Contatto',
            cognome: cognome || 'Idealista',
            email: conv.contactEmail || undefined,
            telefono: conv.contactPhone || undefined,
            tipoCliente: 'lead',
            note: `Importato da conversazione Idealista ${conv.conversationId}`
          });
          
          clienteId = newCliente.id;
          console.log(`[Idealista] Created new client: ${conv.contactName} (ID: ${clienteId})`);
        }
        
        if (clienteId) {
          result.clientsMatched++;
          
          // Find related property if possible
          const immobileId = await findPropertyByRef(conv.propertyRef, conv.propertyTitle);
          
          // Import messages as communications
          for (const msg of conv.messages) {
            // Check if this message already exists
            const existingComms = await storage.getComunicazioni(clienteId);
            const msgDate = new Date(msg.timestamp);
            const isDuplicate = existingComms.some((c: any) => 
              c.testo?.includes(msg.content.slice(0, 50)) &&
              Math.abs(new Date(c.dataOra!).getTime() - msgDate.getTime()) < 24 * 60 * 60 * 1000
            );
            
            if (!isDuplicate) {
              await storage.createComunicazione({
                clienteId: clienteId,
                immobileId: immobileId,
                tipo: 'messaggio',
                testo: `${msg.content} [${msg.timestamp}]`,
                canale: 'idealista',
                creatoDA: msg.sender === 'agent' ? 'agente' : 'cliente'
              });
              result.messagesImported++;
            }
          }
        }
      } catch (convError: any) {
        result.errors.push(`Conversation ${conv.conversationId}: ${convError.message}`);
      }
    }

    result.success = true;
  } catch (error: any) {
    result.errors.push(error.message);
    console.error("[Idealista] Import failed:", error);
  }

  return result;
}

// Scheduled import function - can be called by cron
export async function scheduledIdealistaImport(): Promise<void> {
  console.log("[Idealista] Starting scheduled import...");
  const result = await importIdealistaConversations();
  console.log("[Idealista] Import complete:", result);
  
  // Create notification if messages were imported
  if (result.messagesImported > 0) {
    await storage.createNotifica({
      tipo: 'sistema',
      titolo: 'Conversazioni Idealista importate',
      messaggio: `Importati ${result.messagesImported} nuovi messaggi da ${result.clientsMatched} conversazioni Idealista`,
      priorita: 2,
      letta: false
    });
  }
}
