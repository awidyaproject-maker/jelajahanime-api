import { NextResponse, NextRequest } from 'next/server';
import AnimeScraper from '@/lib/scraper';
import { ApiResponse } from '@/types/anime';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const result = await AnimeScraper.getLatestAnime(Math.min(limit, 50), page);
    
    // Handle backward compatibility for cached data
    let data: any[];
    let pagination: any = null;
    
    if (Array.isArray(result)) {
      // Old cached format (array)
      data = result;
      pagination = {
        currentPage: 1,
        totalPages: 50,
        totalItems: 1000,
      };
    } else {
      // New format (object with data and pagination)
      data = result.data;
      pagination = result.pagination;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil anime terbaru',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}