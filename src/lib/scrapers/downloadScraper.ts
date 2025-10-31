import { load } from 'cheerio';

export interface Server {
  name: string;
  url: string;
}

export interface Quality {
  quality: string;
  servers: Server[];
}

export interface DownloadType {
  type: string;
  qualities: Quality[];
}

export interface AnimeDetail {
  japanese?: string;
  english?: string;
  status?: string;
  type?: string;
  source?: string;
  score?: string;
  duration?: string;
  totalEpisode?: number;
  season?: string;
  studio?: string;
  genre?: string[];
  producers?: string[];
  released?: string;
}

export interface BatchDownloadData {
  batchId: string;
  title: string;
  episodeRange?: string;
  animeDetail?: AnimeDetail;
  downloads: DownloadType[];
}

/**
 * Scrapes anime detail information from the .infox section
 */
function scrapeAnimeDetail($: any): AnimeDetail {
  const animeDetail: AnimeDetail = {};

  // Extract data from .infox .spe spans
  $('.infox .spe span').each((_: any, el: any) => {
    const $span = $(el);
    const $bold = $span.find('b').first();

    if ($bold.length > 0) {
      const key = $bold.text().trim().toLowerCase().replace(':', '');
      let value = '';

      // Remove the bold tag and get remaining text
      $bold.remove();
      value = $span.text().trim();

      // Handle special cases
      switch (key) {
        case 'japanese':
          animeDetail.japanese = value;
          break;
        case 'english':
          animeDetail.english = value;
          break;
        case 'status':
          animeDetail.status = value;
          break;
        case 'type':
          animeDetail.type = value;
          break;
        case 'source':
          animeDetail.source = value;
          break;
        case 'score':
          animeDetail.score = value;
          break;
        case 'duration':
          animeDetail.duration = value;
          break;
        case 'total episode':
          // Convert to integer if possible
          const epNum = parseInt(value);
          if (!isNaN(epNum)) {
            animeDetail.totalEpisode = epNum;
          }
          break;
        case 'season':
          // Extract text from links if present
          const seasonLinks = $span.find('a');
          if (seasonLinks.length > 0) {
            animeDetail.season = seasonLinks.map((_: any, link: any) => $(link).text().trim()).get().join(', ');
          } else {
            animeDetail.season = value;
          }
          break;
        case 'studio':
          // Extract text from links if present
          const studioLinks = $span.find('a');
          if (studioLinks.length > 0) {
            animeDetail.studio = studioLinks.map((_: any, link: any) => $(link).text().trim()).get().join(', ');
          } else {
            animeDetail.studio = value;
          }
          break;
        case 'genre':
          // Extract array from links
          const genreLinks = $span.find('a');
          if (genreLinks.length > 0) {
            animeDetail.genre = genreLinks.map((_: any, link: any) => $(link).text().trim()).get();
          } else {
            // Fallback: split by comma if no links
            animeDetail.genre = value.split(',').map(g => g.trim()).filter(g => g);
          }
          break;
        case 'producers':
          // Extract array from links
          const producerLinks = $span.find('a');
          if (producerLinks.length > 0) {
            animeDetail.producers = producerLinks.map((_: any, link: any) => $(link).text().trim()).get();
          } else {
            // Fallback: split by comma if no links
            animeDetail.producers = value.split(',').map(p => p.trim()).filter(p => p);
          }
          break;
        case 'released':
          animeDetail.released = value;
          break;
      }
    }
  });

  return animeDetail;
}

/**
 * Extracts episode range from batch title
 */
function extractEpisodeRange(title: string): string | undefined {
  // Look for patterns like "Episode 1-25", "Episode 1–13", etc.
  const rangeMatch = title.match(/episode\s*(\d+[-–]\d+)/i);
  if (rangeMatch) {
    return rangeMatch[1];
  }

  // Look for single episode patterns
  const singleMatch = title.match(/episode\s*(\d+)/i);
  if (singleMatch) {
    return singleMatch[1];
  }

  return undefined;
}

