import { NextResponse } from 'next/server';
import AnimeScraper from '@/lib/scraper';
import { ApiResponse } from '@/types/anime';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await AnimeScraper.getAnimeDetail(params.id);
    
    const response: ApiResponse<any> = {
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