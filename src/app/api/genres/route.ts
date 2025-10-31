import { NextResponse } from 'next/server';
import { HomeScraper } from '@/lib/scrapers';
import { ApiResponse, Genre } from '@/types/anime';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
  const data = await HomeScraper.getGenres() as Genre[];
    
    const response: ApiResponse<Genre[]> = {
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