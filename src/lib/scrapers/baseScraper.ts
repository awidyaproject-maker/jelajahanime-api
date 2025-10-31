import { Anime } from '@/types/anime';

// Helper function to scrape anime items from .thumb elements or article tags
export const scrapeAnimeItems = ($: any, _container?: string): Anime[] => { // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const items: Anime[] = [];

  // Try different selectors - be more specific to avoid nested matches
  let $items = $('div.thumb');

  // If no thumb elements found, try article tags (for search results, etc)
  if ($items.length === 0) {
    // Use more specific selector to avoid matching nested elements
    $items = $('article.animpost, div.animepost').not('div.animepost div.animepost, div.animepost article.animpost');
  }

  // If still no items, try to find anime links in text content (for daftar-anime-2 pages)
  if ($items.length === 0) {
    const $links = $('a[href*="/anime/"]');

    $links.each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
    $items.each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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

  return uniqueItems;
};// Helper function to scrape movie items from .animpost or similar
export const scrapeMovieItems = ($: any): Anime[] => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const items: Anime[] = [];

  // Look for movie links - try multiple approaches
  $('a').each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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