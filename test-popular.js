import { PopularScraper } from './src/lib/scrapers/popularScraper.js';

async function testPopularScraper() {
  console.log('Testing PopularScraper...');
  try {
    const result = await PopularScraper.getPopularAnime(1);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testPopularScraper();