import { load } from 'cheerio';

// Helper function to scrape anime items from .thumb elements or article tags
export const scrapeAnimeItems = ($: any, container?: string): any[] => {
  const items: any[] = [];

  // Try different selectors
  let $items = $('div.thumb');

  // If no thumb elements found, try article tags (for search results, etc)
  if ($items.length === 0) {
    $items = $('article.animpost, div.animepost');
  }

  console.log(`Found ${$items.length} thumb/article elements`);

  // If still no items, try to find anime links in text content (for daftar-anime-2 pages)
  if ($items.length === 0) {
    const $links = $('a[href*="/anime/"]');
    console.log(`Found ${$links.length} anime links`);

    $links.each((_: any, el: any) => {
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
    $items.each((_: any, el: any) => {
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

  console.log(`Extracted ${items.length} anime items`);
  return items;
};

// Helper function to scrape movie items from .animpost or similar
export const scrapeMovieItems = ($: any): any[] => {
  const items: any[] = [];

  // Look for movie links - try multiple approaches
  $('a').each((_: any, el: any) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().trim();

    // Check if this looks like a movie link
    if (href && href.includes('/anime/') && (text.includes('MOVIE') || text.includes('Completed'))) {
      // Try to extract title - look for patterns like [Title MOVIE ... Completed]
      let title = '';
      if (text.startsWith('[') && text.endsWith(']')) {
        const content = text.slice(1, -1);
        const movieIndex = content.indexOf(' MOVIE ');
        if (movieIndex !== -1) {
          title = content.substring(0, movieIndex).trim();
        } else {
          // Fallback: remove "Completed" and clean up
          title = content.replace(' Completed', '').trim();
        }
      } else {
        // Fallback for different formats
        title = text.replace(' MOVIE', '').replace(' Completed', '').trim();
      }

      // Clean up title by removing "Movie" prefix and rating patterns
      if (title.startsWith('Movie ')) {
        title = title.substring(6); // Remove "Movie " prefix
      }
      // Remove rating pattern like "7.45Title" -> "Title"
      title = title.replace(/^[\d.]+\s*/, '');
      // Remove "Completed" suffix
      title = title.replace(/\s*Completed\s*$/, '');

      if (title) {
        // Get image if available
        let image = '';
        const $img = $el.find('img').first();
        if ($img.length > 0) {
          image = $img.attr('src') || $img.attr('data-src') || '';
        }

        items.push({
          id: href.split('/').filter(Boolean).pop() || '',
          title: title,
          image: image,
          synopsis: '',
          status: 'completed',
          url: href,
        });
      }
    }
  });

  return items;
};