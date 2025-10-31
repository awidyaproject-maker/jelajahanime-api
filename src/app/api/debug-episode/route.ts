/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import axiosInstance from '@/lib/axios';
import { load } from 'cheerio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('id') || '1';

    const { data } = await axiosInstance.get(`/episode/${episodeId}`);
    const $ = load(data);

    // Look for streaming server elements with more selectors
    const serverElements: any[] = [];
    $('.server-item, .stream-option, .server, .streaming, .player, .video-player, .embed, .video, .watch').each((index, el) => {
      const $el = $(el);
      serverElements.push({
        index,
        className: $el.attr('class'),
        html: $el.html()?.substring(0, 200) || '',
        text: $el.text().substring(0, 100)
      });
    });

    // Look for script tags that might contain streaming data
    const scripts: any[] = [];
    $('script').each((index, el) => {
      const $el = $(el);
      const content = $el.html() || '';
      if (content.includes('player') || content.includes('stream') || content.includes('server') || content.includes('video')) {
        scripts.push({
          index,
          content: content.substring(0, 300)
        });
      }
    });

    // Look for any divs with player or streaming related classes
    const playerDivs: any[] = [];
    $('div[class*="player"], div[class*="stream"], div[class*="server"], div[class*="video"]').each((index, el) => {
      const $el = $(el);
      playerDivs.push({
        index,
        className: $el.attr('class'),
        html: $el.html()?.substring(0, 500) || '',
        data: {
          onclick: $el.attr('onclick'),
          'data-url': $el.attr('data-url'),
          'data-src': $el.attr('data-src'),
          href: $el.find('a').attr('href')
        }
      });
    });

    // Look for iframe elements
    const iframes: any[] = [];
    $('iframe').each((index, el) => {
      const $el = $(el);
      iframes.push({
        index,
        src: $el.attr('src'),
        className: $el.attr('class') || ''
      });
    });

    // Look for any links that might be streaming servers
    const streamLinks: any[] = [];
    $('a[href*="player"], a[href*="stream"], a[href*="embed"]').each((index, el) => {
      const $el = $(el);
      streamLinks.push({
        index,
        href: $el.attr('href'),
        text: $el.text().trim().substring(0, 50)
      });
    });

    return NextResponse.json({
      success: true,
      message: `Debug info for episode/${episodeId}`,
      counts: {
        serverElements: serverElements.length,
        iframes: iframes.length,
        streamLinks: streamLinks.length,
        scripts: scripts.length,
        playerDivs: playerDivs.length,
      },
      data: {
        serverElements: serverElements.slice(0, 5),
        iframes: iframes.slice(0, 5),
        streamLinks: streamLinks.slice(0, 10),
        scripts: scripts.slice(0, 3),
        playerDivs: playerDivs.slice(0, 5),
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
