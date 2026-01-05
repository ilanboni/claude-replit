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
    data.titolo = document.querySelector('h1')?.textContent?.trim() || '';
    data.descrizione = document.querySelector('[data-testid="listing-description"]')?.textContent?.trim() ||
                       document.querySelector('.in-description__text')?.textContent?.trim() || '';
    
    const prezzoEl = document.querySelector('[class*="price"]') || 
                     document.querySelector('.in-listingCardPrice');
    if (prezzoEl) {
      const prezzoText = prezzoEl.textContent.replace(/[^\d]/g, '');
      data.prezzo = parseInt(prezzoText) || null;
    }

    const features = document.querySelectorAll('[class*="feature"], .in-features__item, .in-realEstateFeatures__title');
    features.forEach(f => {
      const text = f.textContent?.toLowerCase() || '';
      if (text.includes('local') || text.includes('stanz')) {
        const num = text.match(/\d+/);
        if (num) data.locali = parseInt(num[0]);
      }
      if (text.includes('bagn')) {
        const num = text.match(/\d+/);
        if (num) data.bagni = parseInt(num[0]);
      }
      if (text.includes('m²') || text.includes('mq')) {
        const num = text.match(/\d+/);
        if (num) data.superficie = parseInt(num[0]);
      }
      if (text.includes('piano')) {
        data.piano = text;
      }
    });

    const locationEl = document.querySelector('[class*="location"], .in-location');
    if (locationEl) {
      const locText = locationEl.textContent?.trim() || '';
      const parts = locText.split(',').map(s => s.trim());
      data.zona = parts[0] || '';
      data.citta = parts[parts.length - 1] || '';
    }

    const energyEl = document.querySelector('[class*="energy"], .in-energy');
    if (energyEl) {
      const match = energyEl.textContent?.match(/[A-G]\d?/i);
      if (match) data.classeEnergetica = match[0].toUpperCase();
    }

    document.querySelectorAll('img[src*="immobiliare"]').forEach(img => {
      if (img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
        data.immagini.push(img.src);
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
