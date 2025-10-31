import { NextResponse } from 'next/server';
import { EpisodeScraper } from '@/lib/scrapers/episodeScraper';
import { ApiResponse, EpisodeData } from '@/types/anime';

interface EpisodeResponse extends EpisodeData {
  episodeId: string;
}

export async function GET(
  request: Request,
  { params }: { params: { episodeId: string } }
) {
  try {
    console.log('🎬 API CALL - Episode ID:', params.episodeId);

    // Use the EpisodeScraper to get full episode data with metadata
    const episodeData = await EpisodeScraper.getEpisodeData(params.episodeId);

    const response: ApiResponse<EpisodeResponse> = {
      success: true,
      data: {
        episodeId: params.episodeId,
        ...episodeData
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data episode',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
