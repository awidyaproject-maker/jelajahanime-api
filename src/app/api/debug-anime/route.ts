/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import axiosInstance from '@/lib/axios';
import { load } from 'cheerio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get('id') || '1';

    const { data } = await axiosInstance.get(`/anime/${animeId}`);
    const $ = load(data);

    // Look for any divs with info classes
    const infoDivs: any[] = [];
    $('div[class*="info"], div[class*="detail"], div[class*="spec"]').each((index, el) => {
      const $el = $(el);
      infoDivs.push({
        index,
        className: $el.attr('class'),
        html: $el.html()?.substring(0, 300) || '',
        text: $el.text()?.substring(0, 200) || ''
      });
    });

    // Look for any elements containing "studio", "episode", etc.
    const studioElements: any[] = [];
    $('*').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('studio') || text.includes('producer') || text.includes('episode') || text.includes('aired');
    }).each((index, el) => {
      const $el = $(el);
      studioElements.push({
        index,
        tagName: (el as any).name || el.type,
        className: $el.attr('class') || '',
        text: $el.text().substring(0, 200),
        html: $el.html()?.substring(0, 200) || ''
      });
    });

    // Look for episode links with different patterns
    const episodeLinks: any[] = [];
    $('a[href*="/episode/"], a[href*="episode"], a[href*="eps"]').each((index, el) => {
      const $el = $(el);
      episodeLinks.push({
        index,
        href: $el.attr('href'),
        text: $el.text().substring(0, 100)
      });
    });

    // Look for any links that might be episodes
    const allLinks: any[] = [];
    $('a').filter((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      return href.includes('eps') || href.includes('episode') || text.includes('episode') || text.includes('eps') || /^\d+$/.test(text.trim());
    }).each((index, el) => {
      const $el = $(el);
      allLinks.push({
        index,
        href: $el.attr('href'),
        text: $el.text().trim().substring(0, 50)
      });
    });

    return NextResponse.json({
      success: true,
      message: `Debug info for anime/${animeId}`,
      counts: {
        infoDivs: infoDivs.length,
        studioElements: studioElements.length,
        episodeLinks: episodeLinks.length,
        allLinks: allLinks.length,
      },
      data: {
        infoDivs: infoDivs.slice(0, 5), // First 5 info divs
        studioElements: studioElements.slice(0, 10), // First 10 studio elements
        episodeLinks: episodeLinks.slice(0, 10), // First 10 episode links
        allLinks: allLinks.slice(0, 20), // First 20 potential episode links
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch',
      errorDetails: error,
    }, { status: 500 });
  }
}
