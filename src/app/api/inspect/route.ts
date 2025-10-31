import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import axiosInstance from '@/lib/axios';

export async function GET() {
  try {
    const { data } = await axiosInstance.get('/');
    const $ = load(data);
    
    // Get detailed structure
    const details = {
      // Find all divs with thumbs (anime items)
      thumbElements: $('div.thumb').map((i, el) => {
        if (i >= 3) return null; // Only first 3
        const $el = $(el);
        return {
          html: $el.html()?.substring(0, 300),
          classes: $el.attr('class'),
          children: $el.children().map((_, child) => $(child).prop('tagName')).get(),
        };
      }).get().filter(Boolean),
      
      // Get first article/post structure
      firstArticle: $('article, [class*="post"]').first().html()?.substring(0, 500),
      
      // Look for image links
      imageLinks: $('a[href*="/anime/"] img').map((i, el) => {
        if (i >= 3) return null;
        return {
          src: $(el).attr('src'),
          alt: $(el).attr('alt'),
          parentHref: $(el).parent().attr('href'),
        };
      }).get().filter(Boolean),
      
      // Check structure of main content
      mainContent: $('main, [role="main"]').first().children().map((i, el) => {
        if (i >= 5) return null;
        return {
          tag: $(el).prop('tagName'),
          class: $(el).attr('class'),
          childrenCount: $(el).children().length,
        };
      }).get().filter(Boolean),
      
      // Get HTML of first meaningful content container
      htmlStructure: $('main').html()?.substring(0, 1000),
    };
    
    return NextResponse.json({
      success: true,
      details,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze',
    }, { status: 500 });
  }
}
