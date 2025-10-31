import { NextResponse } from 'next/server';
import { fetchPageContent } from '@/lib/utils/fetchPageContent';
import { scrapeBatchDownload, BatchDownloadData } from '@/lib/scrapers/downloadScraper';
import { cacheManager } from '@/lib/cache';
import { SITE_CONFIG } from '@/lib/config';
import { ApiResponse } from '@/types/anime';

export async function GET(
  request: Request,
  { params }: { params: { batchId: string } }
) {
  try {
    const batchId = params.batchId;
    const cacheKey = `batch:download:new:${batchId}`;

    const batchData = await cacheManager.getOrSet(cacheKey, async () => {
      // Construct full URL from batchId
      const batchUrl = `${SITE_CONFIG.BASE_URL}/batch/${batchId}/`;

      console.log(`Processing batch download request for: ${batchId}`);

      // Fetch page content (Axios first, Puppeteer fallback)
      const pageResult = await fetchPageContent(batchUrl);

      console.log(`Fetched page using ${pageResult.method}, blocked: ${pageResult.blocked}`);

      // Scrape the download data
      const scrapedData = scrapeBatchDownload(pageResult.html, batchId);

      console.log(`Scraped ${scrapedData.downloads.length} download types with ${scrapedData.downloads.reduce((total, type) => total + type.qualities.length, 0)} qualities`);

      return scrapedData;
    });

    const response: ApiResponse<BatchDownloadData> = {
      success: true,
      data: batchData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Batch download API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil informasi download',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
