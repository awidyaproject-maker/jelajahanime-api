import { NextResponse } from 'next/server';
import { ScheduleScraper } from '@/lib/scrapers/scheduleScraper';
import { ApiResponse, ScheduleData } from '@/types/anime';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await ScheduleScraper.getSchedule();

    // Add some debug info to the response
    const totalAnime = Object.values(data).reduce((sum, day) => sum + day.length, 0);
    const uniqueTitles = new Set();
    Object.values(data).forEach((day) => {
      day.forEach(anime => uniqueTitles.add(anime.title));
    });

    const response: ApiResponse<ScheduleData> = {
      success: true,
      data,
      debug: {
        totalAnime,
        uniqueTitles: Array.from(uniqueTitles),
        uniqueCount: uniqueTitles.size,
        daysWithAnime: Object.entries(data).filter(([, anime]) => anime.length > 0).length
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
