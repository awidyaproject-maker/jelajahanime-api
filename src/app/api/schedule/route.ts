import { NextResponse } from 'next/server';
import AnimeScraper from '@/lib/scraper';
import { ScheduleScraper } from '@/lib/scrapers/scheduleScraper';
import { ApiResponse } from '@/types/anime';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug');

    if (debug === 'true') {
      // Run debug analysis and return results
      const debugData = await ScheduleScraper.debugPageStructure();
      return NextResponse.json({
        success: true,
        message: 'Debug analysis completed',
        debugData,
        timestamp: new Date().toISOString(),
      });
    }

    const data = await ScheduleScraper.getSchedule();

    // Add some debug info to the response
    const totalAnime = Object.values(data).reduce((sum, day: any[]) => sum + day.length, 0);
    const uniqueTitles = new Set();
    Object.values(data).forEach((day: any[]) => {
      day.forEach(anime => uniqueTitles.add(anime.title));
    });

    const response: ApiResponse<any> = {
      success: true,
      data,
      debug: {
        totalAnime,
        uniqueTitles: Array.from(uniqueTitles),
        uniqueCount: uniqueTitles.size,
        daysWithAnime: Object.entries(data).filter(([_, anime]) => anime.length > 0).length
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Schedule API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil jadwal',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}