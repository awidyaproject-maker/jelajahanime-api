/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import axiosInstance from '@/lib/axios';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const endpoints = [
      '/',
      '/anime/terbaru',
      '/anime/ongoing',
      '/anime/complete',
      '/anime/populer',
      '/anime/movie',
      '/anime/batch',
    ];
    
    const results: any = {};
    
    for (const endpoint of endpoints) {
      try {
        const { data } = await axiosInstance.get(endpoint);
        const $ = load(data);
        const thumbCount = $('div.thumb').length;
        const pageTitle = $('title').text();
        
        results[endpoint] = {
          status: 'success',
          thumbCount,
          pageTitle,
          bodyHTML: data.substring(0, 500),
        };
      } catch (err) {
        results[endpoint] = {
          status: 'error',
          error: (err as any).message,
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    }, { status: 500 });
  }
}
