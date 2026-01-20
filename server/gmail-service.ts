import { google } from 'googleapis';

// OAuth2 client with manual credentials for full Gmail access
let oauth2Client: ReturnType<typeof google.auth.OAuth2.prototype.constructor> | null = null;

function getOAuth2Client() {
  if (!oauth2Client) {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
    }

    oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
  }
  return oauth2Client;
}

async function getGmailClient() {
  const auth = getOAuth2Client();
  return google.gmail({ version: 'v1', auth });
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
  snippet: string;
}

export async function getUnreadEmails(maxResults: number = 10): Promise<EmailMessage[]> {
  const gmail = await getGmailClient();
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults
  });

  const messages: EmailMessage[] = [];
  
  if (response.data.messages) {
    for (const msg of response.data.messages) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full'
      });

      const headers = fullMessage.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
      const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');

      let body = '';
      const payload = fullMessage.data.payload;
      
      body = extractEmailBody(payload);

      messages.push({
        id: msg.id!,
        threadId: msg.threadId!,
        from: fromHeader?.value || '',
        subject: subjectHeader?.value || '',
        body,
        date: dateHeader?.value ? new Date(dateHeader.value) : new Date(),
        snippet: fullMessage.data.snippet || ''
      });
    }
  }

  return messages;
}

// Recursively extract body from email payload (handles nested multipart)
function extractEmailBody(payload: any): string {
  // Direct body data
  if (payload?.body?.data) {
    let content = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    // Always convert if it looks like HTML
    if (isHtmlContent(content)) {
      content = convertHtmlToText(content);
    }
    return content;
  }
  
  // Multipart - look for text/plain first, then text/html
  if (payload?.parts && Array.isArray(payload.parts)) {
    // Try to find text/plain first
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
    
    // Try text/html
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      let content = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      return convertHtmlToText(content);
    }
    
    // Recursively search in nested multipart
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith('multipart/') || part.parts) {
        const nested = extractEmailBody(part);
        if (nested) return nested;
      }
    }
  }
  
  return '';
}

function convertHtmlToText(html: string): string {
  return html
    // First remove style and script blocks entirely (including content)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert line breaks and block elements to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#\d+;/g, '') // Remove remaining numeric entities
    // Clean up whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Check if content looks like HTML
function isHtmlContent(content: string): boolean {
  return content.includes('<html') || 
         content.includes('<body') || 
         content.includes('<div') || 
         content.includes('<style') ||
         content.includes('<table');
}

export async function markAsRead(messageId: string): Promise<void> {
  const gmail = await getGmailClient();
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD']
    }
  });
}

export async function getEmailsByQuery(query: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getGmailClient();
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults
  });

  const messages: EmailMessage[] = [];
  
  if (response.data.messages) {
    for (const msg of response.data.messages) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full'
      });

      const headers = fullMessage.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
      const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');

      let body = '';
      const payload = fullMessage.data.payload;
      
      body = extractEmailBody(payload);

      messages.push({
        id: msg.id!,
        threadId: msg.threadId!,
        from: fromHeader?.value || '',
        subject: subjectHeader?.value || '',
        body,
        date: dateHeader?.value ? new Date(dateHeader.value) : new Date(),
        snippet: fullMessage.data.snippet || ''
      });
    }
  }

  return messages;
}

export async function searchPortalEmails(): Promise<EmailMessage[]> {
  const portalQueries = [
    'from:immobiliare.it',
    'from:casa.it', 
    'from:idealista.it',
    'from:subito.it',
    'subject:richiesta informazioni immobile',
    'subject:contatto annuncio'
  ];
  
  const query = portalQueries.join(' OR ');
  return getEmailsByQuery(query, 50);
}

export interface ParsedPortalEmail {
  nomeCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
  portale: string;
  testoRichiesta: string;
  riferimentoImmobile?: string;
  indirizzoImmobile?: string;
  dataRichiesta: Date;
}

