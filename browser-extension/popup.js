let extractedData = null;

const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const previewContentEl = document.getElementById('preview-content');
const serverUrlEl = document.getElementById('server-url');
const btnExtract = document.getElementById('btn-extract');
const btnSend = document.getElementById('btn-send');

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function showPreview(data) {
  const items = [
    { label: 'Titolo', value: data.titolo },
    { label: 'Prezzo', value: data.prezzo ? `€ ${data.prezzo.toLocaleString('it-IT')}` : '-' },
    { label: 'Zona', value: data.zona || '-' },
    { label: 'Superficie', value: data.superficie ? `${data.superficie} mq` : '-' },
    { label: 'Locali', value: data.locali || '-' },
    { label: 'Tipologia', value: data.tipologia || '-' },
  ];

  previewContentEl.innerHTML = items
    .filter(item => item.value && item.value !== '-')
    .map(item => `
      <div class="preview-item">
        <span class="preview-label">${item.label}</span>
        <span class="preview-value">${item.value}</span>
      </div>
    `).join('');

  previewEl.classList.remove('hidden');
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extractFromPage() {
  const tab = await getCurrentTab();
  
  btnExtract.disabled = true;
  btnExtract.innerHTML = '<span class="loading"></span>Estrazione...';

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractListingData,
    });

    if (results && results[0] && results[0].result) {
      extractedData = results[0].result;
      extractedData.url = tab.url;
      showPreview(extractedData);
      setStatus('Dati estratti con successo!', 'success');
      btnSend.disabled = false;
    } else {
      setStatus('Impossibile estrarre i dati dalla pagina', 'error');
    }
  } catch (error) {
    console.error('Extraction error:', error);
    setStatus('Errore durante l\'estrazione: ' + error.message, 'error');
  } finally {
    btnExtract.disabled = false;
    btnExtract.textContent = 'Estrai dati';
  }
}

