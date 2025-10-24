import { NextResponse } from 'next/server';
import { BatchScraper } from '@/lib/scrapers';
import { ApiResponse } from '@/types/anime';

export async function GET(
  request: Request,
  { params }: { params: { batchId: string } }
) {
  try {
  const batchData = await BatchScraper.getBatchDownload(params.batchId);
    
    const response: ApiResponse<any> = {
      success: true,
      data: batchData,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil informasi download',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}