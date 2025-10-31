import { NextResponse, NextRequest } from 'next/server';
import { GenreScraper } from '@/lib/scrapers';
import { ApiResponse, Anime } from '@/types/anime';

interface GenreData {
  data: Anime[];
  genre: string;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

  const data = await GenreScraper.getAnimeByGenre(params.slug, page, Math.min(limit, 50));
    
    const response: ApiResponse<GenreData> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil anime berdasarkan genre',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}