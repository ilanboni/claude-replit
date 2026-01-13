import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

interface ScrapedProperty {
  titolo: string;
  prezzo: number | null;
  indirizzo: string;
  zona: string;
  citta: string;
  mq: number | null;
  camere: number | null;
  bagni: number | null;
  piano: number | null;
  ascensore: boolean;
  balcone: boolean;
  terrazzo: boolean;
  box: boolean;
  cantina: boolean;
  giardino: boolean;
  arredato: boolean;
  classeEnergetica: string | null;
  descrizione: string;
  immagini: string[];
  urlAnnuncio: string;
  riferimentoAnnuncio: string | null;
  portale: string;
  contattoNome: string | null;
  contattoTelefono: string | null;
  contattoEmail: string | null;
  raw: any;
}

function detectPortal(url: string): 'immobiliare' | 'idealista' | 'subito' | 'casa' | 'unknown' {
  if (url.includes('immobiliare.it')) return 'immobiliare';
  if (url.includes('idealista.it')) return 'idealista';
  if (url.includes('subito.it')) return 'subito';
  if (url.includes('casa.it')) return 'casa';
  return 'unknown';
}

function extractReferenceFromUrl(url: string, portal: string): string | null {
  try {
    if (portal === 'immobiliare') {
      const match = url.match(/\/annunci\/(\d+)/);
      return match ? match[1] : null;
    }
    if (portal === 'idealista') {
      const match = url.match(/\/immobile\/(\d+)/);
      return match ? match[1] : null;
    }
  } catch (e) {}
  return null;
}

async function fetchPageContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Impossibile caricare la pagina: ${response.status}`);
  }
  
  const html = await response.text();
  
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const imageMatches = html.match(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi) || [];
  const uniqueImages = [...new Set(imageMatches)].slice(0, 10);
  
  return `TESTO PAGINA:\n${textContent.slice(0, 15000)}\n\nIMAGINI TROVATE:\n${uniqueImages.join('\n')}`;
}

async function extractPhoneFromScreenshot(screenshotBase64: string): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analizza questa immagine/screenshot di un annuncio immobiliare.
              
OBIETTIVO: Trova e estrai SOLO il numero di telefono del venditore/proprietario.

ISTRUZIONI:
- Cerca numeri di telefono italiani (iniziano con 3 per cellulari, o 02/06 etc per fissi)
- Il numero potrebbe essere visualizzato come immagine, parzialmente nascosto, o in formato particolare
- Ignora numeri di riferimento annuncio, codici, prezzi
- Formato atteso: 9-10 cifre, può avere prefisso +39

RISPONDI SOLO con il numero di telefono trovato (solo cifre, senza spazi).
Se non trovi un numero di telefono, rispondi con la parola "NESSUNO".`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${screenshotBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 100
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    
    if (result === 'NESSUNO' || result.length < 8) {
      return null;
    }
    
    const cleaned = result.replace(/\D/g, '');
    if (cleaned.length >= 9 && cleaned.length <= 12) {
      return cleaned;
    }
    
    return null;
  } catch (error) {
    console.error('Errore OCR screenshot:', error);
    return null;
  }
}

export async function extractPhoneFromImage(imageBase64: string): Promise<string | null> {
  return extractPhoneFromScreenshot(imageBase64);
}

async function extractWithAI(content: string, url: string, portal: string): Promise<ScrapedProperty | null> {
  const prompt = `Analizza questo contenuto di un annuncio immobiliare da ${portal} e estrai i dati strutturati.

CONTENUTO:
${content}

Rispondi SOLO con un JSON valido con questa struttura esatta:
{
  "titolo": "titolo dell'annuncio",
  "prezzo": numero o null,
  "indirizzo": "via e numero civico se disponibile",
  "zona": "quartiere o zona",
  "citta": "città",
  "mq": numero o null,
  "camere": numero o null,
  "bagni": numero o null,
  "piano": numero o null,
  "ascensore": true/false,
  "balcone": true/false,
  "terrazzo": true/false,
  "box": true/false,
  "cantina": true/false,
  "giardino": true/false,
  "arredato": true/false,
  "classeEnergetica": "A/B/C/D/E/F/G" o null,
  "descrizione": "descrizione completa dell'immobile",
  "immagini": ["url1", "url2", ...],
  "contattoNome": "nome del venditore/agenzia" o null,
  "contattoTelefono": "numero di telefono" o null,
  "contattoEmail": "email" o null
}

IMPORTANTE PER IL TELEFONO:
- Cerca numeri di telefono OVUNQUE nel testo, specialmente nella descrizione
- I privati spesso nascondono il numero nella descrizione (es: "trecentoquarantacinque..." o "3.4.5...")
- Formato italiano: inizia con 3 (cellulare) o 02/06 etc (fisso), 9-10 cifre
- Se trovi un numero scritto in lettere o con punti/spazi, convertilo in cifre

IMPORTANTE: Rispondi SOLO con il JSON, senza markdown o altro testo.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 2000
    });

    const text = response.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('Nessun JSON trovato nella risposta AI:', text);
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      titolo: data.titolo || '',
      prezzo: typeof data.prezzo === 'number' ? data.prezzo : null,
      indirizzo: data.indirizzo || '',
      zona: data.zona || '',
      citta: data.citta || 'Milano',
      mq: typeof data.mq === 'number' ? data.mq : null,
      camere: typeof data.camere === 'number' ? data.camere : null,
      bagni: typeof data.bagni === 'number' ? data.bagni : null,
      piano: typeof data.piano === 'number' ? data.piano : null,
      ascensore: data.ascensore === true,
      balcone: data.balcone === true,
      terrazzo: data.terrazzo === true,
      box: data.box === true,
      cantina: data.cantina === true,
      giardino: data.giardino === true,
      arredato: data.arredato === true,
      classeEnergetica: data.classeEnergetica || null,
      descrizione: data.descrizione || '',
      immagini: Array.isArray(data.immagini) ? data.immagini : [],
      urlAnnuncio: url,
      riferimentoAnnuncio: extractReferenceFromUrl(url, portal),
      portale: portal === 'immobiliare' ? 'Immobiliare.it' : 
               portal === 'idealista' ? 'Idealista' : 
               portal === 'subito' ? 'Subito.it' : 
               portal === 'casa' ? 'Casa.it' : 'Web',
      contattoNome: data.contattoNome || null,
      contattoTelefono: data.contattoTelefono || null,
      contattoEmail: data.contattoEmail || null,
      raw: data
    };
  } catch (error: any) {
    console.error('Errore estrazione AI:', error);
    throw new Error(`Errore AI: ${error.message}`);
  }
}

export async function scrapePropertyUrl(url: string): Promise<ScrapedProperty | null> {
  const portal = detectPortal(url);
  
  if (portal === 'unknown') {
    throw new Error(`Portale non supportato. Supportati: Immobiliare.it, Idealista, Subito.it, Casa.it`);
  }

  console.log(`[Scrape] Fetching ${portal}: ${url}`);
  
  try {
    const content = await fetchPageContent(url);
    console.log(`[Scrape] Content fetched, length: ${content.length}`);
    
    const data = await extractWithAI(content, url, portal);
    console.log(`[Scrape] AI extraction complete:`, data?.titolo);
    
    return data;
  } catch (error: any) {
    console.error('[Scrape] Error:', error);
    throw error;
  }
}

export function isApifyConfigured(): boolean {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}