/**
 * Scrapes batch download data from Samehadaku HTML
 */
export function scrapeBatchDownload(html: string, batchId: string): BatchDownloadData {
  const $ = load(html);

  // Extract title
  let title = '';
  const titleSelectors = ['h1', '.entry-title', '.post-title', '.batch-title'];
  for (const selector of titleSelectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      title = text;
      break;
    }
  }

  // Extract episode range from title
  const episodeRange = extractEpisodeRange(title);

  // Extract anime detail information
  const animeDetail = scrapeAnimeDetail($);

  // Extract download data organized by type and quality
  const downloads: DownloadType[] = [];

  // Find all download sections (MKV, MP4, x265, etc.)
  $('.download-eps, #download, #downloadb, .download-section').each((_, sectionEl) => {
    const $section = $(sectionEl);

    // Find video type (MKV, MP4, x265, etc.)
    let videoType = 'MKV'; // default
    const typeSelectors = ['p b', 'p strong', '.format-title', '.video-type'];
    for (const selector of typeSelectors) {
      const $typeEl = $section.find(selector).first();
      if ($typeEl.length > 0) {
        const typeText = $typeEl.text().trim().toUpperCase();
        if (['MKV', 'MP4', 'X265', 'X264', 'AVC', 'HEVC'].includes(typeText)) {
          videoType = typeText;
          break;
        }
      }
    }

    // Find all quality sections within this type
    const qualities: Quality[] = [];

    // Look for quality headers and their associated server links
    $section.find('li, .quality-item').each((_, qualityEl) => {
      const $qualityEl = $(qualityEl);

      // Extract quality (360p, 480p, 720p, 1080p)
      let quality = '';
      const qualitySelectors = ['strong', '.quality', '.res'];
      for (const selector of qualitySelectors) {
        const $qualEl = $qualityEl.find(selector).first();
        if ($qualEl.length > 0) {
          const qualText = $qualEl.text().trim().toLowerCase();
          if (qualText.includes('360p')) quality = '360p';
          else if (qualText.includes('480p')) quality = '480p';
          else if (qualText.includes('720p')) quality = '720p';
          else if (qualText.includes('1080p')) quality = '1080p';
          if (quality) break;
        }
      }

      // If no quality found in strong tag, check the li text itself
      if (!quality) {
        const liText = $qualityEl.text().toLowerCase();
        if (liText.includes('360p')) quality = '360p';
        else if (liText.includes('480p')) quality = '480p';
        else if (liText.includes('720p')) quality = '720p';
        else if (liText.includes('1080p')) quality = '1080p';
      }

      if (quality) {
        // Extract server links for this quality
        const servers: Server[] = [];

        $qualityEl.find('a').each((_, linkEl) => {
          const $link = $(linkEl);
          const href = $link.attr('href');
          const linkText = $link.text().trim();

          if (href && href.length > 10 && !href.startsWith('#')) {
            // Determine server name from URL or text
            let serverName = linkText || 'Unknown Server';

            if (href.includes('gofile.io')) serverName = 'Gofile';
            else if (href.includes('krakenfiles.com')) serverName = 'Krakenfile';
            else if (href.includes('mirrored.to')) serverName = 'Mirrored';
            else if (href.includes('pixeldrain.com')) serverName = 'Pixeldrain';
            else if (href.includes('acefile.co')) serverName = 'AceFile';
            else if (href.includes('bayfiles.com')) serverName = 'BayFiles';
            else if (href.includes('letsupload.io')) serverName = 'LetsUpload';
            else if (href.includes('mega.nz') || href.includes('mega.co')) serverName = 'Mega.nz';
            else if (href.includes('mediafire.com')) serverName = 'MediaFire';
            else if (href.includes('zippyshare.com')) serverName = 'ZippyShare';
            else if (href.includes('drive.google.com') || href.includes('gdrive')) serverName = 'Google Drive';
            else if (href.includes('file.io')) serverName = 'File.io';

            // Avoid duplicates
            if (!servers.find(s => s.url === href)) {
              servers.push({
                name: serverName,
                url: href
              });
            }
          }
        });

        if (servers.length > 0) {
          qualities.push({
            quality,
            servers
          });
        }
      }
    });

    // If we found qualities for this type, add it to downloads
    if (qualities.length > 0) {
      downloads.push({
        type: videoType,
        qualities
      });
    }
  });

  // Fallback: if no structured download sections found, try to extract from general links
  if (downloads.length === 0) {
    console.log('No structured download sections found, attempting fallback extraction...');

    const fallbackQualities: Quality[] = [];

    // Group links by quality
    const qualityGroups: { [key: string]: Server[] } = {};

    $('a').each((_, linkEl) => {
      const $link = $(linkEl);
      const href = $link.attr('href');

      if (href &&
          href.length > 10 &&
          !href.startsWith('#') &&
          !href.includes('facebook.com') &&
          !href.includes('instagram.com') &&
          !href.includes('twitter.com') &&
          !href.includes('telegram.org') &&
          !href.includes('discord.com') &&
          !href.includes('youtube.com') &&
          (href.includes('gofile.io') ||
           href.includes('krakenfiles.com') ||
           href.includes('mirrored.to') ||
           href.includes('pixeldrain.com') ||
           href.includes('acefile.co') ||
           href.includes('bayfiles.com') ||
           href.includes('letsupload.io') ||
           href.includes('mega.nz') ||
           href.includes('mediafire.com') ||
           href.includes('zippyshare.com') ||
           href.includes('drive.google.com'))) {

        // Determine quality from URL or nearby text
        let quality = '720p'; // default
        if (href.includes('360p')) quality = '360p';
        else if (href.includes('480p')) quality = '480p';
        else if (href.includes('720p')) quality = '720p';
        else if (href.includes('1080p')) quality = '1080p';

        // Determine server name
        let serverName = 'Unknown Server';
        if (href.includes('gofile.io')) serverName = 'Gofile';
        else if (href.includes('krakenfiles.com')) serverName = 'Krakenfile';
        else if (href.includes('mirrored.to')) serverName = 'Mirrored';
        else if (href.includes('pixeldrain.com')) serverName = 'Pixeldrain';
        else if (href.includes('acefile.co')) serverName = 'AceFile';
        else if (href.includes('bayfiles.com')) serverName = 'BayFiles';
        else if (href.includes('letsupload.io')) serverName = 'LetsUpload';
        else if (href.includes('mega.nz') || href.includes('mega.co')) serverName = 'Mega.nz';
        else if (href.includes('mediafire.com')) serverName = 'MediaFire';
        else if (href.includes('zippyshare.com')) serverName = 'ZippyShare';
        else if (href.includes('drive.google.com') || href.includes('gdrive')) serverName = 'Google Drive';

        if (!qualityGroups[quality]) {
          qualityGroups[quality] = [];
        }

        // Avoid duplicates
        if (!qualityGroups[quality].find(s => s.url === href)) {
          qualityGroups[quality].push({
            name: serverName,
            url: href
          });
        }
      }
    });

    // Convert quality groups to qualities array
    Object.keys(qualityGroups).forEach(quality => {
      if (qualityGroups[quality].length > 0) {
        fallbackQualities.push({
          quality,
          servers: qualityGroups[quality]
        });
      }
    });

    if (fallbackQualities.length > 0) {
      downloads.push({
        type: 'MKV', // default type for fallback
        qualities: fallbackQualities
      });
    }
  }

  return {
    batchId,
    title: title || `Batch Download ${batchId}`,
    episodeRange,
    animeDetail: Object.keys(animeDetail).length > 0 ? animeDetail : undefined,
    downloads
  };
}
