import { NextResponse, NextRequest } from 'next/server';
import { PopularScraper } from '@/lib/scrapers';
import { ApiResponse, Anime } from '@/types/anime';

interface SearchResult {
  query: string;
  results: Anime[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const data = await PopularScraper.getPopularAnime(page) as SearchResult;
    
    const response: ApiResponse<SearchResult> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil anime populer',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}