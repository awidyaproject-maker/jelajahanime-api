import { AiringScraper } from './src/lib/scrapers/index.js';

async function testAiringScraper() {
  console.log('Testing AiringScraper...');
  try {
    const result = await AiringScraper.getAiringAnime(1, 5);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAiringScraper();