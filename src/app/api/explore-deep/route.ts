import { NextResponse, NextRequest } from 'next/server';
import { load } from 'cheerio';
import axiosInstance from '@/lib/axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const path = searchParams.get('path') || '/?s=one';
    
    const { data } = await axiosInstance.get(path);
    const $ = load(data);
    
    // Get all elements that might contain anime
    const analysis = {
      elements: {
        'div.thumb': $('div.thumb').length,
        'div.post': $('div.post').length,
        'article': $('article').length,
        'div[class*="item"]': $('div[class*="item"]').length,
        'div[class*="post"]': $('div[class*="post"]').length,
        'div[class*="result"]': $('div[class*="result"]').length,
        'li': $('li').length,
        'div a img': $('div a img').length,
      },
      firstDivStructure: $('div').first().attr('class'),
      allDivClasses: $('div').slice(0, 20).map((_, el) => $(el).attr('class')).get().filter(c => c),
      firstAHref: $('a').first().attr('href'),
      postClasses: $('[class*="post"]').slice(0, 10).map((_, el) => ({
        tag: $(el).prop('tagName'),
        class: $(el).attr('class'),
      })).get(),
    };
    
    return NextResponse.json({
      success: true,
      path,
      analysis,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    }, { status: 500 });
  }
}
