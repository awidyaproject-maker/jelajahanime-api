import { NextResponse } from 'next/server';
import axiosInstance from '@/lib/axios';
import { cacheManager } from '@/lib/cache';

export async function GET() {
  try {
    const { data } = await axiosInstance.get('/kekkon-yubiwa-monogatari-season-2-episode-4');
    
    // Check for various server indicators
    const hasBlogspot = data.includes('Blogspot');
    const hasWibufile = data.includes('Wibufile');
    const hasMega = data.includes('Mega');
    const hasStreaming = data.includes('streaming');
    const hasPlayer = data.includes('player');
    const hasServer = data.includes('Server');
    const has360p = data.includes('360p');
    
    // Look for title
    const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';
    
    // Return raw HTML untuk debugging
    return NextResponse.json({
      success: true,
      message: 'Raw HTML response from Samehadaku episode page',
      htmlLength: data.length,
      title: title,
      hasIndicators: {
        blogspot: hasBlogspot,
        wibufile: hasWibufile,
        mega: hasMega,
        streaming: hasStreaming,
        player: hasPlayer,
        server: hasServer,
        quality360p: has360p
      },
      htmlPreview: data.substring(0, 1000), // First 1000 chars
      contentType: typeof data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch',
      errorDetails: error,
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    cacheManager.flush();
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache',
    }, { status: 500 });
  }
}
