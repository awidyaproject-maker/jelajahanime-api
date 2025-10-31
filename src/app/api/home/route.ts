import { NextResponse } from 'next/server';
import { HomeScraper } from '@/lib/scrapers';
import { ApiResponse, Anime } from '@/types/anime';

export const dynamic = 'force-dynamic';

interface HomeData {
  featured: Anime[];
  popular: Anime[];
  latest: Anime[];
  airing: Anime[];
}

export async function GET() {
  try {
  const data = await HomeScraper.getHome() as HomeData;
    
    const response: ApiResponse<HomeData> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Home API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data home',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}