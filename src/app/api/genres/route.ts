import { NextResponse } from 'next/server';
import { HomeScraper } from '@/lib/scrapers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const genres = await HomeScraper.getGenres();

    const response = {
      success: true,
      data: genres,
      total: genres.length,
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
