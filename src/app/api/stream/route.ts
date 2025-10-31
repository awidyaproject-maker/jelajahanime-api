import { NextResponse, NextRequest } from 'next/server';
import { EpisodeScraper } from '@/lib/scrapers';
import { ApiResponse, StreamServer } from '@/types/anime';

interface StreamData {
  episodeId: string;
  servers: StreamServer[];
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

  const servers = await EpisodeScraper.getEpisodeLinks(episodeId);
    
    const response: ApiResponse<StreamData> = {
      success: true,
      data: {
        episodeId,
        servers,
      },
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil stream server',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}