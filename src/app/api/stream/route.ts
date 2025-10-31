import { NextResponse, NextRequest } from 'next/server';
import { EpisodeScraper } from '@/lib/scrapers/episodeScraper';
import { ApiResponse, EpisodeData } from '@/types/anime';

interface StreamResponse extends EpisodeData {
  episodeId: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json({
        success: false,
        error: 'Parameter episodeId harus diisi',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    console.log('🎬 API CALL - Stream Episode ID:', episodeId);

    // Use EpisodeScraper.getEpisodeData() to get full episode data with properly scraped servers
    const episodeData = await EpisodeScraper.getEpisodeData(episodeId);

    const response: ApiResponse<StreamResponse> = {
      success: true,
      data: {
        episodeId,
        ...episodeData
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data stream',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
