import { NextResponse, NextRequest } from 'next/server';
import { load } from 'cheerio';
import axiosInstance from '@/lib/axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const path = searchParams.get('path') || '/';
    
    const { data } = await axiosInstance.get(path);
    const $ = load(data);
    
    // Get all links on the page
    const links = $('a[href*="/anime"]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter((url, index, self) => url && self.indexOf(url) === index)
      .slice(0, 20);
    
    // Get structure
    const structure = {
      title: $('title').text(),
      h1: $('h1').text(),
      mainNavLinks: $('nav a').map((_, el) => ({
        text: $(el).text().trim(),
        href: $(el).attr('href'),
      })).get(),
      thumbCount: $('div.thumb').length,
      firstThumbLink: $('div.thumb a').first().attr('href'),
      sampleLinks: links,
    };
    
    return NextResponse.json({
      success: true,
      path,
      structure,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    }, { status: 500 });
  }
}