export function parsePortalEmail(email: EmailMessage): ParsedPortalEmail {
  const body = email.body || email.snippet;
  let portale = 'sconosciuto';
  
  if (email.from.includes('immobiliare.it')) portale = 'Immobiliare.it';
  else if (email.from.includes('casa.it')) portale = 'Casa.it';
  else if (email.from.includes('idealista.it')) portale = 'Idealista';
  else if (email.from.includes('subito.it')) portale = 'Subito.it';
  
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex = /(?:\+39\s?)?(?:3\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,4}|3\d{8,9}|\d{2,4}[\s.-]?\d{6,8})/g;
  
  const emails = body.match(emailRegex) || [];
  const phones = body.match(phoneRegex) || [];
  
  const excludedDomains = ['immobiliare.it', 'casa.it', 'idealista.it', 'subito.it', 'tools.it'];
  const clientEmail = emails.find(e => !excludedDomains.some(d => e.includes(d)));
  const clientPhone = phones[0]?.replace(/[\s.-]/g, '');
  
  let nomeCliente: string | undefined;
  
  // Idealista format: nome cognome on its own line, followed by phone and email
  // Pattern: "messaggio in attesa di risposta\n\nNome Cognome\n3xx xxx xxxx\nemail@..."
  const idealistaNamePattern = /(?:messaggio in attesa di risposta|nuovo messaggio)\s*\n+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+)\n\s*(?:\+?3|\d{2,3}[\s.-]?\d)/i;
  const idealistaMatch = body.match(idealistaNamePattern);
  if (idealistaMatch) {
    nomeCliente = idealistaMatch[1].trim();
  }
  
  // Alternative: look for name before phone number on separate lines
  if (!nomeCliente) {
    const lines = body.split('\n').map(l => l.trim()).filter(l => l);
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      // If current line looks like a name (2-3 words, only letters) and next line is phone
      if (/^[A-Za-zÀ-ÿ]+(\s+[A-Za-zÀ-ÿ]+){0,2}$/.test(line) && 
          /^[\d\s+.-]{8,}$/.test(nextLine) &&
          !line.toLowerCase().includes('grazie') &&
          !line.toLowerCase().includes('ciao') &&
          !line.toLowerCase().includes('salve')) {
        nomeCliente = line;
        break;
      }
    }
  }
  
  // Immobiliare.it format: "Nome: xxx" or "Mittente: xxx"
  if (!nomeCliente) {
    const nomeMatch = body.match(/(?:Nome|Da|From|Mittente)[:\s]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?)(?:\n|Email|Telefono|$)/i);
    if (nomeMatch) {
      nomeCliente = nomeMatch[1].trim();
    }
  }
  
  // Fallback for single-line body: look for name pattern before email/phone
  // Pattern: "Nome Cognome email@domain.com 3xx xxx xxxx"
  if (!nomeCliente && clientEmail) {
    const beforeEmail = body.split(clientEmail)[0];
    // Look for capitalized words (name) right before the email
    const nameBeforeEmail = beforeEmail.match(/([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,2})\s*$/);
    if (nameBeforeEmail) {
      const potentialName = nameBeforeEmail[1].trim();
      // Exclude common words that aren't names
      const excludeWords = ['risposta', 'messaggio', 'attesa', 'grazie', 'ciao', 'salve', 'buongiorno'];
      if (!excludeWords.some(w => potentialName.toLowerCase().includes(w))) {
        nomeCliente = potentialName;
      }
    }
  }
  
  // Extract reference number - multiple patterns
  let riferimentoImmobile: string | undefined;
  
  // Pattern 1: "Ref. Prima" or "Ref: Prima"
  const refMatch = body.match(/Ref[.:\s]+([A-Za-z0-9_-]+)/i);
  if (refMatch) {
    riferimentoImmobile = refMatch[1];
  }
  
  // Pattern 2: "Riferimento: xxx" or "Codice: xxx"
  if (!riferimentoImmobile) {
    const rifMatch = body.match(/(?:Riferimento|Codice)[.:\s]+([A-Za-z0-9_-]+)/i);
    if (rifMatch) {
      riferimentoImmobile = rifMatch[1];
    }
  }
  
  // Pattern 3: "Codice dell'annuncio: xxx"
  if (!riferimentoImmobile) {
    const codiceMatch = body.match(/Codice dell['']annuncio[:\s]+(\d+)/i);
    if (codiceMatch) {
      riferimentoImmobile = codiceMatch[1];
    }
  }

  // Extract message content - look for the actual message between name/contact info and property details
  let testoRichiesta = '';
  const messagePatterns = [
    /(?:email@|\.com|\.it)\s*\n([\s\S]*?)(?:Rispondi|Trilocale|Bilocale|Appartamento|Ref\.|$)/i,
    /Messaggio[:\s]*([\s\S]*?)(?:Rispondi|Trilocale|Bilocale|$)/i,
  ];
  
  for (const pattern of messagePatterns) {
    const match = body.match(pattern);
    if (match && match[1]?.trim()) {
      testoRichiesta = match[1].trim();
      break;
    }
  }
  
  if (!testoRichiesta) {
    testoRichiesta = body.slice(0, 2000);
  }

  // Extract property address from email footer (immobiliare.it format)
  // Pattern: "Via Xxx, Milano" or "Via Xxx Yyy, Milano" after "vendita" or "affitto"
  let indirizzoImmobile: string | undefined;
  
  // Pattern 1: "Via/Viale/Corso/Piazza [Nome], Milano/Roma/etc"
  const addressPatterns = [
    // After "vendita" or "affitto" - look for street name
    /(?:vendita|affitto)\s*\n\s*((?:Via|Viale|Corso|Piazza|Piazzale|Largo|Vicolo)[^,\n]+,\s*Milano)/i,
    // Immobiliare.it footer format: street on its own line before price
    /\n\s*((?:Via|Viale|Corso|Piazza|Piazzale|Largo|Vicolo)[^,\n]+,\s*Milano)\s*\n\s*€/i,
    // Generic address pattern with city
    /((?:Via|Viale|Corso|Piazza|Piazzale|Largo|Vicolo)\s+[A-Za-zÀ-ÿ\s']+(?:\s+\d+)?)\s*,\s*(Milano|Roma|Torino|Napoli|Firenze|Bologna)/i,
  ];
  
  for (const pattern of addressPatterns) {
    const match = body.match(pattern);
    if (match) {
      indirizzoImmobile = match[1].trim();
      break;
    }
  }
  
  // Pattern 2: Look for address in "Messaggio ricevuto per l'annuncio:" section
  if (!indirizzoImmobile) {
    const annuncioMatch = body.match(/(?:annuncio|immobile)[:\s]*\n[\s\S]*?((?:Via|Viale|Corso|Piazza|Piazzale|Largo|Vicolo)[^,\n]+)/i);
    if (annuncioMatch) {
      indirizzoImmobile = annuncioMatch[1].trim();
    }
  }
  
  // Pattern 3: Extract from subject line if contains address
  if (!indirizzoImmobile && email.subject) {
    const subjectMatch = email.subject.match(/((?:Via|Viale|Corso|Piazza|Piazzale|Largo|Vicolo)\s+[A-Za-zÀ-ÿ\s']+)/i);
    if (subjectMatch) {
      indirizzoImmobile = subjectMatch[1].trim();
    }
  }

  return {
    nomeCliente,
    emailCliente: clientEmail,
    telefonoCliente: clientPhone,
    portale,
    testoRichiesta,
    riferimentoImmobile,
    indirizzoImmobile,
    dataRichiesta: email.date
  };
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const gmail = await getGmailClient();
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');
    
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log(`Email sent to ${to}:`, result.data);
    return { success: true, messageId: result.data.id || undefined };
  } catch (error) {
    console.error("Gmail send error:", error);
    return { success: false, error: String(error) };
  }
}

export async function isGmailConfigured(): Promise<boolean> {
  try {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    return !!(clientId && clientSecret && refreshToken);
  } catch {
    return false;
  }
}

// Search for form response emails from property portals
export async function searchFormResponseEmails(): Promise<EmailMessage[]> {
  const responseQueries = [
    'from:clickcase.it',
    'from:noreply subject:risposta',
    'from:info subject:proprietario ha risposto',
    'subject:risposta al tuo messaggio',
    'subject:il proprietario ti ha risposto',
    'subject:nuova risposta annuncio',
    'subject:risposta annuncio privato',
    'from:immobiliare.it subject:risposta',
    'from:idealista.it subject:risposta',
    'from:casa.it subject:risposta',
    // Nuovo pattern: "Nuovo messaggio di XXX per l'annuncio" (risposta acquisizione Immobiliare.it)
    'from:immobiliare.it subject:"Nuovo messaggio di"',
    'from:idealista.it subject:"nuovo messaggio"',
    'from:immobiliare.it subject:"messaggio per l\'annuncio"',
  ];
  
  const query = responseQueries.join(' OR ');
  return getEmailsByQuery(query, 50);
}

export interface ParsedFormResponse {
  portale: string;
  mittente?: string;
  emailMittente?: string;
  telefonoMittente?: string;
  testoRisposta: string;
  indirizzoImmobile?: string;
  riferimentoAnnuncio?: string;
  urlAnnuncio?: string;
  dataRisposta: Date;
}

export function parseFormResponseEmail(email: EmailMessage): ParsedFormResponse {
  const body = email.body || email.snippet;
  const subject = email.subject || '';
  
  let portale = 'sconosciuto';
  if (email.from.includes('clickcase.it')) portale = 'ClickCase.it';
  else if (email.from.includes('immobiliare.it')) portale = 'Immobiliare.it';
  else if (email.from.includes('casa.it')) portale = 'Casa.it';
  else if (email.from.includes('idealista.it')) portale = 'Idealista';
  else if (email.from.includes('subito.it')) portale = 'Subito.it';
  
  // Extract email and phone from body
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex = /(?:\+39\s?)?(?:3\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,4}|3\d{8,9})/g;
  
  const emails = body.match(emailRegex) || [];
  const phones = body.match(phoneRegex) || [];
  
  const excludedDomains = ['clickcase.it', 'immobiliare.it', 'casa.it', 'idealista.it', 'subito.it', 'noreply'];
  const senderEmail = emails.find(e => !excludedDomains.some(d => e.includes(d)));
  const senderPhone = phones[0]?.replace(/[\s.-]/g, '');
  
  // Extract sender name patterns - first try from subject line
  let mittente: string | undefined;
  
  // Pattern per "Nuovo messaggio di XXX per l'annuncio" (Immobiliare.it)
  const subjectNameMatch = subject.match(/(?:Nuovo messaggio di|Messaggio da)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?)(?:\s+per|\s+riguardo|$)/i);
  if (subjectNameMatch) {
    mittente = subjectNameMatch[1].trim();
  }
  
  // Se non trovato nell'oggetto, cerca nel corpo
  if (!mittente) {
    const namePatterns = [
      /(?:Da|From|Mittente|Proprietario)[:\s]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?)(?:\n|<|Email|Telefono)/i,
      /(?:Nome)[:\s]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = body.match(pattern);
      if (match) {
        mittente = match[1].trim();
        break;
      }
    }
  }
  
  // Extract address from body or subject
  let indirizzoImmobile: string | undefined;
  
  // Prima prova ad estrarre dall'oggetto (es: "per l'annuncio: Appartamento in vendita a Milano")
  const subjectAddressMatch = subject.match(/per l['']annuncio[:\s]+(.+?)$/i);
  if (subjectAddressMatch) {
    indirizzoImmobile = subjectAddressMatch[1].trim();
  }
  
  // Poi cerca nel corpo
  if (!indirizzoImmobile) {
    const addressPatterns = [
      /(?:Indirizzo|Via|Piazza|Corso|Viale)[:\s]+([A-Za-zÀ-ÿ0-9\s,.-]+?)(?:\n|Prezzo|Mq|$)/i,
      /(?:Immobile in)[:\s]+([A-Za-zÀ-ÿ0-9\s,.-]+?)(?:\n|$)/i,
      /(?:Annuncio)[:\s]+"?([^"]+)"?/i,
    ];
  
    for (const pattern of addressPatterns) {
      const match = body.match(pattern);
      if (match) {
        indirizzoImmobile = match[1].trim();
        break;
      }
    }
  }
  
  // Extract reference number
  let riferimentoAnnuncio: string | undefined;
  const refPatterns = [
    /(?:Ref|Riferimento|Codice)[.:\s]+([A-Za-z0-9_-]+)/i,
    /ID[:\s]+(\d+)/i,
  ];
  
  for (const pattern of refPatterns) {
    const match = body.match(pattern);
    if (match) {
      riferimentoAnnuncio = match[1];
      break;
    }
  }
  
  // Extract URL
  let urlAnnuncio: string | undefined;
  const urlPattern = /https?:\/\/[^\s"<>]+/gi;
  const urls = body.match(urlPattern) || [];
  urlAnnuncio = urls.find(u => 
    u.includes('clickcase.it') || 
    u.includes('immobiliare.it') || 
    u.includes('idealista.it') || 
    u.includes('casa.it')
  );
  
  // Extract message content
  let testoRisposta = '';
  const messagePatterns = [
    /(?:Messaggio|Risposta)[:\s]*([\s\S]*?)(?:Rispondi|Contatta|Vai all|$)/i,
    /(?:Testo)[:\s]*([\s\S]*?)(?:\n{2,}|$)/i,
  ];
  
  for (const pattern of messagePatterns) {
    const match = body.match(pattern);
    if (match && match[1]?.trim()) {
      testoRisposta = match[1].trim();
      break;
    }
  }
  
  if (!testoRisposta) {
    testoRisposta = body.slice(0, 2000);
  }
  
  return {
    portale,
    mittente,
    emailMittente: senderEmail,
    telefonoMittente: senderPhone,
    testoRisposta,
    indirizzoImmobile,
    riferimentoAnnuncio,
    urlAnnuncio,
    dataRisposta: email.date,
  };
}
