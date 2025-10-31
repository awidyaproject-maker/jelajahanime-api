import puppeteer from 'puppeteer';
import { load } from 'cheerio';

// Copy of scrapeAnimeItems function
const scrapeAnimeItems = ($, container) => {
  const items = [];

  // Try different selectors
  let $items = $('div.thumb');

  // If no thumb elements found, try article tags (for search results, etc)
  if ($items.length === 0) {
    // Use more specific selector to avoid matching nested elements
    $items = $('article.animpost, div.animepost').not('div.animepost div.animepost, div.animepost article.animpost');
  }

  console.log(`Found ${$items.length} thumb/article elements`);

  // If still no items, try to find anime links in text content (for daftar-anime-2 pages)
  if ($items.length === 0) {
    const $links = $('a[href*="/anime/"]');
    console.log(`Found ${$links.length} anime links`);

    $links.each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().trim();

      if (href && text && href.includes('/anime/') && !href.includes('#') && text.length > 2) {
        // Extract title from link text, assuming format like "[Title TV  rating Title Status]"
        let title = text;

        // Remove brackets if present
        if (title.startsWith('[') && title.endsWith(']')) {
          title = title.slice(1, -1);
        }

        // Split by status and take the first part
        const statusMatch = title.match(/\s+(Ongoing|Completed)$/i);
        if (statusMatch) {
          title = title.substring(0, statusMatch.index);
        }

        // The title appears twice: "Title Type  rating Title"
        // Take the part before the rating
        const ratingMatch = title.match(/\s*[\d.]+\s*/);
        if (ratingMatch) {
          title = title.substring(0, ratingMatch.index).trim();
        }

        // Remove type indicators
        title = title.replace(/\s+(TV|OVA|ONA|Special|Movie)$/i, '').trim();

        items.push({
          id: href.split('/').filter(Boolean).pop() || '',
          title: title,
          image: '', // No image in text mode
          synopsis: '',
          status: 'ongoing', // Will be overridden if needed
          url: href,
        });
      }
    });
  } else {
    $items.each((_, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      const href = $link.attr('href');
      const $img = $link.find('img');

      if (href) {
        items.push({
          id: href.split('/').filter(Boolean).pop() || '',
          title: $img.attr('title') || $img.attr('alt') || '',
          image: $img.attr('src') || '',
          synopsis: '',
          status: 'ongoing',
          url: href,
        });
      }
    });
  }

  // Remove duplicates based on ID
  const uniqueItems = items.filter((item, index, self) =>
    index === self.findIndex(i => i.id === item.id)
  );

  console.log(`Extracted ${items.length} anime items, ${uniqueItems.length} unique`);
  return uniqueItems;
};

async function debugSearch() {
  let browser = null;
  let page = null;

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

    const searchUrl = 'https://v1.samehadaku.how/?s=naruto';
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const content = await page.content();
    console.log('Page content length:', content.length);

    const $ = load(content);

    // Check what selectors find
    const thumbElements = $('div.thumb');
    const articleElements = $('article.animpost, div.animepost');

    console.log(`Found ${thumbElements.length} div.thumb elements`);
    console.log(`Found ${articleElements.length} article.animpost/div.animepost elements`);

    // Log the HTML of first few elements
    thumbElements.slice(0, 3).each((i, el) => {
      console.log(`\nThumb element ${i + 1}:`);
      console.log($(el).html());
    });

    articleElements.slice(0, 3).each((i, el) => {
      console.log(`\nArticle element ${i + 1}:`);
      console.log($(el).html());
    });

    // Now scrape items
    const animes = scrapeAnimeItems($);
    console.log(`\nScraped ${animes.length} anime items`);

    // Group by ID to check for duplicates
    const grouped = animes.reduce((acc, anime) => {
      if (!acc[anime.id]) {
        acc[anime.id] = [];
      }
      acc[anime.id].push(anime);
      return acc;
    }, {});

    console.log('\nDuplicate analysis:');
    Object.keys(grouped).forEach(id => {
      const count = grouped[id].length;
      if (count > 1) {
        console.log(`ID "${id}" appears ${count} times`);
      }
    });

    console.log('\nFirst 10 results:');
    animes.slice(0, 10).forEach((anime, i) => {
      console.log(`${i + 1}. ${anime.title} (${anime.id})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

debugSearch();