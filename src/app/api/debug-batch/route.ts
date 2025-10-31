/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import axiosInstance from '@/lib/axios';
import { load } from 'cheerio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('id') || '1';

    const { data } = await axiosInstance.get(`/batch/${batchId}`);
    const $ = load(data);

    // Look for download links and info
    const downloadLinks: any[] = [];
    $('a').each((index, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().trim();

      if (href && (href.includes('mega') || href.includes('gdrive') || href.includes('download') || href.includes('drive.google') || href.includes('mediafire') || href.includes('zippyshare'))) {
        downloadLinks.push({
          index,
          href,
          text: text.substring(0, 100),
          parentClass: $el.parent().attr('class') || ''
        });
      }
    });

    // Look for ALL links that might be downloads
    const allLinks: any[] = [];
    $('a').each((index, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().toLowerCase().trim();

      if (href && href.length > 10 && !href.startsWith('#') && !href.includes('samehadaku.how') && (text.includes('download') || text.includes('batch') || text.includes('mega') || text.includes('drive') || href.includes('http'))) {
        allLinks.push({
          index,
          href: href.substring(0, 100),
          text: text.substring(0, 50),
          parentClass: $el.parent().attr('class') || ''
        });
      }
    });

    // Look for size and quality info
    const infoElements: any[] = [];
    $('*').each((index, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();

      if (text.includes('size') || text.includes('quality') || text.includes('gb') || text.includes('mb') || text.includes('480p') || text.includes('720p') || text.includes('1080p')) {
        infoElements.push({
          index,
          tagName: (el as any).name,
          className: $el.attr('class') || '',
          text: $el.text().trim().substring(0, 200)
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Debug info for batch/${batchId}`,
      counts: {
        downloadLinks: downloadLinks.length,
        allLinks: allLinks.length,
        infoElements: infoElements.length,
      },
      data: {
        downloadLinks: downloadLinks.slice(0, 10),
        allLinks: allLinks.slice(0, 15),
        infoElements: infoElements.slice(0, 10),
        title: $('h1, .entry-title').first().text().trim(),
        bodyText: $('body').text().substring(0, 500)
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
