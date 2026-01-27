import puppeteer from 'puppeteer';
import { extractPhoneFromImage } from './apify-scraper';

interface PhoneExtractionResult {
  phone: string | null;
  method: 'click_reveal' | 'ocr' | 'text' | null;
  screenshot?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function extractPhoneFromUrl(url: string): Promise<PhoneExtractionResult> {
  let browser = null;
  
  try {
    console.log('[PhoneScraper] Avvio browser headless per:', url);
    
    browser = await puppeteer.launch({
      headless: true,
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

    await delay(2000);

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
    console.log('[PhoneScraper] Cerco pulsante "Mostra numero" su Immobiliare.it...');
    
    const phoneButtonSelectors = [
      'button[data-cy="phone-button"]',
      '[data-testid="phone-button"]',
      'button:has-text("Mostra")',
      '.nd-button--callPhoneNumber',
      '[class*="phone"]',
      'a[href^="tel:"]',
      'button[class*="Phone"]',
      '[data-action="showPhone"]'
    ];

    let clicked = false;
    
    for (const selector of phoneButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log('[PhoneScraper] Trovato pulsante con selector:', selector);
          await button.click();
          clicked = true;
          await delay(2000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!clicked) {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate((el: any) => el.textContent, button);
        if (text && (text.includes('Mostra') || text.includes('telefono') || text.includes('Chiama'))) {
          console.log('[PhoneScraper] Trovato pulsante tramite testo:', text);
          await button.click();
          clicked = true;
          await delay(2000);
          break;
        }
      }
    }

    if (!clicked) {
      console.log('[PhoneScraper] Nessun pulsante trovato, tento scraping diretto...');
    }

    const phoneFromPage = await page.evaluate(() => {
      const phonePatterns = [
        /(?:\+39\s?)?3[0-9]{2}[\s.-]?[0-9]{6,7}/g,
        /(?:\+39\s?)?0[0-9]{1,3}[\s.-]?[0-9]{5,8}/g
      ];
      
      const phoneElements = document.querySelectorAll('a[href^="tel:"], [class*="phone"], [data-phone]');
      for (const el of phoneElements) {
        const href = el.getAttribute('href');
        if (href?.startsWith('tel:')) {
          return href.replace('tel:', '').replace(/\D/g, '');
        }
        const dataPhone = el.getAttribute('data-phone');
        if (dataPhone) {
          return dataPhone.replace(/\D/g, '');
        }
      }
      
      const bodyText = document.body.innerText;
      for (const pattern of phonePatterns) {
        const matches = bodyText.match(pattern);
        if (matches) {
          for (const match of matches) {
            const cleaned = match.replace(/\D/g, '');
            if (cleaned.length >= 9 && cleaned.length <= 12) {
              if (cleaned.startsWith('3') || cleaned.startsWith('0')) {
                return cleaned;
              }
            }
          }
        }
      }
      
      return null;
    });

    if (phoneFromPage) {
      console.log('[PhoneScraper] Telefono trovato nel DOM:', phoneFromPage);
      return { phone: phoneFromPage, method: 'click_reveal' };
    }

    console.log('[PhoneScraper] Telefono non trovato nel DOM, tento OCR...');
    
    const contactSection = await page.$('[class*="contact"], [class*="agent"], [class*="phone"], .nd-mediaObject');
    let screenshot: Buffer;
    
    if (contactSection) {
      screenshot = await contactSection.screenshot({ encoding: 'base64' });
    } else {
      screenshot = await page.screenshot({ encoding: 'base64' });
    }

    const ocrPhone = await extractPhoneFromImage(screenshot.toString());
    
    if (ocrPhone) {
      console.log('[PhoneScraper] Telefono trovato via OCR:', ocrPhone);
      return { phone: ocrPhone, method: 'ocr', screenshot: screenshot.toString() };
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
