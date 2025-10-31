import { NextResponse, NextRequest } from 'next/server';
import { BatchScraper } from '@/lib/scrapers';
import { ApiResponse, PaginationData, Anime } from '@/types/anime';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

  const data = await BatchScraper.getBatch(page, Math.min(limit, 50)) as PaginationData<Anime>;
    
    const response: ApiResponse<PaginationData<Anime>> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil batch anime',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}