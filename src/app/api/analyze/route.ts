import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import axiosInstance from '@/lib/axios';

export async function GET() {
  try {
    const { data } = await axiosInstance.get('/');
    const $ = load(data);
    
    // Inspect various selectors
    const analysis = {
      // Try different selectors
      selectors: {
        'anime-item': $('anime-item').length,
        'anime-card': $('anime-card').length,
        '.anime-item': $('.anime-item').length,
        '.anime-card': $('.anime-card').length,
        '.post': $('.post').length,
        '[class*="item"]': $('[class*="item"]').length,
        '.thumb': $('.thumb').length,
        '.content': $('.content').length,
        'article': $('article').length,
        '.serie': $('.serie').length,
        '.item-content': $('.item-content').length,
        '.set-up': $('.set-up').length,
      },
      
      // Check for featured/trending/latest sections
      sectionSelectors: {
        '.featured': $('.featured').length,
        '.hero-anime': $('.hero-anime').length,
        '.featured-item': $('.featured-item').length,
        '.trending-anime': $('.trending-anime').length,
        '.popular-anime': $('.popular-anime').length,
        '.latest-anime': $('.latest-anime').length,
        '[data-section="featured"]': $('[data-section="featured"]').length,
        '[data-section="trending"]': $('[data-section="trending"]').length,
      },
      
      // Sample of first few elements with class
      sampleElements: {
        firstPostElement: $('article').first().attr('class'),
        firstDivElement: $('div[class*="item"]').first().attr('class'),
        allClasses: Array.from(new Set(
          $('*[class]').map((_, el) => $(el).attr('class')).get()
            .filter(c => c && (c.includes('item') || c.includes('anime') || c.includes('post') || c.includes('thumb')))
            .slice(0, 20)
        )),
      },
      
      // Check body structure
      bodyChildrenCount: $('body > *').length,
      mainContentSelectors: {
        'main': $('main').length,
        '.main': $('.main').length,
        '.content': $('.content').length,
        '.container': $('.container').length,
        '[role="main"]': $('[role="main"]').length,
      }
    };
    
    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze',
    }, { status: 500 });
  }
}
