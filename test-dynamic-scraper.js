const { DynamicEpisodeScraper } = require('./src/lib/scrapers/dynamicEpisodeScraper');

async function testScraper() {
  console.log('Testing DynamicEpisodeScraper...');
  try {
    const result = await DynamicEpisodeScraper.scrape('ninja-to-gokudou-episode-4');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testScraper();
