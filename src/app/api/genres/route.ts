import { NextResponse } from 'next/server';
import AnimeScraper from '@/lib/scraper';
import { ApiResponse } from '@/types/anime';

export async function GET() {
  try {
    const data = await AnimeScraper.getGenres();
    
    const response: ApiResponse<any> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil genre',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}