import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
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
  const gmail = await getUncachableGmailClient();
  
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
      
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        } else {
          const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
          if (htmlPart?.body?.data) {
            body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      }

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

export async function markAsRead(messageId: string): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD']
    }
  });
}

export async function getEmailsByQuery(query: string, maxResults: number = 20): Promise<EmailMessage[]> {
  const gmail = await getUncachableGmailClient();
  
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
      
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        } else {
          const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
          if (htmlPart?.body?.data) {
            body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      }

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
  const phoneRegex = /(?:\+39\s?)?(?:3\d{2}[\s.-]?\d{6,7}|\d{2,4}[\s.-]?\d{6,8})/g;
  
  const emails = body.match(emailRegex) || [];
  const phones = body.match(phoneRegex) || [];
  
  const clientEmail = emails.find(e => !e.includes('immobiliare.it') && !e.includes('casa.it') && !e.includes('idealista.it') && !e.includes('subito.it'));
  const clientPhone = phones[0]?.replace(/[\s.-]/g, '');
  
  const nomeMatch = body.match(/(?:Nome|Da|From|Mittente)[:\s]+([A-Za-zÀ-ÿ\s]+)/i);
  const rifMatch = body.match(/(?:Rif|Riferimento|Codice)[.:\s]+(\w+)/i);

  return {
    nomeCliente: nomeMatch?.[1]?.trim(),
    emailCliente: clientEmail,
    telefonoCliente: clientPhone,
    portale,
    testoRichiesta: body.slice(0, 2000),
    riferimentoImmobile: rifMatch?.[1],
    dataRichiesta: email.date
  };
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const gmail = await getUncachableGmailClient();
    
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
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
