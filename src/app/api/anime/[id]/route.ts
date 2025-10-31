import { NextResponse } from 'next/server';
import { AnimeDetailScraper } from '@/lib/scrapers';
import { ApiResponse, AnimeDetail } from '@/types/anime';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`API Route called for anime ID: ${params.id}`);
    const data = await AnimeDetailScraper.getAnimeDetail(params.id);
    
    const response: ApiResponse<AnimeDetail> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil detail anime',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}