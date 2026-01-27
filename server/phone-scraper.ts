import puppeteer from 'puppeteer';
import { extractPhoneFromImage } from './apify-scraper';
import { execSync } from 'child_process';

interface PhoneExtractionResult {
  phone: string | null;
  method: 'click_reveal' | 'ocr' | 'text' | null;
  screenshot?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findChromiumPath(): string {
  try {
    const path = execSync('which chromium', { encoding: 'utf-8' }).trim();
    if (path) return path;
  } catch (e) {}
  
  try {
    const path = execSync('ls /nix/store/*/bin/chromium 2>/dev/null | head -1', { encoding: 'utf-8', shell: '/bin/bash' }).trim();
    if (path) return path;
  } catch (e) {}
  
  return '/usr/bin/chromium';
}

export async function extractPhoneFromUrl(url: string): Promise<PhoneExtractionResult> {
  let browser = null;
  
  try {
    const chromiumPath = findChromiumPath();
    console.log('[PhoneScraper] Avvio browser headless per:', url);
    console.log('[PhoneScraper] Chromium path:', chromiumPath);
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log('[PhoneScraper] Caricamento pagina...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await delay(3000);
    
    // Gestisci cookie consent popup
    try {
      const cookieButtons = await page.$$('button');
      for (const btn of cookieButtons) {
        const text = await page.evaluate((el: any) => el.textContent?.toLowerCase() || '', btn);
        if (text.includes('accett') || text.includes('accept') || text.includes('consent') || text.includes('agree')) {
          console.log('[PhoneScraper] Accetto cookies...');
          await btn.click();
          await delay(1000);
          break;
        }
      }
    } catch (e) {}

    if (url.includes('immobiliare.it')) {
      return await extractFromImmobiliare(page);
    } else if (url.includes('idealista.it')) {
      return await extractFromIdealista(page);
    } else if (url.includes('casa.it')) {
      return await extractFromCasaIt(page);
    } else {
      return await extractGeneric(page);
    }

  } catch (error: any) {
    console.error('[PhoneScraper] Errore:', error.message);
    return { phone: null, method: null };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractFromImmobiliare(page: any): Promise<PhoneExtractionResult> {
  try {
    console.log('[PhoneScraper] Analisi pagina Immobiliare.it...');
    
    // Prima cattura il contenuto testuale della pagina
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('[PhoneScraper] Contenuto pagina estratto, lunghezza:', pageText.length);
    
    // Cerca numeri di telefono nel testo usando regex
    const phonePatterns = [
      /(?:\+39[\s.-]?)?3[0-9]{2}[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}/g,
      /(?:\+39[\s.-]?)?0[0-9]{1,3}[\s.-]?[0-9]{5,8}/g,
      /3[0-9]{9}/g
    ];
    
    for (const pattern of phonePatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/\D/g, '');
          if (cleaned.length >= 9 && cleaned.length <= 12) {
            if (cleaned.startsWith('3') || cleaned.startsWith('0') || cleaned.startsWith('39')) {
              console.log('[PhoneScraper] Telefono trovato nel testo:', cleaned);
              return { phone: cleaned, method: 'text' };
            }
          }
        }
      }
    }
    
    // Se non troviamo nel testo, proviamo OCR dello screenshot
    console.log('[PhoneScraper] Telefono non trovato nel testo, cattura screenshot per OCR...');
    
    // Fai screenshot della pagina intera
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: false // Solo viewport visibile
    });
    
    const ocrPhone = await extractPhoneFromImage(screenshot.toString());
    
    if (ocrPhone) {
      console.log('[PhoneScraper] Telefono trovato via OCR:', ocrPhone);
      return { phone: ocrPhone, method: 'ocr', screenshot: screenshot.toString() };
    }
    
    // Ultimo tentativo: cerca link tel: nel DOM
    const telLinks = await page.$$('a[href^="tel:"]');
    if (telLinks.length > 0) {
      const href = await page.evaluate((el: any) => el.getAttribute('href'), telLinks[0]);
      if (href) {
        const phone = href.replace('tel:', '').replace(/\D/g, '');
        if (phone.length >= 9) {
          console.log('[PhoneScraper] Trovato link tel:', phone);
          return { phone, method: 'text' };
        }
      }
    }

    return { phone: null, method: null };

  } catch (error: any) {
    console.error('[PhoneScraper] Errore estrazione Immobiliare.it:', error.message);
    return { phone: null, method: null };
  }
}

async function extractFromIdealista(page: any): Promise<PhoneExtractionResult> {
  try {
    console.log('[PhoneScraper] Cerco telefono su Idealista...');
    
    const phoneButton = await page.$('[class*="phone"], .icon-phone, [data-testid="phone"]');
    if (phoneButton) {
      await phoneButton.click();
      await delay(2000);
    }

    const phone = await page.evaluate(() => {
      const phoneLink = document.querySelector('a[href^="tel:"]');
      if (phoneLink) {
        const href = phoneLink.getAttribute('href');
        return href?.replace('tel:', '').replace(/\D/g, '') || null;
      }
      return null;
    });

    if (phone) {
      return { phone, method: 'click_reveal' };
    }

    const screenshot = await page.screenshot({ encoding: 'base64' });
    const ocrPhone = await extractPhoneFromImage(screenshot.toString());
    
    if (ocrPhone) {
      return { phone: ocrPhone, method: 'ocr' };
    }

    return { phone: null, method: null };
  } catch (error) {
    return { phone: null, method: null };
  }
}

async function extractFromCasaIt(page: any): Promise<PhoneExtractionResult> {
  try {
    console.log('[PhoneScraper] Cerco telefono su Casa.it...');
    
    const phone = await page.evaluate(() => {
      const phoneLink = document.querySelector('a[href^="tel:"]');
      if (phoneLink) {
        const href = phoneLink.getAttribute('href');
        return href?.replace('tel:', '').replace(/\D/g, '') || null;
      }
      return null;
    });

    if (phone) {
      return { phone, method: 'text' };
    }

    return { phone: null, method: null };
  } catch (error) {
    return { phone: null, method: null };
  }
}

async function extractGeneric(page: any): Promise<PhoneExtractionResult> {
  try {
    const phone = await page.evaluate(() => {
      const phoneLink = document.querySelector('a[href^="tel:"]');
      if (phoneLink) {
        const href = phoneLink.getAttribute('href');
        return href?.replace('tel:', '').replace(/\D/g, '') || null;
      }
      
      const phonePatterns = [
        /(?:\+39\s?)?3[0-9]{2}[\s.-]?[0-9]{6,7}/g,
        /(?:\+39\s?)?0[0-9]{1,3}[\s.-]?[0-9]{5,8}/g
      ];
      
      const bodyText = document.body.innerText;
      for (const pattern of phonePatterns) {
        const matches = bodyText.match(pattern);
        if (matches && matches[0]) {
          return matches[0].replace(/\D/g, '');
        }
      }
      
      return null;
    });

    return { phone: phone || null, method: phone ? 'text' : null };
  } catch (error) {
    return { phone: null, method: null };
  }
}
