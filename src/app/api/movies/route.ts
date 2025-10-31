import { NextResponse, NextRequest } from 'next/server';
import { MovieScraper } from '@/lib/scrapers';
import { ApiResponse, PaginationData, Anime } from '@/types/anime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('Movies API called with page:', page, 'limit:', limit);

  const data = await MovieScraper.getMovies(page, Math.min(limit, 50)) as PaginationData<Anime>;

    console.log('Movies data returned:', data);

    const response: ApiResponse<PaginationData<Anime>> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Movies API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil anime movie',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}