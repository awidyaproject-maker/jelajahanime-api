import { load } from 'cheerio';
import { AnimeDetail, Episode } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';

export class AnimeDetailScraper {
  /**
   * Puppeteer-based scraping method for anime details
   */
  private static async scrapeWithPuppeteer(animeId: string): Promise<AnimeDetail> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`Launching Puppeteer browser for anime detail scraping: ${animeId}`);

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
      // Try multiple selectors for title
      let title = '';
      const titleSelectors = ['.anime-title', 'h1', '.entry-title', '.post-title', 'title'];
      for (const selector of titleSelectors) {
        const text = $(selector).first().text().trim();
        if (text) {
          title = text;
          break;
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

      // Try to extract rating
      let rating: number | undefined;
      const ratingSelectors = ['.rating', '.score', '.imdb-rating', '.rating-value'];
      for (const selector of ratingSelectors) {
        const text = $(selector).first().text().trim();
        const numRating = parseFloat(text.replace(/[^\d.]/g, ''));
        if (!isNaN(numRating) && numRating > 0) {
          rating = numRating;
          break;
        }
      }

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

      // Extract genres
      const genres: string[] = [];
      const genreSelectors = ['.genre-link', '.genres a', '.genre', '.category a', 'a[href*="/genre/"]'];
      $(genreSelectors.join(', ')).each((_, el) => {
        const text = $(el).text().trim();
        if (text && !genres.includes(text) && text.length < 50) {
          genres.push(text);
        }
      });

      // Extract studios, producers, etc.
      const studios: string[] = [];
      const producers: string[] = [];
      let aired = '';
      let source = '';
      let episodes = 0;

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
          const extracted = value.split(',').map(s => s.trim()).filter(s => s && s !== 'N/A' && s !== 'Unknown' && s !== '-' && s.length > 1);
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
      });

      // Extract from spans
      $('.spe span, .infox .spe span').each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        if (text.includes(':')) {
          const [label, ...valueParts] = text.split(':');
          const labelLower = label.toLowerCase().trim();
          const value = valueParts.join(':').trim();

          if (labelLower.includes('studio') && value && value !== 'N/A') {
            studios.push(value);
          }
          if (labelLower.includes('producer') && value && value !== 'N/A') {
            producers.push(value);
          }
          if (labelLower.includes('aired') && value && value !== 'N/A') {
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

      // Try to extract episodes count from various sources
      if (episodes === 0) {
        const textContent = $('body').text();
        const epPatterns = [
          /total\s*:\s*(\d+)\s*episode/gi,
          /(\d+)\s*episode/gi,
          /(\d+)\s*eps/gi,
          /episode\s*:\s*(\d+)/gi
        ];

        for (const pattern of epPatterns) {
          const match = textContent.match(pattern);
          if (match) {
            const count = parseInt(match[1]);
            if (!isNaN(count) && count > 0 && count < 1000) {
              episodes = count;
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
            break;
          }
        }
      }

      // Try to extract data from JSON-LD
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

      // Use JSON-LD data if available
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

          if (episodeNum && !episodesList.find(ep => ep.episode === episodeNum)) {
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

      // Sort episodes
      episodesList.sort((a, b) => a.episode - b.episode);

      return {
        id: animeId,
        title: title || `Anime ${animeId}`,
        image,
        synopsis,
        fullSynopsis,
        rating,
        status: 'ongoing',
        year,
        genres: genres.slice(0, 10),
        studios: studios.slice(0, 5),
        producers: producers.slice(0, 5),
        episodes,
        aired,
        source,
        episodesList: episodesList.reverse().slice(0, 50),
        url: `${SITE_CONFIG.BASE_URL}/anime/${animeId}`,
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
    const cacheKey = `anime:detail:${animeId}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try Puppeteer first for better anti-detection and Cloudflare bypass
        console.log(`Attempting to scrape anime detail with Puppeteer: ${animeId}`);
        return await this.scrapeWithPuppeteer(animeId);
      } catch (puppeteerError) {
        console.error('Puppeteer scraping failed for anime detail, falling back to axios:', puppeteerError);

        try {
          // Fallback to axios with advanced headers
          const { data } = await axiosInstance.get(`/anime/${animeId}`);
          const $ = load(data);

          // Try multiple selectors for title
          let title = '';
          const titleSelectors = ['.anime-title', 'h1', '.entry-title', '.post-title', 'title'];
          for (const selector of titleSelectors) {
            const text = $(selector).first().text().trim();
            if (text) {
              title = text;
              break;
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
          const ratingSelectors = ['.rating', '.score', '.imdb-rating', '.rating-value'];
          for (const selector of ratingSelectors) {
            const text = $(selector).first().text().trim();
            const numRating = parseFloat(text.replace(/[^\d.]/g, ''));
            if (!isNaN(numRating) && numRating > 0) {
              rating = numRating;
              break;
            }
          }

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
          const genreSelectors = ['.genre-link', '.genres a', '.genre', '.category a', 'a[href*="/genre/"]'];
          $(genreSelectors.join(', ')).each((_, el) => {
            const text = $(el).text().trim();
            if (text && !genres.includes(text) && text.length < 50) {
              genres.push(text);
            }
          });

          // Extract studios, producers, etc. from info tables or lists (more comprehensive)
          const studios: string[] = [];
          const producers: string[] = [];
          let aired = '';
          let source = '';
          let episodes = 0;

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
              const extracted = value.split(',').map(s => s.trim()).filter(s => s && s !== 'N/A' && s !== 'Unknown' && s !== '-' && s.length > 1);
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
          });

          // Extract from spans with bold labels (found in debug)
          $('.spe span, .infox .spe span').each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim();

            // Look for patterns like "Japanese: Title" or "Synonyms: Title"
            if (text.includes(':')) {
              const [label, ...valueParts] = text.split(':');
              const labelLower = label.toLowerCase().trim();
              const value = valueParts.join(':').trim();

              if (labelLower.includes('studio') && value && value !== 'N/A') {
                studios.push(value);
              }
              if (labelLower.includes('producer') && value && value !== 'N/A') {
                producers.push(value);
              }
              if (labelLower.includes('aired') && value && value !== 'N/A') {
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
            }
          });

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
              /total\s*:\s*(\d+)\s*episode/gi,
              /(\d+)\s*episode/gi,
              /(\d+)\s*eps/gi,
              /episode\s*:\s*(\d+)/gi
            ];

            for (const pattern of epPatterns) {
              const match = textContent.match(pattern);
              if (match) {
                const count = parseInt(match[1]);
                if (!isNaN(count) && count > 0 && count < 1000) {
                  episodes = count;
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

          // Sort episodes by number
          episodesList.sort((a, b) => a.episode - b.episode);

          return {
            id: animeId,
            title: title || `Anime ${animeId}`,
            image,
            synopsis,
            fullSynopsis,
            rating,
            status: 'ongoing',
            year,
            genres: genres.slice(0, 10), // Limit to 10 genres
            studios: studios.slice(0, 5), // Limit to 5 studios
            producers: producers.slice(0, 5), // Limit to 5 producers
            episodes,
            aired,
            source,
            episodesList: episodesList.reverse().slice(0, 50), // Limit to 50 episodes
            url: `${SITE_CONFIG.BASE_URL}/anime/${animeId}`,
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
            episodes: 0,
            aired: '',
            source: '',
            episodesList: [],
            url: `${SITE_CONFIG.BASE_URL}/anime/${animeId}`,
          };
        }
      }
    });
  }
}