import { NextResponse, NextRequest } from 'next/server';
import { SearchScraper } from '@/lib/scrapers';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Parameter query harus diisi',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

  const data = await SearchScraper.searchAnime(query, page) as SearchResult;
    
    const response: ApiResponse<SearchResult> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mencari anime',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}