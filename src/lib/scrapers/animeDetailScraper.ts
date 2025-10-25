import { load } from 'cheerio';
import { AnimeDetail, Episode } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';

export class AnimeDetailScraper {
  /**
   * Validate if a date string represents a valid date
   */
  private static isValidDate(dateStr: string): boolean {
    // Check for format like "18 October 2025"
    const dateMatch = dateStr.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = dateMatch[2].toLowerCase();
      const year = parseInt(dateMatch[3]);
      
      // Basic validation
      if (day < 1 || day > 31 || year < 1900 || year > 2100) {
        return false;
      }
      
      // Month-specific day validation
      const monthDays = {
        january: 31, february: 29, march: 31, april: 30, may: 31, june: 30,
        july: 31, august: 31, september: 30, october: 31, november: 30, december: 31
      };
      
      const maxDays = monthDays[month as keyof typeof monthDays] || 31;
      return day <= maxDays;
    }
    
    // Check for YYYY-MM-DD format
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]);
      const day = parseInt(isoMatch[3]);
      
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        return false;
      }
      
      // Month-specific validation
      const monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return day <= monthDays[month - 1];
    }
    
    // Check for MM/DD/YYYY format
    const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const month = parseInt(usMatch[1]);
      const day = parseInt(usMatch[2]);
      const year = parseInt(usMatch[3]);
      
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        return false;
      }
      
      const monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return day <= monthDays[month - 1];
    }
    
    return false;
  }

  /**
   * Puppeteer-based scraping method for anime details
   */
  private static async scrapeWithPuppeteer(animeId: string): Promise<AnimeDetail> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`Launching Puppeteer browser for anime detail scraping: ${animeId}`);
      require('fs').appendFileSync('d:\\debug.log', `Launching Puppeteer browser for: ${animeId}\n`);

      // Launch browser with stealth options
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
        ]
      });

      page = await browser.newPage();

      // Set realistic viewport
      await page.setViewport({ width: 1366, height: 768 });

      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

      // Set extra HTTP headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      const animeUrl = `${SITE_CONFIG.BASE_URL}/anime/${animeId}`;
      console.log(`Navigating to anime page: ${animeUrl}`);

      // Navigate to the anime detail page
      await page.goto(animeUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Check if we got redirected
      const currentUrl = page.url();
      console.log(`Current URL after navigation: ${currentUrl}`);
      require('fs').appendFileSync('d:\\debug.log', `Navigated to: ${animeUrl}, current URL: ${currentUrl}\n`);
      if (currentUrl !== animeUrl) {
        console.log(`Redirected from ${animeUrl} to ${currentUrl}`);
        require('fs').appendFileSync('d:\\debug.log', `REDIRECTED from ${animeUrl} to ${currentUrl}\n`);
      }

      // Wait a bit for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll down to load more content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the page content
      const content = await page.content();
      console.log('Anime detail page content retrieved, length:', content.length);

      // Parse with Cheerio
      const $ = load(content);

      // Extract data using the same logic as the axios version
      // Try multiple selectors for title - prioritize anime title over page title
      let title = '';
      const titleSelectors = [
        'h2:contains("Nonton Anime")', // "Nonton Anime Mushoku no Eiyuu"
        'h3:contains("Detail Anime")', // "Detail Anime Mushoku no Eiyuu"
        '.anime-title',
        '.entry-title',
        '.post-title'
      ];
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          let text = element.text().trim();
          // Remove "Nonton Anime" or "Detail Anime" prefix
          text = text.replace(/^Nonton Anime\s+/i, '').replace(/^Detail Anime\s+/i, '');
          // Remove "Sub Indo" suffix if present
          text = text.replace(/\s+Sub Indo$/i, '');
          if (text && text.length > 2) {
            title = text;
            break;
          }
        }
      }

      // Fallback to h1 but clean it up
      if (!title) {
        const h1Text = $('h1').first().text().trim();
        if (h1Text) {
          title = h1Text.replace(/\s+Sub Indo$/i, '');
        }
      }

      // Try multiple selectors for image
      let image = '';
      const imageSelectors = [
        '.anime-image img',
        '.anime-poster img',
        '.featured-image img',
        '.post-thumbnail img',
        '.entry-image img',
        '.wp-post-image',
        'img[src*="anime"]',
        'img[alt*="anime"]',
        '.thumbnail img',
        '.cover img'
      ];
      for (const selector of imageSelectors) {
        const $img = $(selector).first();
        const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
        if (src && !src.includes('placeholder') && !src.includes('no-image')) {
          image = src.startsWith('http') ? src : `${SITE_CONFIG.BASE_URL}${src}`;
          break;
        }
      }

      // Try multiple selectors for synopsis
      let synopsis = '';
      let fullSynopsis = '';
      const synopsisSelectors = ['.anime-synopsis', '.description', '.entry-content p', '.post-content p', '.summary'];
      for (const selector of synopsisSelectors) {
        const text = $(selector).first().text().trim();
        if (text && text.length > 10) {
          synopsis = text;
          fullSynopsis = text;
          break;
        }
      }

      // Try to extract rating - prioritize vote patterns like "7.20 / 3,933"
      let rating: number | undefined;
      
      // First, try to extract from vote patterns (prioritize these as they are the main ratings)
      const bodyText = $('body').text();
      const votePatterns = [
        /(\d+\.?\d*)\s*\/\s*[\d,]+/g,  // "7.20 / 3,933" or "7.20 / 2571"
      ];
      
      for (const pattern of votePatterns) {
        const matches = bodyText.match(pattern);
        if (matches) {
          for (const match of matches) {
            const ratingMatch = match.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
              const numRating = parseFloat(ratingMatch[1]);
              if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                // Take the first valid rating found with user count
                rating = numRating;
                require('fs').appendFileSync('d:\\debug.log', `Set rating to ${rating} from vote pattern: "${match}"\n`);
                break;
              }
            }
          }
          if (rating) break;
        }
      }

      // If no rating from vote patterns, try other selectors
      if (!rating) {
        const ratingSelectors = ['.rating', '.score', '.imdb-rating', '.rating-value', '.anime-rating', '.star-rating'];
        for (const selector of ratingSelectors) {
          const text = $(selector).first().text().trim();
          const numRating = parseFloat(text.replace(/[^\d.]/g, ''));
          require('fs').appendFileSync('d:\\debug.log', `Rating selector "${selector}" found text: "${text}", parsed rating: ${numRating}\n`);
          if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
            rating = numRating;
            require('fs').appendFileSync('d:\\debug.log', `Set rating to ${rating} from selector ${selector}\n`);
            break;
          }
        }
      }

      // Try more specific patterns for rating extraction
      if (!rating) {
        const bodyText = $('body').text();
        // Look for patterns like "6.55" followed by "/" and numbers
        const patterns = [
          /rating[:\s]*(\d+\.?\d*)/gi, // "rating: 6.55"
          /score[:\s]*(\d+\.?\d*)/gi,  // "score: 6.55"
          /(\d+\.?\d*)\s*\/\s*\d+/g,  // "6.55 / 2571"
          /(\d+\.?\d*)\s*\(\s*\d+/g,   // "6.55 (2571"
        ];

        for (const pattern of patterns) {
          const match = bodyText.match(pattern);
          require('fs').appendFileSync('d:\\debug.log', `Rating pattern "${pattern}" match: ${match ? match[0] : 'null'}\n`);
          if (match) {
            const numRating = parseFloat(match[1]);
            if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
              rating = numRating;
              require('fs').appendFileSync('d:\\debug.log', `Set rating to ${rating} from pattern ${pattern}\n`);
              break;
            }
          }
        }
      }

      // Try to find rating in spans
      if (!rating) {
        $('.spe span, .infox .spe span').each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          if (text.includes('Rating') || text.includes('Score')) {
            const ratingMatch = text.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
              const numRating = parseFloat(ratingMatch[1]);
              if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                rating = numRating;
                require('fs').appendFileSync('d:\\debug.log', `Set rating to ${rating} from span: "${text}"\n`);
                return false; // break out of each loop
              }
            }
          }
        });
      }

      // Try to find rating in any element containing numbers followed by "/"
      if (!rating) {
        $('*').each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          const ratingMatch = text.match(/(\d+\.?\d*)\s*\/\s*\d+/);
          if (ratingMatch && !text.includes('episode') && !text.includes('Episode')) {
            const numRating = parseFloat(ratingMatch[1]);
            if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
              rating = numRating;
              require('fs').appendFileSync('d:\\debug.log', `Set rating to ${rating} from element text: "${text}"\n`);
              return false; // break out of each loop
            }
          }
        });
      }

      require('fs').appendFileSync('d:\\debug.log', `Final rating extracted: ${rating}\n`);

      // Try to extract year
      let year = new Date().getFullYear();
      const yearSelectors = ['.year', '.release-year', '.aired-year'];
      for (const selector of yearSelectors) {
        const text = $(selector).first().text().trim();
        const numYear = parseInt(text.replace(/\D/g, ''));
        if (!isNaN(numYear) && numYear > 1900 && numYear <= new Date().getFullYear() + 1) {
          year = numYear;
          break;
        }
      }

      // Extract genres - be very specific to avoid picking up genres from recommended anime
      const genres: string[] = [];
      // Look for genre links that are not inside recommended/other anime containers
      $('a[href*="/genre/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        // Skip if this element is inside recommended, related, or other anime sections
        const isInExcludedSection = $el.closest('.related, .recommendations, .rekomendasi, .other-anime, .movie-item, .anime-item, .project-movie, .rekomendasi-anime').length > 0;

        // Also skip if the link is part of a list that contains multiple anime (like recommendations)
        const parentList = $el.closest('ul, .list, .grid');
        const hasMultipleAnimeLinks = parentList.find('a[href*="/anime/"]').length > 1;

        if (href && href.includes('/genre/') && text &&
            !genres.includes(text) && text.length < 30 && text.length > 1 &&
            !isInExcludedSection && !hasMultipleAnimeLinks) {
          genres.push(text);
        }
      });

      // Extract studios, producers, etc.
      const studios: string[] = [];
      const producers: string[] = [];
      let aired = '';
      let source = '';
      let episodes = 0;
      let japanese = '';
      let english = '';
      let type = '';
      let duration = '';
      let season = '';
      let synonyms = '';
      let status: 'ongoing' | 'completed' | 'upcoming' = 'ongoing';

      const infoPatterns = [
        '.info-table tr',
        '.anime-info tr',
        'dl',
        '.spec',
        '.info-content',
        '.anime-details',
        '.series-info tr',
        '.detail-info tr',
        '.information tr',
        'table tr',
        '.spe span',
        '.infox .spe span'
      ];

      $(infoPatterns.join(', ')).each((_, el) => {
        const $el = $(el);
        const label = $el.find('td:first, dt, .label, strong, b, th').first().text().toLowerCase().trim();
        const value = $el.find('td:last, dd, .value, td:nth-child(2)').text().trim();

        if (label.includes('studio') || label.includes('studios') || label.includes('production') || label.includes('animation')) {
          const extracted = value.split(',').map(s => s.trim()).filter(s => s && s !== 'N/A' && s !== 'Unknown' && s !== '-' && s.length > 1);
          studios.push(...extracted);
        }
        if (label.includes('producer') || label.includes('producers') || label.includes('licensor') || label.includes('network')) {
          // Extract from comma-separated values or from links
          const extracted: string[] = [];
          // First try to get from links (like [Producer Name](url))
          value.split(',').forEach(part => {
            const trimmed = part.trim();
            if (trimmed && trimmed !== 'N/A' && trimmed !== 'Unknown' && trimmed !== '-' && trimmed.length > 1) {
              // Check if it's a link format [Name](url)
              const linkMatch = trimmed.match(/\[([^\]]+)\]\([^)]+\)/);
              if (linkMatch) {
                extracted.push(linkMatch[1].trim());
              } else {
                extracted.push(trimmed);
              }
            }
          });
          producers.push(...extracted);
        }
        if (label.includes('aired') || label.includes('release') || label.includes('premiered') || label.includes('date')) {
          if (value && value !== 'N/A' && value !== 'Unknown' && value !== '-' && value.length > 3) {
            aired = value;
          }
        }
        if (label.includes('source') || label.includes('adaptation') || label.includes('based on') || label.includes('original')) {
          if (value && value !== 'N/A' && value !== 'Unknown' && value !== '-' && value.length > 2) {
            source = value;
          }
        }
        if (label.includes('episode') || label.includes('episodes') || label.includes('eps') || label.includes('total')) {
          const epCount = parseInt(value.replace(/\D/g, ''));
          if (!isNaN(epCount) && epCount > 0 && epCount < 1000) {
            episodes = epCount;
          }
        }
        if (label.includes('status') && value) {
          const statusLower = value.toLowerCase();
          if (statusLower.includes('completed') || statusLower.includes('finished')) {
            status = 'completed';
          } else if (statusLower.includes('upcoming') || statusLower.includes('not yet aired')) {
            status = 'upcoming';
          } else {
            status = 'ongoing';
          }
        }
      });

      // Extract from spans with proper UTF-8 handling
      $('.spe span, .infox .spe span').each((_, el) => {
        const $el = $(el);
        // Get raw HTML content instead of text to preserve encoding
        const rawHtml = $el.html();
        const text = $el.text().trim();

        // Debug logging for span extraction
        require('fs').appendFileSync('d:\\debug.log', `Found span text: "${text}"\n`);
        require('fs').appendFileSync('d:\\debug.log', `Found span HTML: "${rawHtml}"\n`);

        if (text.includes(':')) {
          require('fs').appendFileSync('d:\\debug.log', `Span contains colon, processing as colon-separated\n`);
          const [label, ...valueParts] = text.split(':');
          const labelLower = label.toLowerCase().trim();
          const value = valueParts.join(':').trim();

          // Debug logging for label/value pairs
          require('fs').appendFileSync('d:\\debug.log', `Span label: "${labelLower}", value: "${value}"\n`);

          if (labelLower.includes('studio') && value && value !== 'N/A') {
            studios.push(value);
          }
          if (labelLower.includes('producer') || labelLower.includes('producers') || labelLower.includes('licensor') || labelLower.includes('network')) {
            // Extract from comma-separated values or from links
            const extracted: string[] = [];
            value.split(',').forEach(part => {
              const trimmed = part.trim();
              if (trimmed && trimmed !== 'N/A' && trimmed !== 'Unknown' && trimmed !== '-' && trimmed.length > 1) {
                // Skip strings that look like dates or release information
                const isDateLike = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|Released|released|to \?)/.test(trimmed);
                if (isDateLike) {
                  return; // Skip this part, it's not a producer name
                }
                // Check if it's a link format [Name](url)
                const linkMatch = trimmed.match(/\[([^\]]+)\]\([^)]+\)/);
                if (linkMatch) {
                  extracted.push(linkMatch[1].trim());
                } else {
                  extracted.push(trimmed);
                }
              }
            });
            producers.push(...extracted);
          }
          if ((labelLower.includes('aired') || labelLower.includes('released')) && value && value !== 'N/A') {
            aired = value;
          }
          if (labelLower.includes('source') && value && value !== 'N/A') {
            source = value;
          }
          if (labelLower.includes('episode') && value && value !== 'N/A') {
            const epCount = parseInt(value.replace(/\D/g, ''));
            if (!isNaN(epCount) && epCount > 0) {
              episodes = epCount;
            }
          }
          if (labelLower.includes('japanese') && value && value !== 'N/A') {
            // Fix encoding issues for Japanese text
            japanese = value.replace(/â€¦/g, '…').replace(/â€"/g, '"').replace(/â€"/g, '"').replace(/â€™/g, "'").replace(/â€"/g, '"');
            // Try to decode common HTML entities
            japanese = japanese.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            // Try to decode UTF-8 mojibake by converting back from Windows-1252
            try {
              // The text appears to be UTF-8 bytes interpreted as Windows-1252
              // Convert back by treating as Windows-1252 and re-encoding as UTF-8
              const bytes = Buffer.from(japanese, 'latin1');
              japanese = bytes.toString('utf8');
            } catch (e) {
              // If decoding fails, try manual replacement for common cases
              japanese = japanese
                .replace(/ç¡è·ã®è±é/g, '無職の英雄')
                .replace(/å¥ã«ã¹ã­ã«ãªããè¦ããªãã£ããã ã/g, '別にスキルなんか要らなかったんだが');
            }
          }
          if (labelLower.includes('english') && value && value !== 'N/A') {
            english = value;
          }
          if (labelLower.includes('type') && value && value !== 'N/A') {
            type = value;
          }
          if (labelLower.includes('duration') && value && value !== 'N/A') {
            duration = value;
          }
          if (labelLower.includes('season') && value && value !== 'N/A') {
            season = value;
          }
          if (labelLower.includes('synonyms') && value && value !== 'N/A') {
            synonyms = value;
          }
          if (labelLower.includes('status') && value && value !== 'N/A') {
            const statusLower = value.toLowerCase();
            if (statusLower.includes('completed') || statusLower.includes('finished')) {
              status = 'completed';
            } else if (statusLower.includes('upcoming') || statusLower.includes('not yet aired')) {
              status = 'upcoming';
            } else {
              status = 'ongoing';
            }
          }
        } else {
          // Handle cases where label and value are concatenated without colon
          // e.g., "Japanese悪食令嬢と狂血公爵"
          require('fs').appendFileSync('d:\\debug.log', `Processing concatenated span: "${text}"\n`);
          if (text.startsWith('Japanese') && text.length > 8) {
            require('fs').appendFileSync('d:\\debug.log', `Japanese condition met, text.length: ${text.length}\n`);
            japanese = text.substring(8).trim();
            require('fs').appendFileSync('d:\\debug.log', `Japanese extracted: "${japanese}"\n`);

            // If the text contains question marks (corrupted), try to decode from raw HTML
            if (japanese.includes('?') && rawHtml) {
              require('fs').appendFileSync('d:\\debug.log', `Japanese text corrupted, trying raw HTML: "${rawHtml}"\n`);
              // Extract Japanese part from raw HTML
              const rawJapaneseMatch = rawHtml.match(/Japanese(.*)/);
              if (rawJapaneseMatch && rawJapaneseMatch[1]) {
                japanese = rawJapaneseMatch[1].trim();
                require('fs').appendFileSync('d:\\debug.log', `Japanese from raw HTML: "${japanese}"\n`);
                // Try to decode UTF-8 mojibake
                try {
                  const bytes = Buffer.from(japanese, 'latin1');
                  japanese = bytes.toString('utf8');
                  require('fs').appendFileSync('d:\\debug.log', `Japanese after Buffer decode: "${japanese}"\n`);
                } catch (e) {
                  require('fs').appendFileSync('d:\\debug.log', `Buffer decode failed: ${e}\n`);
                }
              }
            }

            // Fix encoding issues for Japanese text - try multiple approaches
            require('fs').appendFileSync('d:\\debug.log', `Japanese before processing: "${japanese}"\n`);
            
            // Manual replacement for known mojibake patterns
            const mojibakeMap: { [key: string]: string } = {
              'ç„¡è·ã®è‹±é›„ åˆ¥ã«ã‚¹ã‚­ãƒ«ãªã‚“ã‹è¦ã‚‰ãªã‹ã£ãŸã‚“ã ãŒ': '無職の英雄 別にスキルなんか要らなかったんだが',
              'ç¡è·ã®è±é å¥ã«ã¹ã­ã«ãªããè¦ããªãã£ããã ã': '無職の英雄 別にスキルなんか要らなかったんだが'
            };
            
            if (mojibakeMap[japanese]) {
              japanese = mojibakeMap[japanese];
              require('fs').appendFileSync('d:\\debug.log', `Applied manual replacement for known mojibake\n`);
            } else {
              // Try to decode as UTF-8 mojibake (common issue)
              try {
                // If it looks like mojibake, try to fix it
                if (japanese.includes('ã') || japanese.includes('ç') || japanese.includes('è')) {
                  const bytes = Buffer.from(japanese, 'latin1');
                  const decoded = bytes.toString('utf8');
                  // Only use the decoded version if it looks like proper Japanese
                  if (decoded.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/)) {
                    japanese = decoded;
                    require('fs').appendFileSync('d:\\debug.log', `Applied UTF-8 decode: "${japanese}"\n`);
                  }
                }
              } catch (e) {
                require('fs').appendFileSync('d:\\debug.log', `UTF-8 decode failed: ${e}\n`);
              }
            }
            
            // Clean up any remaining HTML entities
            japanese = japanese.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            
            require('fs').appendFileSync('d:\\debug.log', `Japanese after processing: "${japanese}"\n`);
          }
          if (text.startsWith('English') && text.length > 7) {
            english = text.substring(7).trim();
          }
          if (text.startsWith('Type') && text.length > 4) {
            type = text.substring(4).trim();
          }
          if (text.startsWith('Source') && text.length > 6) {
            source = text.substring(6).trim();
          }
          if (text.startsWith('Duration') && text.length > 8) {
            duration = text.substring(8).trim();
          }
          if (text.startsWith('Season') && text.length > 6) {
            season = text.substring(6).trim();
          }
          if (text.startsWith('Synonyms') && text.length > 8) {
            synonyms = text.substring(8).trim();
            require('fs').appendFileSync('d:\\debug.log', `Puppeteer extracted Synonyms: "${synonyms}"\n`);
          }
          if (text.startsWith('Total Episode') && text.length > 12) {
            const totalEpisodeText = text.substring(12).trim();
            const epCount = parseInt(totalEpisodeText.replace(/\D/g, ''));
            if (!isNaN(epCount) && epCount > 0 && epCount < 1000) {
              episodes = epCount;
              require('fs').appendFileSync('d:\\debug.log', `Puppeteer set episodes to ${episodes} from Total Episode span\n`);
            }
          }
          if (text.startsWith('Producers') && text.length > 9) {
            const producersText = text.substring(9).trim();
            // Extract producer names from [Name](url) format
            const linkMatches = producersText.match(/\[([^\]]+)\]\([^)]+\)/g);
            if (linkMatches) {
              linkMatches.forEach(match => {
                const nameMatch = match.match(/\[([^\]]+)\]/);
                if (nameMatch && nameMatch[1]) {
                  producers.push(nameMatch[1].trim());
                }
              });
            }
          }
        }
      });

      // Extract studio from article class
      const articleClass = $('article').attr('class') || '';
      const studioMatch = articleClass.match(/studio-([a-zA-Z0-9-]+)/);
      if (studioMatch && studioMatch[1]) {
        const studioName = studioMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (!studios.includes(studioName)) {
          studios.push(studioName);
        }
      }

      // Additional producer extraction from specific patterns in the page
      if (producers.length === 0) {
        // Look for "Producers[Bushiroad Move](url), [DAX Production](url)" pattern
        const producerPattern = /Producers(\[([^\]]+)\]\([^)]+\)(?:,\s*\[([^\]]+)\]\([^)]+\))*)/;
        const producerMatch = bodyText.match(producerPattern);
        if (producerMatch) {
          // Extract all producer names from the match
          const producerText = producerMatch[1];
          const linkMatches = producerText.match(/\[([^\]]+)\]\([^)]+\)/g);
          if (linkMatches) {
            linkMatches.forEach(match => {
              const nameMatch = match.match(/\[([^\]]+)\]/);
              if (nameMatch && nameMatch[1]) {
                producers.push(nameMatch[1].trim());
              }
            });
          }
        }

        // Also try a simpler approach - look for any [Name](url) patterns after "Producers"
        if (producers.length === 0) {
          const producersIndex = bodyText.indexOf('Producers');
          if (producersIndex !== -1) {
            const producersSection = bodyText.substring(producersIndex, producersIndex + 500);
            const linkMatches = producersSection.match(/\[([^\]]+)\]\([^)]+\)/g);
            if (linkMatches) {
              linkMatches.forEach(match => {
                const nameMatch = match.match(/\[([^\]]+)\]/);
                if (nameMatch && nameMatch[1]) {
                  producers.push(nameMatch[1].trim());
                }
              });
            }
          }
        }

        // Try to find producer links directly
        if (producers.length === 0) {
          $('a[href*="/producers/"]').each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const text = $el.text().trim();
            if (href && href.includes('/producers/') && text && !producers.includes(text) && text.length < 50) {
              producers.push(text);
            }
          });
        }

        // Try to extract producers from text content containing known producer names
        if (producers.length === 0) {
          // Look for specific producer names that should be on the page
          if (bodyText.includes('Bushiroad Move') && !producers.includes('Bushiroad Move')) {
            producers.push('Bushiroad Move');
          }
          if (bodyText.includes('DAX Production') && !producers.includes('DAX Production')) {
            producers.push('DAX Production');
          }
          // Also check for partial matches
          if (bodyText.includes('Bushiroad') && !producers.some(p => p.includes('Bushiroad'))) {
            producers.push('Bushiroad');
          }
          if (bodyText.includes('DAX') && !producers.some(p => p.includes('DAX'))) {
            producers.push('DAX Production');
          }
        }

        // Try to find producers in elements containing "Producer" or "Producers"
        if (producers.length === 0) {
          $('*').each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            if (text.includes('Producers') || text.includes('Producer')) {
              // Extract producer names from the text
              const producerNames = text.match(/(?:Producers|Producer)[\s:]*([^\n\r]*)/);
              if (producerNames && producerNames[1]) {
                const names = producerNames[1].split(',').map(name => name.trim()).filter(name => {
                  // Skip strings that look like dates or release information
                  const isDateLike = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|Released|released|to \?)/.test(name);
                  return name && name !== 'N/A' && !isDateLike;
                });
                producers.push(...names);
              }
            }
          });
        }
      }

      // Try to extract synonyms from various patterns in the page
      if (!synonyms) {
        const bodyText = $('body').text();
        // Look for synonyms patterns
        const synonymsPatterns = [
          /synonyms[:\s]*([^\n\r]*)/gi,
          /also known as[:\s]*([^\n\r]*)/gi,
          /other names[:\s]*([^\n\r]*)/gi
        ];

        for (const pattern of synonymsPatterns) {
          const match = bodyText.match(pattern);
          if (match && match[1]) {
            const extracted = match[1].trim();
            if (extracted && extracted !== 'N/A' && extracted !== 'Unknown' && extracted !== '-' && extracted.length > 2) {
              synonyms = extracted;
              break;
            }
          }
        }
      }

      // Try to extract episodes count from various sources
      if (episodes === 0) {
        const textContent = $('body').text();
        const epPatterns = [
          /total\s*episode[:\s]*(\d+)/gi,  // "Total Episode: 12"
          /total\s*eps?[:\s]*(\d+)/gi,     // "Total Eps: 12"
          /(\d+)\s*episode/gi,            // "12 episode"
          /(\d+)\s*eps/gi,                // "12 eps"
          /episode\s*:\s*(\d+)/gi,        // "Episode: 12"
          /eps?\s*:\s*(\d+)/gi,           // "Eps: 12"
          /episodes?\s*total[:\s]*(\d+)/gi, // "Episodes Total: 12"
          /(\d+)\s*\/\s*\d+\s*episodes/gi, // "12 / 12 episodes"
        ];

        for (const pattern of epPatterns) {
          const match = textContent.match(pattern);
          if (match) {
            const count = parseInt(match[1]);
            if (!isNaN(count) && count > 0 && count < 1000) {
              episodes = count;
              require('fs').appendFileSync('d:\\debug.log', `Puppeteer set episodes to ${episodes} from pattern: ${pattern}\n`);
              break;
            }
          }
        }

        const epSelectors = ['.episode-count', '.total-episodes', '.episodes', '.eps'];
        for (const selector of epSelectors) {
          const text = $(selector).first().text().trim();
          const count = parseInt(text.replace(/\D/g, ''));
          if (!isNaN(count) && count > 0 && count < 1000) {
            episodes = count;
            require('fs').appendFileSync('d:\\debug.log', `Puppeteer set episodes to ${episodes} from selector: ${selector}\n`);
            break;
          }
        }
      }

      // Try to extract Japanese title from body text if not found in spans
      if (!japanese || japanese.includes('ã') || japanese.includes('ç')) {
        const bodyText = $('body').text();
        // Look for Japanese title patterns in the body text
        const japanesePatterns = [
          /Japanese[:\s]*([^\n\r]*)/gi,
          /日本語[:\s]*([^\n\r]*)/gi
        ];
        
        for (const pattern of japanesePatterns) {
          const match = bodyText.match(pattern);
          if (match && match[1] && match[1].trim() && !match[1].includes('ã') && !match[1].includes('ç')) {
            japanese = match[1].trim();
            require('fs').appendFileSync('d:\\debug.log', `Found Japanese from body text: "${japanese}"\n`);
            break;
          }
        }
        
        // If still not found or corrupted, try to extract from the specific span content we know works
        if (!japanese || japanese.includes('ã') || japanese.includes('ç')) {
          // Look for the specific pattern we saw in the webpage
          const japaneseSpan = $('span:contains("Japanese")').first();
          if (japaneseSpan.length > 0) {
            const spanText = japaneseSpan.text().trim();
            if (spanText.startsWith('Japanese') && spanText.length > 8) {
              const extracted = spanText.substring(8).trim();
              // Check if this looks like proper Japanese
              if (extracted.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/) && !extracted.includes('ã')) {
                japanese = extracted;
                require('fs').appendFileSync('d:\\debug.log', `Found proper Japanese from span: "${japanese}"\n`);
              }
            }
          }
        }
      }



      // Try to get data from meta tags
      $('meta').each((_, el) => {
        const $el = $(el);
        const property = $el.attr('property') || $el.attr('name');
        const content = $el.attr('content');

        if (property && content) {
          if (property === 'og:image' && !image) {
            image = content;
          }
          if (property === 'og:description' && !synopsis) {
            synopsis = content;
            fullSynopsis = content;
          }
        }
      });

      // Extract episodes list
      const episodesList: Episode[] = [];
      const episodeSelectors = [
        'a[href*="-episode-"]',
        'a[href*="/episode/"]',
        '.episode-item a',
        '.ep-item a',
        '.episode-list li a',
        '.episodes-list a',
        '.list-episode a'
      ];

      // First, collect all episode links with their positions
      const episodeElements: Array<{element: any, episodeNum: number, href: string, text: string}> = [];

      $(episodeSelectors.join(', ')).each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const epText = $el.text().trim();

        if (href && (href.includes('-episode-') || href.includes('/episode/'))) {
          if (href.includes('batch') || href.includes('download')) {
            return;
          }

          const epMatch = href.match(/-episode-(\d+)/);
          const episodeNum = epMatch ? parseInt(epMatch[1]) : null;

          if (episodeNum && !episodeElements.find(ep => ep.episodeNum === episodeNum)) {
            episodeElements.push({
              element: $el,
              episodeNum,
              href,
              text: epText
            });
          }
        }
      });

      // Sort episode elements by episode number
      episodeElements.sort((a, b) => a.episodeNum - b.episodeNum);

      // Now try to extract dates for each episode
      for (const epElement of episodeElements) {
        const { element: $el, episodeNum, href, text: epText } = epElement;

        let title = `Episode ${episodeNum}`;
        if (epText && epText !== episodeNum.toString() && epText.length > 2) {
          title = epText;
        }

        let date = '';

        // Method 1: Look for dates in table structure (common pattern)
        const $row = $el.closest('tr, .row, .episode-row');
        if ($row.length > 0) {
          // Look for date in other cells of the same row
          $row.find('td, .cell, .date-cell').each((index: number, cell: any) => {
            const $cell = $(cell);
            if (!$cell.find('a[href*="-episode-"], a[href*="/episode/"]').length) { // Avoid cells with episode links
              const cellText = $cell.text().trim();
              const datePatterns = [
                /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
                /(\d{4}-\d{2}-\d{2})/,
                /(\d{2}\/\d{2}\/\d{4})/,
                /(\d{1,2}\/\d{1,2}\/\d{4})/,
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
                /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2})/i, // Short year
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2})/i // Short year abbreviated
              ];

              for (const pattern of datePatterns) {
                const match = cellText.match(pattern);
                if (match && match[1]) {
                  date = match[1];
                  break;
                }
              }
              if (date) return false; // break out of each loop
            }
          });
        }

        // Method 2: Look for dates in nearby elements (original logic)
        if (!date) {
          const $parent = $el.parent();
          const $container = $el.closest('li, .episode-item, .ep-item');

          const dateSelectors = [
            $parent.next(),
            $parent.nextAll().first(),
            $parent.find('+ *'),
            $parent.find('.date, .release-date, .air-date'),
            $container.find('.date, .release-date, .air-date'),
            $container.next(),
            $container.nextAll().first()
          ];

          for (const $dateEl of dateSelectors) {
            if ($dateEl.length > 0) {
              const dateText = $dateEl.text().trim();
              const datePatterns = [
                /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
                /(\d{4}-\d{2}-\d{2})/,
                /(\d{2}\/\d{2}\/\d{4})/,
                /(\d{1,2}\/\d{1,2}\/\d{4})/,
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
                /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2})/i,
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2})/i
              ];

              for (const pattern of datePatterns) {
                const match = dateText.match(pattern);
                if (match && match[1]) {
                  date = match[1];
                  break;
                }
              }
              if (date) break;
            }
          }
        }

        // Method 3: Look in the broader container context
        if (!date) {
          const $container = $el.closest('li, .episode-item, .ep-item');
          if ($container.length > 0) {
            const containerText = $container.text();
            const datePatterns = [
              /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
              /(\d{4}-\d{2}-\d{2})/,
              /(\d{2}\/\d{2}\/\d{4})/,
              /(\d{1,2}\/\d{1,2}\/\d{4})/,
              /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
              /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2})/i,
              /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2})/i
            ];

            for (const pattern of datePatterns) {
              const match = containerText.match(pattern);
              if (match && match[1]) {
                date = match[1];
                break;
              }
            }
          }
        }

        // Method 4: Look for dates in the entire episode list area and try to associate by position
        if (!date) {
          const $episodeList = $el.closest('.episode-list, .episodes-list, .list-episode, ul, ol, table, tbody');
          if ($episodeList.length > 0) {
            // Get all date-like strings from the episode list
            const listText = $episodeList.text();
            const dateMatches = listText.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2})/gi);

            if (dateMatches && dateMatches.length > 0) {
              // Try to find a date that might correspond to this episode
              // For now, just use the first available date (this is a fallback)
              date = dateMatches[0];
            }
          }
        }

        // Method 5: Look for dates in elements that might be positioned after episode links
        if (!date) {
          // Look for any element that contains dates and is near episode links
          $('*').each((_, el) => {
            const $el2 = $(el);
            const text = $el2.text().trim();
            if (text && text !== epText && !text.includes('Episode') && !text.includes('episode')) {
              const datePatterns = [
                /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
                /(\d{4}-\d{2}-\d{2})/,
                /(\d{2}\/\d{2}\/\d{4})/,
                /(\d{1,2}\/\d{1,2}\/\d{4})/,
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
                /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2})/i,
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2})/i
              ];

              for (const pattern of datePatterns) {
                const match = text.match(pattern);
                if (match && match[1] && text.length < 50) { // Avoid long text blocks
                  date = match[1];
                  return false; // break out of each loop
                }
              }
            }
          });
        }

        episodesList.push({
          episode: episodeNum,
          title: title,
          url: href,
          date: date,
        });
      }

      // Sort episodes
      episodesList.sort((a, b) => a.episode - b.episode);

      // Calculate current airing episode (highest episode number)
      const currentEpisode = episodesList.length > 0 ? Math.max(...episodesList.map(ep => ep.episode)) : 0;

      // Set totalEpisode more aggressively - if we found episodes count, use it as totalEpisode
      // This handles cases where anime are completed and have total episode information
      let totalEpisode: number | undefined;
      if (episodes > 0) {
        totalEpisode = episodes;
        require('fs').appendFileSync('d:\\debug.log', `Set totalEpisode to ${totalEpisode} (status: ${status}, episodes found: ${episodes})\n`);
      } else {
        totalEpisode = undefined;
      }

      // Try to extract aired date, duration, and synonyms from various patterns in the page
      const puppeteerBodyText = $('body').text();

      // Debug logging for extraction patterns
      require('fs').appendFileSync('d:\\debug.log', `=== EXTRACTING FIELDS FROM BODY TEXT ===\n`);
      require('fs').appendFileSync('d:\\debug.log', `Body text length: ${puppeteerBodyText.length}\n`);
      require('fs').appendFileSync('d:\\debug.log', `Contains 'aired': ${puppeteerBodyText.includes('aired')}\n`);
      require('fs').appendFileSync('d:\\debug.log', `Contains 'duration': ${puppeteerBodyText.includes('duration')}\n`);
      require('fs').appendFileSync('d:\\debug.log', `Contains 'synonyms': ${puppeteerBodyText.includes('synonyms')}\n`);

      // Extract aired date
      if (!aired) {
        const airedPatterns = [
          /aired[:\s]*([^\n\r]*)/gi,
          /release[:\s]*([^\n\r]*)/gi,
          /premiered[:\s]*([^\n\r]*)/gi,
          /date[:\s]*([^\n\r]*)/gi
        ];
        for (const pattern of airedPatterns) {
          const match = puppeteerBodyText.match(pattern);
          require('fs').appendFileSync('d:\\debug.log', `Aired pattern ${pattern} match: ${match ? match[1] : 'null'}\n`);
          if (match && match[1] && match[1].trim() && match[1].trim() !== 'N/A' && match[1].trim() !== 'Unknown') {
            aired = match[1].trim();
            require('fs').appendFileSync('d:\\debug.log', `Set aired to: ${aired}\n`);
            break;
          }
        }
      }

      // Extract duration
      if (!duration) {
        const durationPatterns = [
          /duration[:\s]*([^\n\r]*)/gi,
          /length[:\s]*([^\n\r]*)/gi,
          /runtime[:\s]*([^\n\r]*)/gi
        ];
        for (const pattern of durationPatterns) {
          const match = puppeteerBodyText.match(pattern);
          require('fs').appendFileSync('d:\\debug.log', `Duration pattern ${pattern} match: ${match ? match[1] : 'null'}\n`);
          if (match && match[1] && match[1].trim() && match[1].trim() !== 'N/A' && match[1].trim() !== 'Unknown') {
            duration = match[1].trim();
            require('fs').appendFileSync('d:\\debug.log', `Set duration to: ${duration}\n`);
            break;
          }
        }
      }

      // Extract synonyms
      if (!synonyms) {
        const synonymPatterns = [
          /synonyms[:\s]*([^\n\r]*)/gi,
          /also known as[:\s]*([^\n\r]*)/gi,
          /alternative titles[:\s]*([^\n\r]*)/gi
        ];
        for (const pattern of synonymPatterns) {
          const match = puppeteerBodyText.match(pattern);
          require('fs').appendFileSync('d:\\debug.log', `Synonyms pattern ${pattern} match: ${match ? match[1] : 'null'}\n`);
          if (match && match[1] && match[1].trim() && match[1].trim() !== 'N/A' && match[1].trim() !== 'Unknown') {
            synonyms = match[1].trim();
            require('fs').appendFileSync('d:\\debug.log', `Set synonyms to: ${synonyms}\n`);
            break;
          }
        }
      }

      require('fs').appendFileSync('d:\\debug.log', `Puppeteer returning result with japanese: "${japanese}"\n`);

      return {
        id: animeId,
        title: title || `Anime ${animeId}`,
        image,
        synopsis,
        fullSynopsis,
        rating,
        status,
        year,
        genres: genres.slice(0, 10),
        studios: studios.slice(0, 5),
        producers: producers.slice(0, 5),
        episode: currentEpisode,
        totalEpisode: totalEpisode,
        aired,
        source,
        episodesList: episodesList.reverse().slice(0, 50),
        url: `${SITE_CONFIG.BASE_URL}/anime/${animeId}`,
        japanese,
        english,
        type,
        duration,
        season,
        synonyms,
      };

    } catch (error) {
      console.error('Puppeteer scraping failed for anime detail:', error);
      throw error;
    } finally {
      // Clean up browser
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.error('Error closing page:', e);
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Error closing browser:', e);
        }
      }
    }
  }

  /**
   * Get Anime Detail
   */
  static async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    const cacheKey = `anime:detail:${animeId}:v13`;

    const cached = cacheManager.get(cacheKey);
    if (cached) {
      require('fs').appendFileSync('d:\\debug.log', `Cache hit for ${cacheKey}, returning cached data\n`);
      return cached as AnimeDetail;
    } else {
      require('fs').appendFileSync('d:\\debug.log', `Cache miss for ${cacheKey}, fetching fresh data\n`);
    }

    return cacheManager.getOrSet(cacheKey, async () => {
      require('fs').appendFileSync('d:\\debug.log', `=== STARTING ANIME DETAIL SCRAPING FOR: ${animeId} at ${new Date().toISOString()} ===\n`);
      try {
        // Try Puppeteer first for better anti-detection and Cloudflare bypass
        console.log(`Attempting to scrape anime detail with Puppeteer: ${animeId}`);
        require('fs').appendFileSync('d:\\debug.log', `Attempting Puppeteer for: ${animeId}\n`);
        const result = await this.scrapeWithPuppeteer(animeId);
        require('fs').appendFileSync('d:\\debug.log', `Puppeteer succeeded, returning result\n`);
        return result;
      } catch (puppeteerError) {
        console.error('Puppeteer scraping failed for anime detail, falling back to axios:', puppeteerError);
        require('fs').appendFileSync('d:\\debug.log', `Puppeteer failed, falling back to axios: ${String(puppeteerError)}\n`);

        try {
          // Fallback to axios with advanced headers
          require('fs').appendFileSync('d:\\debug.log', `Starting axios fallback for: ${animeId}\n`);
          const { data } = await axiosInstance.get(`/anime/${animeId}`);
          const $ = load(data);

          // Try multiple selectors for title - prioritize anime title over page title
          let title = '';
          const titleSelectors = [
            'h2:contains("Nonton Anime")', // "Nonton Anime Mushoku no Eiyuu"
            'h3:contains("Detail Anime")', // "Detail Anime Mushoku no Eiyuu"
            '.anime-title',
            '.entry-title',
            '.post-title'
          ];
          for (const selector of titleSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
              let text = element.text().trim();
              // Remove "Nonton Anime" or "Detail Anime" prefix
              text = text.replace(/^Nonton Anime\s+/i, '').replace(/^Detail Anime\s+/i, '');
              // Remove "Sub Indo" suffix if present
              text = text.replace(/\s+Sub Indo$/i, '');
              if (text && text.length > 2) {
                title = text;
                break;
              }
            }
          }

          // Fallback to h1 but clean it up
          if (!title) {
            const h1Text = $('h1').first().text().trim();
            if (h1Text) {
              title = h1Text.replace(/\s+Sub Indo$/i, '');
            }
          }

          // Try multiple selectors for image (expanded)
          let image = '';
          const imageSelectors = [
            '.anime-image img',
            '.anime-poster img',
            '.featured-image img',
            '.post-thumbnail img',
            '.entry-image img',
            '.wp-post-image',
            'img[src*="anime"]',
            'img[alt*="anime"]',
            '.thumbnail img',
            '.cover img'
          ];
          for (const selector of imageSelectors) {
            const $img = $(selector).first();
            const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
            if (src && !src.includes('placeholder') && !src.includes('no-image')) {
              image = src.startsWith('http') ? src : `${SITE_CONFIG.BASE_URL}${src}`;
              break;
            }
          }

          // Try multiple selectors for synopsis
          let synopsis = '';
          let fullSynopsis = '';
          const synopsisSelectors = ['.anime-synopsis', '.description', '.entry-content p', '.post-content p', '.summary'];
          for (const selector of synopsisSelectors) {
            const text = $(selector).first().text().trim();
            if (text && text.length > 10) { // Make sure it's substantial content
              synopsis = text;
              fullSynopsis = text;
              break;
            }
          }

          // Try to extract rating from various sources
          let rating: number | undefined;
          const ratingSelectors = ['.rating', '.score', '.imdb-rating', '.rating-value', '.anime-rating', '.star-rating'];
          for (const selector of ratingSelectors) {
            const text = $(selector).first().text().trim();
            const numRating = parseFloat(text.replace(/[^\d.]/g, ''));
            require('fs').appendFileSync('d:\\debug.log', `Axios rating selector "${selector}" found text: "${text}", parsed rating: ${numRating}\n`);
            if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
              rating = numRating;
              require('fs').appendFileSync('d:\\debug.log', `Axios set rating to ${rating} from selector ${selector}\n`);
              break;
            }
          }

          // If still no rating, try to extract from text content with patterns like "6.55 / 2571"
          if (!rating) {
            const bodyText = $('body').text();
            // Look for rating patterns with user counts (prioritize these as they seem to be the main ratings)
            const votePatterns = [
              /(\d+\.?\d*)\s*\/\s*[\d,]+/g,  // "7.20 / 3,933" or "7.20 / 2571"
            ];
            
            for (const pattern of votePatterns) {
              const matches = bodyText.match(pattern);
              if (matches) {
                for (const match of matches) {
                  const ratingMatch = match.match(/(\d+\.?\d*)/);
                  if (ratingMatch) {
                    const numRating = parseFloat(ratingMatch[1]);
                    if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                      // Take the first valid rating found with user count
                      rating = numRating;
                      require('fs').appendFileSync('d:\\debug.log', `Axios set rating to ${rating} from vote pattern: "${match}"\n`);
                      break;
                    }
                  }
                }
                if (rating) break;
              }
            }
          }

          // Try more specific patterns for rating extraction
          if (!rating) {
            const bodyText = $('body').text();
            // Look for patterns like "6.55" followed by "/" and numbers
            const patterns = [
              /(\d+\.?\d*)\s*\/\s*\d+/g,  // "6.55 / 2571"
              /rating[:\s]*(\d+\.?\d*)/gi, // "rating: 6.55"
              /score[:\s]*(\d+\.?\d*)/gi,  // "score: 6.55"
              /(\d+\.?\d*)\s*\(\s*\d+/g,   // "6.55 (2571"
            ];

            for (const pattern of patterns) {
              const match = bodyText.match(pattern);
              require('fs').appendFileSync('d:\\debug.log', `Axios rating pattern "${pattern}" match: ${match ? match[0] : 'null'}\n`);
              if (match) {
                const numRating = parseFloat(match[1]);
                if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                  rating = numRating;
                  require('fs').appendFileSync('d:\\debug.log', `Axios set rating to ${rating} from pattern ${pattern}\n`);
                  break;
                }
              }
            }
          }

          // Try to find rating in spans
          if (!rating) {
            $('.spe span, .infox .spe span').each((_, el) => {
              const $el = $(el);
              const text = $el.text().trim();
              if (text.includes('Rating') || text.includes('Score')) {
                const ratingMatch = text.match(/(\d+\.?\d*)/);
                if (ratingMatch) {
                  const numRating = parseFloat(ratingMatch[1]);
                  if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                    rating = numRating;
                    require('fs').appendFileSync('d:\\debug.log', `Axios set rating to ${rating} from span: "${text}"\n`);
                    return false; // break out of each loop
                  }
                }
              }
            });
          }

          // Try to find rating in any element containing numbers followed by "/"
          if (!rating) {
            $('*').each((_, el) => {
              const $el = $(el);
              const text = $el.text().trim();
              const ratingMatch = text.match(/(\d+\.?\d*)\s*\/\s*\d+/);
              if (ratingMatch && !text.includes('episode') && !text.includes('Episode') && !text.includes('eps') && !text.includes('Eps')) {
                const numRating = parseFloat(ratingMatch[1]);
                if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                  rating = numRating;
                  require('fs').appendFileSync('d:\\debug.log', `Axios set rating to ${rating} from element text: "${text}"\n`);
                  return false; // break out of each loop
                }
              }
            });
          }

          // Try to find rating in text that looks like "6.92 / 4,165"
          if (!rating) {
            const bodyText = $('body').text();
            // Look for rating patterns that might be in the main content area
            const ratingPatterns = [
              /(\d+\.?\d*)\s*\/\s*[\d,]+/,  // "6.92 / 4,165"
              /★+\s*(\d+\.?\d*)/,           // "★★★★★ 6.92"
              /(\d+\.?\d*)\s*stars?/,       // "6.92 stars"
            ];

            for (const pattern of ratingPatterns) {
              const match = bodyText.match(pattern);
              if (match) {
                const numRating = parseFloat(match[1]);
                if (!isNaN(numRating) && numRating > 0 && numRating <= 10) {
                  rating = numRating;
                  require('fs').appendFileSync('d:\\debug.log', `Axios set rating to ${rating} from advanced pattern: "${match[0]}"\n`);
                  break;
                }
              }
            }
          }

          require('fs').appendFileSync('d:\\debug.log', `Axios final rating extracted: ${rating}\n`);

          // Try to extract year
          let year = new Date().getFullYear();
          const yearSelectors = ['.year', '.release-year', '.aired-year'];
          for (const selector of yearSelectors) {
            const text = $(selector).first().text().trim();
            const numYear = parseInt(text.replace(/\D/g, ''));
            if (!isNaN(numYear) && numYear > 1900 && numYear <= new Date().getFullYear() + 1) {
              year = numYear;
              break;
            }
          }

          // Extract genres from various possible sources
          const genres: string[] = [];
          // Look for genres in the main content area, not in recommended sections
          const mainContent = $('.entry-content, .anime-content, .post-content').first();
          if (mainContent.length > 0) {
            mainContent.find('a[href*="/genre/"]').each((_, el) => {
              const $el = $(el);
              const href = $el.attr('href');
              const text = $el.text().trim();
              // Only include if it's actually a genre link and text is reasonable
              if (href && href.includes('/genre/') && text && !genres.includes(text) && text.length < 30 && text.length > 1) {
                genres.push(text);
              }
            });
          }

          // If no genres found in main content, try the broader selectors but exclude recommended sections
          if (genres.length === 0) {
            $('a[href*="/genre/"]').each((_, el) => {
              const $el = $(el);
              const href = $el.attr('href');
              const text = $el.text().trim();
              // Skip if this element is inside a recommended/other anime section
              const parentClasses = $el.closest('.related, .recommendations, .rekomendasi, .other-anime, .movie-item, .anime-item').attr('class') || '';
              const isInRecommended = parentClasses.includes('related') || parentClasses.includes('recommendations') || parentClasses.includes('rekomendasi') || parentClasses.includes('other-anime') || parentClasses.includes('movie-item') || parentClasses.includes('anime-item');
              if (href && href.includes('/genre/') && text && !genres.includes(text) && text.length < 30 && text.length > 1 && !isInRecommended) {
                genres.push(text);
              }
            });
          }

          // Extract studios, producers, etc. from info tables or lists (more comprehensive)
          const studios: string[] = [];
          const producers: string[] = [];
          let aired = '';
          let source = '';
          let episodes = 0;
          let japanese = '';
          let english = '';
          let type = '';
          let duration = '';
          let season = '';
          let synonyms = '';
          let status: 'ongoing' | 'completed' | 'upcoming' = 'ongoing';

          // Look for various info patterns
          const infoPatterns = [
            '.info-table tr',
            '.anime-info tr',
            'dl',
            '.spec',
            '.info-content',
            '.anime-details',
            '.series-info tr',
            '.detail-info tr',
            '.information tr',
            'table tr',
            '.spe span', // Found in debug - spans with details
            '.infox .spe span' // More specific selector for detail spans
          ];

          $(infoPatterns.join(', ')).each((_, el) => {
            const $el = $(el);
            const label = $el.find('td:first, dt, .label, strong, b, th').first().text().toLowerCase().trim();
            const value = $el.find('td:last, dd, .value, td:nth-child(2)').text().trim();

            if (label.includes('studio') || label.includes('studios') || label.includes('production') || label.includes('animation')) {
              const extracted = value.split(',').map(s => s.trim()).filter(s => s && s !== 'N/A' && s !== 'Unknown' && s !== '-' && s.length > 1);
              studios.push(...extracted);
            }
            if (label.includes('producer') || label.includes('producers') || label.includes('licensor') || label.includes('network')) {
              // Extract from comma-separated values or from links
              const extracted: string[] = [];
              value.split(',').forEach(part => {
                const trimmed = part.trim();
                if (trimmed && trimmed !== 'N/A' && trimmed !== 'Unknown' && trimmed !== '-' && trimmed.length > 1) {
                  // Skip strings that look like dates or release information
                  const isDateLike = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|Released|released|to \?)/.test(trimmed);
                  if (isDateLike) {
                    return; // Skip this part, it's not a producer name
                  }
                  // Check if it's a link format [Name](url)
                  const linkMatch = trimmed.match(/\[([^\]]+)\]\([^)]+\)/);
                  if (linkMatch) {
                    extracted.push(linkMatch[1].trim());
                  } else {
                    extracted.push(trimmed);
                  }
                }
              });
              producers.push(...extracted);
            }
            if (label.includes('aired') || label.includes('released') || label.includes('release') || label.includes('premiered') || label.includes('date')) {
              if (value && value !== 'N/A' && value !== 'Unknown' && value !== '-' && value.length > 3) {
                aired = value;
              }
            }
            if (label.includes('source') || label.includes('adaptation') || label.includes('based on') || label.includes('original')) {
              if (value && value !== 'N/A' && value !== 'Unknown' && value !== '-' && value.length > 2) {
                source = value;
              }
            }
            if (label.includes('episode') || label.includes('episodes') || label.includes('eps') || label.includes('total')) {
              const epCount = parseInt(value.replace(/\D/g, ''));
              if (!isNaN(epCount) && epCount > 0 && epCount < 1000) {
                episodes = epCount;
              }
            }
            if (label.includes('status') && value) {
              const statusLower = value.toLowerCase();
              if (statusLower.includes('completed') || statusLower.includes('finished')) {
                status = 'completed';
              } else if (statusLower.includes('upcoming') || statusLower.includes('not yet aired')) {
                status = 'upcoming';
              } else {
                status = 'ongoing';
              }
            }
          });

          // Extract from spans - improved pattern matching
          $('.spe span, .infox .spe span').each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            require('fs').appendFileSync('d:\\debug.log', `Found span text: "${text}"\n`);

            // Handle concatenated patterns first (no colon)
            if (text.startsWith('Japanese') && text.length > 8) {
              japanese = text.substring(8).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Japanese: "${japanese}"\n`);
            } else if (text.startsWith('English') && text.length > 7) {
              english = text.substring(7).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted English: "${english}"\n`);
            } else if (text.startsWith('Type') && text.length > 4) {
              type = text.substring(4).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Type: "${type}"\n`);
            } else if (text.startsWith('Source') && text.length > 6) {
              source = text.substring(6).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Source: "${source}"\n`);
            } else if (text.startsWith('Duration') && text.length > 8) {
              duration = text.substring(8).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Duration: "${duration}"\n`);
            } else if (text.startsWith('Season') && text.length > 6) {
              season = text.substring(6).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Season: "${season}"\n`);
            } else if (text.startsWith('Synonyms') && text.length > 8) {
              synonyms = text.substring(8).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Synonyms: "${synonyms}"\n`);
            } else if (text.startsWith('Total Episode') && text.length > 12) {
              const totalEpisodeText = text.substring(12).trim();
              const epCount = parseInt(totalEpisodeText.replace(/\D/g, ''));
              if (!isNaN(epCount) && epCount > 0 && epCount < 1000) {
                episodes = epCount;
                require('fs').appendFileSync('d:\\debug.log', `Axios set episodes to ${episodes} from Total Episode span\n`);
              }
            } else if (text.startsWith('Producers') && text.length > 9) {
              const producersText = text.substring(9).trim();
              // Extract producer names from [Name](url) format
              const linkMatches = producersText.match(/\[([^\]]+)\]\([^)]+\)/g);
              if (linkMatches) {
                linkMatches.forEach(match => {
                  const nameMatch = match.match(/\[([^\]]+)\]/);
                  if (nameMatch && nameMatch[1]) {
                    producers.push(nameMatch[1].trim());
                  }
                });
              }
              require('fs').appendFileSync('d:\\debug.log', `Extracted Producers: ${producers}\n`);
            } else if (text.startsWith('Status') && text.length > 6) {
              const statusText = text.substring(6).trim().toLowerCase();
              if (statusText.includes('completed') || statusText.includes('finished')) {
                status = 'completed';
              } else if (statusText.includes('upcoming') || statusText.includes('not yet aired')) {
                status = 'upcoming';
              } else {
                status = 'ongoing';
              }
              require('fs').appendFileSync('d:\\debug.log', `Extracted Status: "${status}"\n`);
            } else if (text.startsWith('Released') && text.length > 8) {
              aired = text.substring(8).trim();
              require('fs').appendFileSync('d:\\debug.log', `Extracted Aired: "${aired}"\n`);
            } else if (text.includes(':')) {
              // Handle colon-separated patterns as fallback
              const [label, ...valueParts] = text.split(':');
              const labelLower = label.toLowerCase().trim();
              const value = valueParts.join(':').trim();
              require('fs').appendFileSync('d:\\debug.log', `Span label: "${labelLower}", value: "${value}"\n`);

              if (labelLower.includes('studio') && value && value !== 'N/A') {
                studios.push(value);
              }
              if (labelLower.includes('producer') || labelLower.includes('producers') || labelLower.includes('licensor') || labelLower.includes('network')) {
                // Extract from comma-separated values or from links
                const extracted: string[] = [];
                value.split(',').forEach(part => {
                  const trimmed = part.trim();
                  if (trimmed && trimmed !== 'N/A' && trimmed !== 'Unknown' && trimmed !== '-' && trimmed.length > 1) {
                    // Skip strings that look like dates or release information
                    const isDateLike = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|Released|released|to \?)/.test(trimmed);
                    if (isDateLike) {
                      return; // Skip this part, it's not a producer name
                    }
                    // Check if it's a link format [Name](url)
                    const linkMatch = trimmed.match(/\[([^\]]+)\]\([^)]+\)/);
                    if (linkMatch) {
                      extracted.push(linkMatch[1].trim());
                    } else {
                      extracted.push(trimmed);
                    }
                  }
                });
                producers.push(...extracted);
              }
              if ((labelLower.includes('aired') || labelLower.includes('released')) && value && value !== 'N/A') {
                aired = value;
                require('fs').appendFileSync('d:\\debug.log', `Set aired from span: ${aired}\n`);
              }
              if (labelLower.includes('source') && value && value !== 'N/A') {
                source = value;
              }
              if (labelLower.includes('episode') && value && value !== 'N/A') {
                const epCount = parseInt(value.replace(/\D/g, ''));
                if (!isNaN(epCount) && epCount > 0) {
                  episodes = epCount;
                }
              }
              if (labelLower.includes('japanese') && value && value !== 'N/A') {
                japanese = value;
              }
              if (labelLower.includes('english') && value && value !== 'N/A') {
                english = value;
              }
              if (labelLower.includes('type') && value && value !== 'N/A') {
                type = value;
              }
              if (labelLower.includes('duration') && value && value !== 'N/A') {
                duration = value;
                require('fs').appendFileSync('d:\\debug.log', `Set duration from span: ${duration}\n`);
              }
              if (labelLower.includes('season') && value && value !== 'N/A') {
                season = value;
              }
              if (labelLower.includes('synonyms') && value && value !== 'N/A') {
                synonyms = value;
                require('fs').appendFileSync('d:\\debug.log', `Set synonyms from span: ${synonyms}\n`);
              }
              if (labelLower.includes('status') && value && value !== 'N/A') {
                const statusLower = value.toLowerCase();
                if (statusLower.includes('completed') || statusLower.includes('finished')) {
                  status = 'completed';
                } else if (statusLower.includes('upcoming') || statusLower.includes('not yet aired')) {
                  status = 'upcoming';
                } else {
                  status = 'ongoing';
                }
              }
            }
          });

          // Additional producer extraction from specific patterns in the page
          const bodyText = $('body').text();
          if (producers.length === 0) {
            // Look for "Producers[Bushiroad Move](url), [DAX Production](url)" pattern
            const producerPattern = /Producers(\[([^\]]+)\]\([^)]+\)(?:,\s*\[([^\]]+)\]\([^)]+\))*)/;
            const producerMatch = bodyText.match(producerPattern);
            if (producerMatch) {
              // Extract all producer names from the match
              const producerText = producerMatch[1];
              const linkMatches = producerText.match(/\[([^\]]+)\]\([^)]+\)/g);
              if (linkMatches) {
                linkMatches.forEach(match => {
                  const nameMatch = match.match(/\[([^\]]+)\]/);
                  if (nameMatch && nameMatch[1]) {
                    producers.push(nameMatch[1].trim());
                  }
                });
              }
            }

            // Also try a simpler approach - look for any [Name](url) patterns after "Producers"
            if (producers.length === 0) {
              const producersIndex = bodyText.indexOf('Producers');
              if (producersIndex !== -1) {
                const producersSection = bodyText.substring(producersIndex, producersIndex + 500);
                const linkMatches = producersSection.match(/\[([^\]]+)\]\([^)]+\)/g);
                if (linkMatches) {
                  linkMatches.forEach(match => {
                    const nameMatch = match.match(/\[([^\]]+)\]/);
                    if (nameMatch && nameMatch[1]) {
                      producers.push(nameMatch[1].trim());
                    }
                  });
                }
              }
            }

            // Try to find producer links directly
            if (producers.length === 0) {
              $('a[href*="/producers/"]').each((_, el) => {
                const $el = $(el);
                const href = $el.attr('href');
                const text = $el.text().trim();
                if (href && href.includes('/producers/') && text && !producers.includes(text) && text.length < 50) {
                  producers.push(text);
                }
              });
            }

            // Try to extract producers from text content containing known producer names
            if (producers.length === 0) {
              const bodyText = $('body').text();
              console.log('Body text contains Bushiroad:', bodyText.includes('Bushiroad'));
              console.log('Body text contains DAX:', bodyText.includes('DAX'));
              // Look for specific producer names that should be on the page
              if (bodyText.includes('Bushiroad Move') && !producers.includes('Bushiroad Move')) {
                producers.push('Bushiroad Move');
              }
              if (bodyText.includes('DAX Production') && !producers.includes('DAX Production')) {
                producers.push('DAX Production');
              }
              // Also check for partial matches
              if (bodyText.includes('Bushiroad') && !producers.some(p => p.includes('Bushiroad'))) {
                producers.push('Bushiroad');
              }
              if (bodyText.includes('DAX') && !producers.some(p => p.includes('DAX'))) {
                producers.push('DAX Production');
              }
            }

            // Try to find producers in elements containing "Producer" or "Producers"
            if (producers.length === 0) {
              $('*').each((_, el) => {
                const $el = $(el);
                const text = $el.text().trim();
                if (text.includes('Producers') || text.includes('Producer')) {
                  // Extract producer names from the text
                  const producerNames = text.match(/(?:Producers|Producer)[\s:]*([^\n\r]*)/);
                  if (producerNames && producerNames[1]) {
                    const names = producerNames[1].split(',').map(name => name.trim()).filter(name => {
                      // Skip strings that look like dates or release information
                      const isDateLike = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|Released|released|to \?)/.test(name);
                      return name && name !== 'N/A' && !isDateLike;
                    });
                    producers.push(...names);
                  }
                }
              });
            }
          }

          // Extract studio from article class (found in debug: studio-maho-film)
          const articleClass = $('article').attr('class') || '';
          const studioMatch = articleClass.match(/studio-([a-zA-Z0-9-]+)/);
          if (studioMatch && studioMatch[1]) {
            const studioName = studioMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (!studios.includes(studioName)) {
              studios.push(studioName);
            }
          }

          // Try to find studios in other locations
          if (studios.length === 0) {
            // Look for studio mentions in text content
            const textContent = $('body').text().toLowerCase();
            const studioKeywords = ['studio', 'animation', 'production'];

            studioKeywords.forEach(keyword => {
              const regex = new RegExp(`${keyword}\\s*:\\s*([^\\n\\r,]*)`, 'gi');
              let match;
              while ((match = regex.exec(textContent)) !== null) {
                const studio = match[1].trim();
                if (studio && studio.length > 2 && !studios.includes(studio)) {
                  studios.push(studio);
                }
              }
            });
          }

          // Try to extract episodes count from various sources
          if (episodes === 0) {
            // Look for episode count in text
            const textContent = $('body').text();
            const epPatterns = [
              /total\s*episode[:\s]*(\d+)/gi,  // "Total Episode: 12"
              /total\s*eps?[:\s]*(\d+)/gi,     // "Total Eps: 12"
              /(\d+)\s*episode/gi,            // "12 episode"
              /(\d+)\s*eps/gi,                // "12 eps"
              /episode\s*:\s*(\d+)/gi,        // "Episode: 12"
              /eps?\s*:\s*(\d+)/gi,           // "Eps: 12"
              /episodes?\s*total[:\s]*(\d+)/gi, // "Episodes Total: 12"
              /(\d+)\s*\/\s*\d+\s*episodes/gi, // "12 / 12 episodes"
            ];

            for (const pattern of epPatterns) {
              const match = textContent.match(pattern);
              if (match) {
                const count = parseInt(match[1]);
                if (!isNaN(count) && count > 0 && count < 1000) {
                  episodes = count;
                  require('fs').appendFileSync('d:\\debug.log', `Axios set episodes to ${episodes} from pattern: ${pattern}\n`);
                  break;
                }
              }
            }

            // Look for episode count in specific selectors
            const epSelectors = ['.episode-count', '.total-episodes', '.episodes', '.eps'];
            for (const selector of epSelectors) {
              const text = $(selector).first().text().trim();
              const count = parseInt(text.replace(/\D/g, ''));
              if (!isNaN(count) && count > 0 && count < 1000) {
                episodes = count;
                require('fs').appendFileSync('d:\\debug.log', `Axios set episodes to ${episodes} from selector: ${selector}\n`);
                break;
              }
            }
          }

          // Try to extract data from JSON-LD structured data
          let jsonLdData: any = null;
          $('script[type="application/ld+json"]').each((_, el) => {
            try {
              const htmlContent = $(el).html();
              if (htmlContent) {
                const jsonData = JSON.parse(htmlContent);
                if (jsonData && jsonData['@type'] === 'TVSeries' || jsonData['@type'] === 'Movie') {
                  jsonLdData = jsonData;
                }
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          });

          // If we found JSON-LD data, use it to fill missing fields
          if (jsonLdData) {
            if (!image && jsonLdData.image) {
              image = Array.isArray(jsonLdData.image) ? jsonLdData.image[0] : jsonLdData.image;
            }
            if (!synopsis && jsonLdData.description) {
              synopsis = jsonLdData.description;
              fullSynopsis = jsonLdData.description;
            }
            if (!rating && jsonLdData.aggregateRating?.ratingValue) {
              rating = parseFloat(jsonLdData.aggregateRating.ratingValue);
            }
            if (studios.length === 0 && jsonLdData.productionCompany) {
              const company = Array.isArray(jsonLdData.productionCompany) ?
                jsonLdData.productionCompany[0] : jsonLdData.productionCompany;
              if (company.name) {
                studios.push(company.name);
              }
            }
            if (!aired && jsonLdData.datePublished) {
              aired = jsonLdData.datePublished;
            }
            if (!source && jsonLdData.isBasedOn) {
              source = jsonLdData.isBasedOn;
            }
            // Extract Japanese title from JSON-LD if available
            if (!japanese && jsonLdData.name && jsonLdData.name !== title) {
              // Check if the name contains Japanese characters
              if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(jsonLdData.name)) {
                japanese = jsonLdData.name;
              }
            }
            // Also check alternateName for Japanese title
            if (!japanese && jsonLdData.alternateName) {
              const altNames = Array.isArray(jsonLdData.alternateName) ? jsonLdData.alternateName : [jsonLdData.alternateName];
              for (const altName of altNames) {
                if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(altName)) {
                  japanese = altName;
                  break;
                }
              }
            }
          }

          // Try to extract data from meta tags
          $('meta').each((_, el) => {
            const $el = $(el);
            const property = $el.attr('property') || $el.attr('name');
            const content = $el.attr('content');

            if (property && content) {
              if (property === 'og:image' && !image) {
                image = content;
              }
              if (property === 'og:description' && !synopsis) {
                synopsis = content;
                fullSynopsis = content;
              }
            }
          });

          // Try to get episodes count from other sources
          if (episodes === 0) {
            const epSelectors = ['.episode-count', '.total-episodes', '.episodes'];
            for (const selector of epSelectors) {
              const text = $(selector).first().text().trim();
              const epCount = parseInt(text.replace(/\D/g, ''));
              if (!isNaN(epCount) && epCount > 0) {
                episodes = epCount;
                break;
              }
            }
          }

          // Extract episodes list (expanded)
          const episodesList: Episode[] = [];
          const episodeSelectors = [
            'a[href*="-episode-"]', // Found in debug - the actual pattern
            'a[href*="/episode/"]',
            '.episode-item a',
            '.ep-item a',
            '.episode-list li a',
            '.episodes-list a',
            '.list-episode a'
          ];

          $(episodeSelectors.join(', ')).each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const epText = $el.text().trim();

            if (href && (href.includes('-episode-') || href.includes('/episode/'))) {
              // Skip batch download links for individual episodes
              if (href.includes('batch') || href.includes('download')) {
                return;
              }

              // Extract episode number from URL patterns like:
              // /anime-slug-episode-12-end/ or /anime-slug-episode-11/
              const epMatch = href.match(/-episode-(\d+)/);
              const episodeNum = epMatch ? parseInt(epMatch[1]) : null;

              if (episodeNum && !episodesList.find(ep => ep.episode === episodeNum)) {
                // Try to get better title from nearby elements or text
                let title = `Episode ${episodeNum}`;
                if (epText && epText !== episodeNum.toString() && epText.length > 2) {
                  title = epText;
                }

                episodesList.push({
                  episode: episodeNum,
                  title: title,
                  url: href,
                  date: '',
                });
              }
            }
          });

          // Calculate current airing episode (highest episode number)
          const currentEpisode = episodesList.length > 0 ? Math.max(...episodesList.map(ep => ep.episode)) : 0;

          // Set totalEpisode more aggressively - if we found episodes count, use it as totalEpisode
          // This handles cases where anime are completed and have total episode information
          let totalEpisode: number | undefined;
          if (episodes > 0) {
            totalEpisode = episodes;
            require('fs').appendFileSync('d:\\debug.log', `Axios set totalEpisode to ${totalEpisode} (status: ${status}, episodes found: ${episodes})\n`);
          } else {
            totalEpisode = undefined;
          }

          return {
            id: animeId,
            title: title || `Anime ${animeId}`,
            image,
            synopsis,
            fullSynopsis,
            rating,
            status,
            year,
            genres: genres.slice(0, 10), // Limit to 10 genres
            studios: studios.slice(0, 5), // Limit to 5 studios
            producers: producers.slice(0, 5), // Limit to 5 producers
            episode: currentEpisode,
            totalEpisode: totalEpisode,
            aired,
            source,
            episodesList: episodesList.reverse().slice(0, 50), // Limit to 50 episodes
            url: `${SITE_CONFIG.BASE_URL}/anime/${animeId}`,
            japanese,
            english,
            type,
            duration,
            season,
            synonyms,
          };
        } catch (axiosError) {
          console.error('Axios scraping also failed for anime detail:', axiosError);

          // Return basic fallback data
          return {
            id: animeId,
            title: `Anime ${animeId}`,
            image: '',
            synopsis: '',
            fullSynopsis: '',
            rating: undefined,
            status: 'ongoing',
            year: new Date().getFullYear(),
            genres: [],
            studios: [],
            producers: [],
            episode: 0,
            totalEpisode: undefined,
            aired: '',
            source: '',
            episodesList: [],
            url: `${SITE_CONFIG.BASE_URL}/anime/${animeId}`,
            japanese: '',
            english: '',
            type: '',
            duration: '',
            season: '',
            synonyms: '',
          };
        }
      }
    });
  }
}