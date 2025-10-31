import { NextResponse, NextRequest } from 'next/server';
import { AllAnimeScraper } from '@/lib/scrapers';
import { ApiResponse, PaginationData, Anime } from '@/types/anime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const data = await AllAnimeScraper.getAllAnime(page, Math.min(limit, 50)) as PaginationData<Anime>;
    
    const response: ApiResponse<PaginationData<Anime>> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil anime',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
