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
    // METODO PRINCIPALE: Estrai dati dal JSON __NEXT_DATA__ (più affidabile)
    try {
      const nextDataEl = document.getElementById('__NEXT_DATA__');
      if (nextDataEl) {
        const nextData = JSON.parse(nextDataEl.textContent);
        const listing = nextData?.props?.pageProps?.listingDetail || 
                        nextData?.props?.pageProps?.pageConfig?.advertisement ||
                        nextData?.props?.pageProps?.realEstate;
        
        if (listing) {
          // Titolo
          data.titolo = listing.title || listing.properties?.title || '';
          
          // Descrizione
          data.descrizione = listing.description || listing.properties?.description || '';
          
          // Prezzo
          const price = listing.price?.value || listing.properties?.price?.value || 
                       listing.pricing?.price?.amount;
          if (price) data.prezzo = parseInt(price);
          
          // Superficie - priorità ai campi principali, ignora features secondarie
          let surface = null;
          
          // Prima prova i campi principali dedicati alla superficie
          const surfaceSources = [
            listing.surface,
            listing.properties?.surface,
            listing.surfaceValue,
            listing.properties?.surfaceValue
          ];
          
          for (const src of surfaceSources) {
            if (!src) continue;
            
            let val = null;
            if (typeof src === 'number') {
              val = src;
            } else if (typeof src === 'object') {
              val = src.value || src.main || src.commercial;
            } else if (typeof src === 'string') {
              const match = src.match(/(\d+)/);
              if (match) val = parseInt(match[1]);
            }
            
            if (val && val >= 15) {
              surface = val;
              break; // Trovato valore valido, non sovrascrivere
            }
          }
          
          if (surface) {
            data.superficie = parseInt(surface);
          }
          
          // Locali
          const rooms = listing.rooms || listing.properties?.rooms ||
                       listing.features?.rooms?.value;
          if (rooms) data.locali = parseInt(rooms);
          
          // Bagni
          const bathrooms = listing.bathrooms || listing.properties?.bathrooms ||
                           listing.features?.bathrooms?.value;
          if (bathrooms) data.bagni = parseInt(bathrooms);
          
          // Piano
          const floor = listing.floor?.value || listing.properties?.floor ||
                       listing.features?.floor?.value;
          if (floor) data.piano = floor.toString();
          
          // Indirizzo e zona
          const address = listing.properties?.location || listing.location || listing.address;
          if (address) {
            data.indirizzo = address.formattedAddress || address.street || '';
            data.zona = address.macrozone || address.zone || address.neighbourhood || '';
            data.citta = address.city || address.municipality || 'Milano';
          }
          
          // Classe energetica
          const energy = listing.properties?.energy || listing.energy || listing.energyClass;
          if (energy) {
            data.classeEnergetica = energy.class || energy.energyClass || energy.value || '';
          }
          
          // Spese condominiali
          const expenses = listing.properties?.expenses || listing.expenses;
          if (expenses?.condominium) {
            data.spese = parseInt(expenses.condominium);
          }
          
          // Caratteristiche
          const features = listing.properties?.features || listing.features || [];
          const featureList = Array.isArray(features) ? features : [];
          const featureLabels = featureList.map(f => (f.label || f.compactLabel || '').toLowerCase());
          
          data.caratteristiche = {
            ascensore: featureLabels.some(f => f.includes('ascensore')) || listing.hasLift,
            balcone: featureLabels.some(f => f.includes('balcon')) || listing.hasBalcony,
            terrazzo: featureLabels.some(f => f.includes('terrazzo') || f.includes('terrazza')),
            box: featureLabels.some(f => f.includes('box') || f.includes('garage')),
            cantina: featureLabels.some(f => f.includes('cantina')),
            arredato: featureLabels.some(f => f.includes('arredato')) || listing.isFurnished,
            ristrutturato: listing.condition === 'ristrutturato' || listing.isRefurbished
          };
          
          // Tipologia
          data.tipologia = listing.typology?.name || listing.properties?.typology?.name || 
                          listing.category?.name || '';
          
          // Riscaldamento
          const heating = listing.properties?.heating || listing.heating;
          if (heating) {
            data.riscaldamento = heating.type || heating;
          }
          
          // ID annuncio per chiamata telefono
          data.advertId = listing.id || listing.properties?.id;
          
          // Contatto
          const advertiser = listing.advertiser || listing.properties?.advertiser;
          if (advertiser) {
            data.contatto.nome = advertiser.displayName || advertiser.name || '';
            data.contatto.tipo = advertiser.type || (advertiser.agency ? 'Agenzia' : 'Privato');
          }
          
          // Immagini
          const photos = listing.properties?.multimedia?.photos || listing.multimedia?.photos || 
                        listing.photos || [];
          photos.forEach(photo => {
            const url = photo.urls?.large || photo.urls?.medium || photo.url;
            if (url) data.immagini.push(url);
          });
        }
      }
    } catch (e) {
      console.error('Errore parsing __NEXT_DATA__:', e);
    }
    
    // FALLBACK: Se __NEXT_DATA__ non ha funzionato, usa parsing testo
    if (!data.prezzo || !data.superficie) {
      const pageText = document.body.innerText;
      
      // Titolo
      if (!data.titolo) {
        data.titolo = document.querySelector('h1')?.textContent?.trim() || '';
      }
      
      // Descrizione
      if (!data.descrizione) {
        const descMatch = pageText.match(/Descrizione[\s\n]+([\s\S]*?)(?=Caratteristiche|Dettaglio superficie|Informazioni sul prezzo)/i);
        if (descMatch) data.descrizione = descMatch[1].trim();
      }
      
      // Prezzo - cerca dopo il titolo, prima dei dettagli
      if (!data.prezzo) {
        const prezzoMatch = pageText.match(/€\s*([\d.]+)\s*(?:\n|3 locali|2 locali|\d+ locali|\d+ m)/);
        if (prezzoMatch) {
          data.prezzo = parseInt(prezzoMatch[1].replace(/\./g, ''));
        }
      }
      
      // Superficie - cerca specificamente "Superficie X m²" nella sezione caratteristiche
      if (!data.superficie) {
        const superficieMatch = pageText.match(/Superficie\s*[\n\r]*\s*(\d+)\s*m[²q]/i);
        if (superficieMatch) {
          const sup = parseInt(superficieMatch[1]);
          if (sup >= 15) data.superficie = sup;
        }
      }
      
      // Cerca nel formato "X locali Y m² Z bagni" (header annuncio)
      if (!data.superficie || !data.locali) {
        const featMatch = pageText.match(/(\d+)\s*locali\s*(\d+)\s*m[²q]\s*(\d+)\s*bagn/i);
        if (featMatch) {
          if (!data.locali) data.locali = parseInt(featMatch[1]);
          if (!data.superficie) {
            const sup = parseInt(featMatch[2]);
            if (sup >= 15) data.superficie = sup;
          }
          if (!data.bagni) data.bagni = parseInt(featMatch[3]);
        }
      }
      
      // Piano
      if (!data.piano) {
        const pianoMatch = pageText.match(/Piano\s*(\d+|terra)/i);
        if (pianoMatch) data.piano = pianoMatch[1];
      }
      
      // Classe energetica
      if (!data.classeEnergetica) {
        const energyMatch = pageText.match(/(\d+)\s*kWh\/m[²q]\s*anno\s*([A-G])/i);
        if (energyMatch) data.classeEnergetica = energyMatch[2].toUpperCase();
      }
    }
    
    // Estrai telefono SOLO dalla sezione contatti (più preciso)
    // Cerca elementi specifici che contengono il numero di telefono
    const contactSelectors = [
      '[data-cy="phone-number"]',
      '[class*="ContactButton"] a[href^="tel:"]',
      'a[href^="tel:"]',
      '[class*="phone"]',
      '[class*="Phone"]',
      '[class*="telefono"]',
      '.nd-mediaObject__content a[href^="tel:"]'
    ];
    
    for (const selector of contactSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        // Se è un link tel:, estrai il numero dall'href
        const href = el.getAttribute('href');
        if (href && href.startsWith('tel:')) {
          const phone = href.replace('tel:', '').replace(/[\s\-+]/g, '');
          if (phone.length >= 9 && phone.length <= 13) {
            data.contatto.telefono = phone;
            break;
          }
        }
        // Altrimenti estrai dal testo
        const text = el.textContent?.replace(/[\s\-]/g, '') || '';
        const phoneMatch = text.match(/(\d{9,13})/);
        if (phoneMatch) {
          data.contatto.telefono = phoneMatch[1];
          break;
        }
      }
    }
    
    // Se non trovato, cerca nel box contatti visibile (sezione laterale)
    if (!data.contatto.telefono) {
      const contactBox = document.querySelector('[class*="ContactBox"], [class*="contact-box"], [data-testid="contact-box"]');
      if (contactBox) {
        const boxText = contactBox.textContent || '';
        // Cerca pattern telefono italiano nel box contatti
        const phoneMatch = boxText.match(/(?:chiama|telefono|tel\.?:?\s*)(\d[\d\s\-]{8,14}\d)/i);
        if (phoneMatch) {
          const cleaned = phoneMatch[1].replace(/[\s\-]/g, '');
          if (cleaned.length >= 9 && cleaned.length <= 13) {
            data.contatto.telefono = cleaned;
          }
        }
      }
    }
    
    // Controlla se c'è l'immagine del telefono (numero nascosto come immagine)
    const telImg = document.querySelector('img[src*="tel_"]');
    if (telImg && !data.contatto.telefono) {
      data.contatto.telefonoImmagine = telImg.src;
      data.contatto.telefonoNascosto = true;
    }
    
    // Tipo contatto
    const pageText = document.body.innerText;
    if (pageText.toLowerCase().includes('privato')) {
      data.contatto.tipo = 'Privato';
    }

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

  } else if (hostname.includes('clickcase.it')) {
    // ClickCase.it - portale privati
    data.titolo = document.querySelector('h1')?.textContent?.trim() || '';
    
    // Cerca sottotitolo con indirizzo in più posti
    // Formato: "Appartamento in Vendita da Privato - Via Gentilino 15, Milano"
    const pageText = document.body.innerText;
    
    // Prova prima h2
    let sottotitolo = document.querySelector('h2')?.textContent?.trim() || '';
    
    // Se h2 non contiene " - Via" o " - Piazza", cerca nel testo della pagina
    if (!sottotitolo.includes(' - Via') && !sottotitolo.includes(' - Piazza') && !sottotitolo.includes(' - Viale')) {
      // Cerca pattern "Vendita da Privato - Via..." o "Affitto da Privato - Via..."
      const pageMatch = pageText.match(/(Vendita|Affitto)\s+da\s+Privato\s*-\s*((?:Via|Viale|Piazza|Corso|Largo)[^,\n]+(?:,\s*[A-Za-z]+)?)/i);
      if (pageMatch) {
        sottotitolo = pageMatch[0];
      }
    }
    
    // Estrai indirizzo dal sottotitolo
    const indirizzoMatch = sottotitolo.match(/-\s*((?:Via|Viale|Piazza|Corso|Largo)[^,\n]+(?:,\s*[A-Za-z]+)?)/i);
    if (indirizzoMatch) {
      data.indirizzo = indirizzoMatch[1].trim();
      const parti = data.indirizzo.split(',');
      if (parti.length > 1) {
        data.citta = parti[parti.length - 1].trim();
        data.zona = parti[0].trim(); // "Via Gentilino 15"
      } else {
        data.zona = data.indirizzo;
      }
    }
    
    // Determina tipologia
    const tipoText = sottotitolo.toLowerCase() || pageText.substring(0, 500).toLowerCase();
    if (tipoText.includes('appartamento')) {
      data.tipologia = 'Appartamento';
    } else if (tipoText.includes('villa')) {
      data.tipologia = 'Villa';
    } else if (tipoText.includes('attico')) {
      data.tipologia = 'Attico';
    } else if (tipoText.includes('bilocale')) {
      data.tipologia = 'Appartamento';
      data.locali = 2;
    } else if (tipoText.includes('trilocale')) {
      data.tipologia = 'Appartamento';
      data.locali = 3;
    }
    
    // Tipo contatto
    if (tipoText.includes('privato')) {
      data.contatto.tipo = 'Privato';
    }
    
    // Descrizione - dopo "Descrizione" fino a "Caratteristiche"
    const descMatch = pageText.match(/Descrizione\s+([\s\S]*?)(?=Caratteristiche|Classe energetica)/i);
    if (descMatch) {
      data.descrizione = descMatch[1].trim()
        .replace(/È il tuo annuncio[\s\S]*$/i, '')
        .replace(/Stampa il volantino[\s\S]*$/i, '')
        .trim();
    }
    
    // Dati principali dalla riga "96 m² | 4 locali | € 550.000"
    const mainInfoMatch = pageText.match(/(\d+)\s*m[²q]\s*\|\s*(\d+)\s*locali\s*\|\s*€\s*([\d.]+)/i);
    if (mainInfoMatch) {
      data.superficie = parseInt(mainInfoMatch[1]);
      data.locali = parseInt(mainInfoMatch[2]);
      data.prezzo = parseInt(mainInfoMatch[3].replace(/\./g, ''));
    }
    
    // Classe energetica
    const energyMatch = pageText.match(/Classe energetica[:\s]*([A-G])/i);
    if (energyMatch) {
      data.classeEnergetica = energyMatch[1].toUpperCase();
    }
    
    // IPE
    const ipeMatch = pageText.match(/IPE[:\s]*([\d,]+)\s*kWh/i);
    if (ipeMatch) {
      data.ipe = ipeMatch[1].replace(',', '.');
    }
    
    // Contatto nome
    const contattoMatch = pageText.match(/Inserzionista\s+(\w+)/i);
    if (contattoMatch) {
      data.contatto.nome = contattoMatch[1];
    }
    
    // Immagini
    const images = document.querySelectorAll('img[src*="media.clickcase.it"]');
    images.forEach(img => {
      if (img.src && !img.src.includes('logo') && !img.src.includes('classe')) {
        data.immagini.push(img.src);
      }
    });
    
    // Caratteristiche dal testo
    const textLower = pageText.toLowerCase();
    data.caratteristiche = {
      ascensore: textLower.includes('ascensore'),
      balcone: textLower.includes('balcone'),
      terrazzo: textLower.includes('terrazzo'),
      cantina: textLower.includes('cantina'),
      box: textLower.includes('box') || textLower.includes('garage'),
      arredato: textLower.includes('arredato') || textLower.includes('arredo')
    };
    
    // Piano
    const pianoMatch = pageText.match(/(?:al\s+)?(\d+|terzo|secondo|primo|quarto|quinto)\s*(?:ed\s+ultimo\s+)?piano/i);
    if (pianoMatch) {
      const pianoMap = { 'primo': '1', 'secondo': '2', 'terzo': '3', 'quarto': '4', 'quinto': '5' };
      data.piano = pianoMap[pianoMatch[1].toLowerCase()] || pianoMatch[1];
    }
  }

  data.testoCompleto = document.body.innerText.substring(0, 10000);

  // Determina metodo di contatto
  const hasTelefono = data.contatto?.telefono && data.contatto.telefono.length >= 9;
  const hasEmail = data.contatto?.email && data.contatto.email.includes('@');
  
  if (hasTelefono) {
    data.contattoMetodo = 'telefono';
  } else if (hasEmail) {
    data.contattoMetodo = 'email';
  } else {
    // Nessun contatto diretto - contatto via form
    data.contattoMetodo = 'form';
    data.formUrl = url; // URL della pagina per aprire il form
  }
  
  // Estrai portale dal hostname
  data.portale = hostname.replace('www.', '');

  return data;
}

async function init() {
  const savedUrl = localStorage.getItem('immogest_server_url');
  if (savedUrl) {
    serverUrlEl.value = savedUrl;
  }

  const tab = await getCurrentTab();
  const url = tab?.url || '';
  
  // Normalize hostname to lowercase for comparison
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch (e) {
    hostname = '';
  }
  
  const supportedSites = ['immobiliare.it', 'idealista.it', 'subito.it', 'casa.it', 'clickcase.it'];
  const isSupported = supportedSites.some(site => hostname.includes(site));
  
  if (!url || url.startsWith('chrome://')) {
    setStatus('Apri una pagina di annuncio immobiliare', 'warning');
    return;
  }

  if (!isSupported) {
    setStatus('Sito non supportato. Vai su Immobiliare.it, Idealista, Subito, Casa.it o ClickCase.it', 'warning');
    btnExtract.disabled = true;
    return;
  }

  // ClickCase.it ha URL con ID numerico alla fine: /nome-annuncio-123456.html
  const isListingPage = url.includes('/annunci/') || 
                        url.includes('/immobile/') ||
                        url.includes('/vendita/') ||
                        url.includes('/affitto/') ||
                        (url.includes('clickcase.it') && url.match(/-\d+\.html$/));

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
