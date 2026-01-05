import { ApifyClient } from 'apify-client';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

export async function scrapeUrlWithApify(url: string): Promise<string> {
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN non configurato');
  }

  const client = new ApifyClient({
    token: APIFY_API_TOKEN,
  });

  // Use playwright crawler for better anti-bot bypass
  const run = await client.actor('apify/website-content-crawler').call({
    startUrls: [{ url: url }],
    maxCrawlPages: 1,
    crawlerType: 'playwright:firefox',
    maxCrawlDepth: 0,
    includeUrlGlobs: [],
    excludeUrlGlobs: [],
    keepUrlFragments: false,
    saveHtml: false,
    saveMarkdown: true,
    saveFiles: false,
    saveScreenshots: false,
    maxResults: 1,
    dynamicContentWaitSecs: 5,
    waitForSelector: 'body',
  }, {
    waitSecs: 120,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error('Nessun contenuto estratto dalla pagina. Il sito potrebbe bloccare lo scraping automatico.');
  }

  const content = items[0] as { markdown?: string; text?: string };
  
  const textContent = content.markdown || content.text || '';
  
  if (!textContent) {
    throw new Error('Contenuto della pagina vuoto');
  }

  return textContent as string;
}