async function sendToImmoGest() {
  const serverUrl = serverUrlEl.value.trim();
  
  if (!serverUrl) {
    setStatus('Inserisci l\'URL di ImmoGest', 'warning');
    serverUrlEl.focus();
    return;
  }

  if (!extractedData) {
    setStatus('Prima estrai i dati dalla pagina', 'warning');
    return;
  }

  btnSend.disabled = true;
  btnSend.innerHTML = '<span class="loading"></span>Invio...';

  try {
    const response = await fetch(`${serverUrl}/api/acquisizione/from-extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(extractedData),
    });

    if (response.ok) {
      const result = await response.json();
      setStatus('Annuncio importato in ImmoGest!', 'success');
      localStorage.setItem('immogest_server_url', serverUrl);
    } else {
      const error = await response.text();
      setStatus('Errore: ' + error, 'error');
    }
  } catch (error) {
    console.error('Send error:', error);
    setStatus('Errore di connessione: verifica l\'URL', 'error');
  } finally {
    btnSend.disabled = false;
    btnSend.textContent = 'Invia a ImmoGest';
  }
}

function extractListingData() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  let data = {
    titolo: '',
    descrizione: '',
    prezzo: null,
    zona: '',
    citta: '',
    superficie: null,
    locali: null,
    bagni: null,
    piano: '',
    tipologia: '',
    classeEnergetica: '',
    riscaldamento: '',
    stato: '',
    annoCostruzione: null,
    spese: null,
    caratteristiche: {},
    contatto: {},
    immagini: [],
    testoCompleto: ''
  };

  if (hostname.includes('immobiliare.it')) {
    // Titolo dall'h1
    data.titolo = document.querySelector('h1')?.textContent?.trim() || '';
    
    // Descrizione - cerca nel contenuto principale
    const descEl = document.querySelector('[data-testid="listing-description"]') ||
                   document.querySelector('.in-description__text') ||
                   document.querySelector('[class*="description"]');
    if (descEl) {
      data.descrizione = descEl.textContent?.trim() || '';
    } else {
      // Fallback: cerca il testo dopo "Descrizione"
      const allText = document.body.innerText;
      const descMatch = allText.match(/Descrizione[\s\S]*?riferimento[:\s]*([\s\S]*?)(?=Caratteristiche|Dettaglio|$)/i);
      if (descMatch) {
        data.descrizione = descMatch[0].replace(/^Descrizione\s*/i, '').trim().substring(0, 5000);
      }
    }
    
    // Prezzo - cerca il prezzo principale (non il prezzo al mq)
    const prezzoSelectors = [
      'h1 + div [class*="price"]',
      '[class*="Price"]:not([class*="m²"]):not([class*="mq"])',
      '.price'
    ];
    for (const sel of prezzoSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent || '';
        // Cerca pattern €X.XXX.XXX o €XXX.XXX
        const match = text.match(/€\s*([\d.]+)/);
        if (match) {
          const prezzoText = match[1].replace(/\./g, '');
          const prezzo = parseInt(prezzoText);
          if (prezzo > 10000) { // Solo prezzi realistici
            data.prezzo = prezzo;
            break;
          }
        }
      }
    }
    
    // Fallback prezzo dal body text
    if (!data.prezzo) {
      const bodyText = document.body.innerText;
      const prezzoMatch = bodyText.match(/€\s*([\d.]+)(?:\s|$)/);
      if (prezzoMatch) {
        const prezzoText = prezzoMatch[1].replace(/\./g, '');
        const prezzo = parseInt(prezzoText);
        if (prezzo > 10000) data.prezzo = prezzo;
      }
    }

    // Features principali - cerca nel testo visibile
    const pageText = document.body.innerText.toLowerCase();
    
    // Locali
    const localiMatch = pageText.match(/(\d+)\s*local/i);
    if (localiMatch) data.locali = parseInt(localiMatch[1]);
    
    // Superficie
    const mqMatch = pageText.match(/(\d+)\s*m[²q]/i);
    if (mqMatch) data.superficie = parseInt(mqMatch[1]);
    
    // Bagni
    const bagniMatch = pageText.match(/(\d+)\s*bagn/i);
    if (bagniMatch) data.bagni = parseInt(bagniMatch[1]);
    
    // Piano
    const pianoMatch = pageText.match(/piano\s*(\d+|terra|primo|secondo|terzo|quarto|quinto|sesto|settimo)/i);
    if (pianoMatch) data.piano = pianoMatch[1];
    
    // Caratteristiche booleane
    data.caratteristiche = {
      ascensore: /ascensore\s*s[iì]/i.test(pageText) || pageText.includes('ascensore'),
      balcone: /balcone\s*s[iì]/i.test(pageText) || pageText.includes('balcone'),
      terrazzo: pageText.includes('terrazzo'),
      box: pageText.includes('box') || pageText.includes('garage'),
      cantina: pageText.includes('cantina'),
      arredato: /arredato\s*s[iì]/i.test(pageText),
      ristrutturato: pageText.includes('ristrutturato'),
      portineria: pageText.includes('portineria') || pageText.includes('portinaio')
    };

    // Zona e città dal titolo o breadcrumb
    const titleParts = data.titolo.split(',').map(s => s.trim());
    if (titleParts.length >= 2) {
      data.zona = titleParts[1] || '';
      data.citta = titleParts[titleParts.length - 1] || 'Milano';
    }
    
    // Indirizzo completo
    const viaMatch = data.titolo.match(/(via|viale|piazza|corso|piazzale)\s+[^,]+/i);
    if (viaMatch) {
      data.indirizzo = viaMatch[0].trim();
    }

    // Classe energetica
    const energyMatch = pageText.match(/classe\s*energetica[:\s]*([A-G])/i) || 
                        pageText.match(/([A-G])\s*(?:kWh|kwh)/i);
    if (energyMatch) {
      data.classeEnergetica = energyMatch[1].toUpperCase();
    }
    
    // Spese condominiali
    const speseMatch = pageText.match(/spese\s*(?:condominio|condominiali)[:\s]*€?\s*([\d.]+)/i);
    if (speseMatch) {
      data.spese = parseInt(speseMatch[1].replace(/\./g, ''));
    }
    
    // Riscaldamento
    if (pageText.includes('centralizzato')) data.riscaldamento = 'Centralizzato';
    else if (pageText.includes('autonomo')) data.riscaldamento = 'Autonomo';
    
    // Stato immobile
    if (pageText.includes('ristrutturato')) data.stato = 'Ristrutturato';
    else if (pageText.includes('da ristrutturare')) data.stato = 'Da ristrutturare';
    else if (pageText.includes('buono stato')) data.stato = 'Buono';
    else if (pageText.includes('nuovo')) data.stato = 'Nuovo';
    
    // Tipologia
    const tipMatch = pageText.match(/(trilocale|bilocale|monolocale|quadrilocale|attico|loft|villa|appartamento)/i);
    if (tipMatch) data.tipologia = tipMatch[1].charAt(0).toUpperCase() + tipMatch[1].slice(1).toLowerCase();

    // Telefono - prova a estrarre dall'immagine o dal testo
    const telImg = document.querySelector('img[src*="tel_"]');
    if (telImg) {
      data.contatto.telefonoImmagine = telImg.src;
      // Nota: il numero è nascosto in un'immagine
      data.contatto.nota = "Telefono disponibile come immagine - clicca 'Mostra numero' sulla pagina";
    }
    
    // Cerca numero di telefono nel testo visibile
    const telMatch = pageText.match(/(?:tel|telefono|cell)[:\s]*([+\d\s\-\.]{8,})/i);
    if (telMatch) {
      data.contatto.telefono = telMatch[1].replace(/[\s\-\.]/g, '').trim();
    }
    
    // Nome contatto
    const privatoMatch = pageText.match(/privato/i);
    if (privatoMatch) {
      data.contatto.tipo = 'Privato';
    }

    // Immagini
    document.querySelectorAll('img[src*="pwm.im-cdn.it"], img[src*="pic.im-cdn.it"]').forEach(img => {
      if (img.src && !img.src.includes('logo') && !img.src.includes('icon') && !img.src.includes('xxs-')) {
        data.immagini.push(img.src.replace('/m-c.jpg', '/xl-c.jpg'));
      }
    });

  } else if (hostname.includes('idealista.it')) {
    data.titolo = document.querySelector('h1, .main-info__title')?.textContent?.trim() || '';
    data.descrizione = document.querySelector('.comment, .adCommentsLanguage')?.textContent?.trim() || '';
    
    const prezzoEl = document.querySelector('.info-data-price, .price');
    if (prezzoEl) {
      const prezzoText = prezzoEl.textContent.replace(/[^\d]/g, '');
      data.prezzo = parseInt(prezzoText) || null;
    }

    const details = document.querySelectorAll('.info-features span, .details-property_features li');
    details.forEach(d => {
      const text = d.textContent?.toLowerCase() || '';
      if (text.includes('m²') || text.includes('mq')) {
        const num = text.match(/\d+/);
        if (num) data.superficie = parseInt(num[0]);
      }
      if (text.includes('local') || text.includes('hab')) {
        const num = text.match(/\d+/);
        if (num) data.locali = parseInt(num[0]);
      }
      if (text.includes('bagn') || text.includes('baño')) {
        const num = text.match(/\d+/);
        if (num) data.bagni = parseInt(num[0]);
      }
      if (text.includes('piano') || text.includes('planta')) {
        data.piano = text;
      }
    });

    const locationEl = document.querySelector('.main-info__title-minor, .location');
    if (locationEl) {
      const locText = locationEl.textContent?.trim() || '';
      data.zona = locText;
    }

  } else if (hostname.includes('subito.it')) {
    data.titolo = document.querySelector('h1')?.textContent?.trim() || '';
    data.descrizione = document.querySelector('[class*="description"], .AdDescription')?.textContent?.trim() || '';
    
    const prezzoEl = document.querySelector('[class*="price"], .AdPrice');
    if (prezzoEl) {
      const prezzoText = prezzoEl.textContent.replace(/[^\d]/g, '');
      data.prezzo = parseInt(prezzoText) || null;
    }

    const features = document.querySelectorAll('[class*="feature"], .feature-list li');
    features.forEach(f => {
      const text = f.textContent?.toLowerCase() || '';
      if (text.includes('m²') || text.includes('mq')) {
        const num = text.match(/\d+/);
        if (num) data.superficie = parseInt(num[0]);
      }
      if (text.includes('local')) {
        const num = text.match(/\d+/);
        if (num) data.locali = parseInt(num[0]);
      }
    });

    const locationEl = document.querySelector('[class*="location"], .AdInfo__location');
    if (locationEl) {
      data.zona = locationEl.textContent?.trim() || '';
    }

  } else if (hostname.includes('casa.it')) {
    data.titolo = document.querySelector('h1')?.textContent?.trim() || '';
    data.descrizione = document.querySelector('.description-text, [class*="description"]')?.textContent?.trim() || '';
    
    const prezzoEl = document.querySelector('.price, [class*="price"]');
    if (prezzoEl) {
      const prezzoText = prezzoEl.textContent.replace(/[^\d]/g, '');
      data.prezzo = parseInt(prezzoText) || null;
    }
  }

  data.testoCompleto = document.body.innerText.substring(0, 10000);

  return data;
}

async function init() {
  const savedUrl = localStorage.getItem('immogest_server_url');
  if (savedUrl) {
    serverUrlEl.value = savedUrl;
  }

  const tab = await getCurrentTab();
  const url = tab?.url || '';
  
  const supportedSites = ['immobiliare.it', 'idealista.it', 'subito.it', 'casa.it'];
  const isSupported = supportedSites.some(site => url.includes(site));
  
  if (!url || url.startsWith('chrome://')) {
    setStatus('Apri una pagina di annuncio immobiliare', 'warning');
    return;
  }

  if (!isSupported) {
    setStatus('Sito non supportato. Vai su Immobiliare.it, Idealista, Subito o Casa.it', 'warning');
    return;
  }

  const isListingPage = url.includes('/annunci/') || 
                        url.includes('/immobile/') ||
                        url.includes('/vendita/') ||
                        url.includes('/affitto/');

  if (!isListingPage) {
    setStatus('Vai sulla pagina di un annuncio specifico', 'info');
    btnExtract.disabled = false;
    return;
  }

  setStatus('Pagina annuncio rilevata. Clicca "Estrai dati"', 'success');
  btnExtract.disabled = false;
}

btnExtract.addEventListener('click', extractFromPage);
btnSend.addEventListener('click', sendToImmoGest);

init();
