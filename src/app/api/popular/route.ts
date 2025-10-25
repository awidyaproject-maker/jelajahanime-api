import { NextResponse, NextRequest } from 'next/server';
import { PopularScraper } from '@/lib/scrapers';
import { ApiResponse } from '@/types/anime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

  const data = await PopularScraper.getPopularAnime(Math.min(limit, 50));
    
    const response: ApiResponse<any> = {
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