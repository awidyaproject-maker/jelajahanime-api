import { NextResponse } from 'next/server';
import axiosInstance from '@/lib/axios';

export async function GET() {
  try {
    const { data } = await axiosInstance.get('/');
    
    // Return raw HTML untuk debugging
    return NextResponse.json({
      success: true,
      message: 'Raw HTML response from Samehadaku',
      htmlLength: data.length,
      htmlPreview: data.substring(0, 2000), // First 2000 chars
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
