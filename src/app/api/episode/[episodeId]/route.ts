import { NextResponse } from 'next/server';
import { EpisodeScraper } from '@/lib/scrapers';
import { ApiResponse } from '@/types/anime';

export async function GET(
  request: Request,
  { params }: { params: { episodeId: string } }
) {
  try {
  const servers = await EpisodeScraper.getEpisodeLinks(params.episodeId);
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        episodeId: params.episodeId,
        servers,
      },
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil link episode',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}