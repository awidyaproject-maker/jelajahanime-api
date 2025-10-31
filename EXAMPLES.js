#!/usr/bin/env node

/**
 * Real-World Usage Examples for Enhanced Episode Scraper
 * 
 * This file shows practical examples of how to use the improved
 * episode scraper with different scenarios and edge cases.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/stream';

/**
 * Example 1: Basic Episode Scraping
 * Get all available servers for a specific episode
 */
async function example1_basicEpisodeScraping() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 1: Basic Episode Scraping');
  console.log('='.repeat(70));

  try {
    const response = await axios.get(API_URL, {
      params: {
        episodeId: 'nageki-no-bourei-wa-intai-shitai-season-2-episode-4/'
      }
    });

    if (response.data.success) {
      const { data } = response.data;
      console.log(`✅ Episode: ${data.episodeId}`);
      console.log(`📡 Found ${data.servers.length} streaming servers:\n`);
      
      data.servers.forEach((server, index) => {
        console.log(`  ${index + 1}. ${server.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 2: Auto-detect Latest Episode
 * Instead of providing episode slug, provide anime slug
 * The scraper will find and use the latest episode
 */
async function example2_autodetectLatestEpisode() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 2: Auto-detect Latest Episode');
  console.log('='.repeat(70));

  try {
    const response = await axios.get(API_URL, {
      params: {
        episodeId: 'naruto-shippuden/' // Just the anime slug
      }
    });

    if (response.data.success) {
      const { data } = response.data;
      console.log(`✅ Anime: naruto-shippuden/`);
      console.log(`🆕 Latest Episode: ${data.episodeId}`);
      console.log(`📡 Found ${data.servers.length} servers`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 3: Batch Processing Multiple Episodes
 * Scrape multiple episodes in sequence
 * (Note: Add delays between requests to avoid rate limiting)
 */
async function example3_batchProcessing() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 3: Batch Processing Multiple Episodes');
  console.log('='.repeat(70));

  const episodes = [
    'jujutsu-kaisen-season-2-episode-1/',
    'jujutsu-kaisen-season-2-episode-2/',
    'jujutsu-kaisen-season-2-episode-3/'
  ];

  for (const episodeId of episodes) {
    try {
      console.log(`\n  📥 Scraping: ${episodeId}`);
      
      const response = await axios.get(API_URL, {
        params: { episodeId },
        timeout: 30000
      });

      if (response.data.success) {
        console.log(`  ✅ Found ${response.data.data.servers.length} servers`);
      }

      // Add delay between requests (be respectful to servers)
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
}

/**
 * Example 4: Filter Servers by Quality
 * Get only high-quality servers
 */
async function example4_filterByQuality() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 4: Filter Servers by Quality');
  console.log('='.repeat(70));

  try {
    const response = await axios.get(API_URL, {
      params: {
        episodeId: 'demon-slayer-season-4-episode-1/'
      }
    });

    if (response.data.success) {
      const { servers } = response.data.data;

      // Filter for high quality (720p or 1080p)
      const highQualityServers = servers.filter(server =>
        server.name.includes('720p') || 
        server.name.includes('1080p') ||
        server.name.includes('HD')
      );

      console.log(`📡 Total servers: ${servers.length}`);
      console.log(`🎬 High-quality (720p+): ${highQualityServers.length}\n`);

      highQualityServers.forEach((server, index) => {
        console.log(`  ${index + 1}. ${server.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 5: Group Servers by Provider
 * Organize servers by streaming provider
 */
async function example5_groupByProvider() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 5: Group Servers by Provider');
  console.log('='.repeat(70));

  try {
    const response = await axios.get(API_URL, {
      params: {
        episodeId: 'attack-on-titan-final-season-episode-1/'
      }
    });

    if (response.data.success) {
      const { servers } = response.data.data;

      // Group servers by provider
      const grouped = {};
      servers.forEach(server => {
        const provider = server.name.split(' ')[0]; // First word is provider
        if (!grouped[provider]) {
          grouped[provider] = [];
        }
        grouped[provider].push(server);
      });

      console.log('📦 Servers grouped by provider:\n');
      Object.entries(grouped).forEach(([provider, providerServers]) => {
        console.log(`  ${provider}:`);
        providerServers.forEach(server => {
          console.log(`    - ${server.name}`);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 6: Error Handling & Retry Logic
 * Properly handle failures with exponential backoff
 */
async function example6_errorHandling() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 6: Error Handling & Retry Logic');
  console.log('='.repeat(70));

  const episodeId = 'test-episode-1/';
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n  Attempt ${attempt}/${maxRetries}...`);

      const response = await axios.get(API_URL, {
        params: { episodeId },
        timeout: 15000
      });

      if (response.data.success) {
        console.log(`✅ Success! Found ${response.data.data.servers.length} servers`);
        return;
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error(`  ❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`  ⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.log(`\n❌ Failed after ${maxRetries} attempts`);
}

/**
 * Example 7: Performance Monitoring
 * Track response times and server counts
 */
async function example7_performanceMonitoring() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 7: Performance Monitoring');
  console.log('='.repeat(70));

  const testEpisodes = [
    'recent-anime-episode-1/',
    'older-anime-episode-100/',
    'popular-anime-season-2-episode-5/'
  ];

  const metrics = [];

  for (const episodeId of testEpisodes) {
    try {
      const startTime = Date.now();

      const response = await axios.get(API_URL, {
        params: { episodeId },
        timeout: 30000
      });

      const duration = Date.now() - startTime;
      const servers = response.data.data.servers.length;

      metrics.push({
        episode: episodeId,
        duration,
        servers,
        success: true
      });

      console.log(`\n  Episode: ${episodeId}`);
      console.log(`  ⏱️  Response time: ${duration}ms`);
      console.log(`  📡 Servers found: ${servers}`);

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      metrics.push({
        episode: episodeId,
        duration: -1,
        servers: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Summary statistics
  const successful = metrics.filter(m => m.success);
  const avgTime = successful.reduce((sum, m) => sum + m.duration, 0) / successful.length;
  const avgServers = successful.reduce((sum, m) => sum + m.servers, 0) / successful.length;

  console.log('\n' + '-'.repeat(70));
  console.log('📊 Performance Summary:');
  console.log('-'.repeat(70));
  console.log(`  Successful requests: ${successful.length}/${metrics.length}`);
  console.log(`  Average response time: ${avgTime.toFixed(0)}ms`);
  console.log(`  Average servers found: ${avgServers.toFixed(1)}`);
}

/**
 * Example 8: Integration with Frontend
 * Example of how to use in a web frontend
 */
function example8_frontendIntegration() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 8: Frontend Integration (JavaScript code sample)');
  console.log('='.repeat(70));

  const code = `
// Frontend code example (React/Vue/etc.)

async function fetchStreamServers(episodeId) {
  try {
    const response = await fetch(\`/api/stream?episodeId=\${episodeId}\`);
    const data = await response.json();

    if (data.success) {
      // Render servers in UI
      displayServers(data.data.servers);
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Failed to load servers: ' + error.message);
  }
}

// Display servers in dropdown or button group
function displayServers(servers) {
  const container = document.getElementById('servers');
  
  servers.forEach(server => {
    const button = document.createElement('button');
    button.textContent = server.name;
    button.onclick = () => playVideo(server.url);
    container.appendChild(button);
  });
}

// Call when episode page loads
window.addEventListener('load', () => {
  const episodeId = getEpisodeIdFromUrl();
  fetchStreamServers(episodeId);
});
  `;

  console.log(code);
}

/**
 * Example 9: Database Caching
 * Store results for offline access
 */
async function example9_databaseCaching() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 9: Database Caching (conceptual)');
  console.log('='.repeat(70));

  const pseudoCode = `
// Conceptual example - would require database setup

// 1. Check database first
const cachedServers = await db.servers.findOne({ episodeId });
if (cachedServers && isStillValid(cachedServers.timestamp)) {
  return cachedServers.data;
}

// 2. If not cached, scrape from API
const response = await fetch(\`/api/stream?episodeId=\${episodeId}\`);
const freshData = await response.json();

// 3. Store in database
await db.servers.updateOne(
  { episodeId },
  {
    \$set: {
      servers: freshData.data.servers,
      timestamp: new Date(),
      source: 'samehadaku'
    }
  },
  { upsert: true }
);

return freshData.data.servers;
  `;

  console.log(pseudoCode);
}

/**
 * Example 10: Advanced - Parallel Processing
 * Scrape multiple episodes in parallel (use with caution)
 */
async function example10_parallelProcessing() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 10: Parallel Processing (Experimental)');
  console.log('='.repeat(70));

  const episodes = [
    'episode-1/',
    'episode-2/',
    'episode-3/',
    'episode-4/',
    'episode-5/'
  ];

  // Note: Parallel processing may hit rate limits
  // Use with caution and implement delays if needed

  try {
    const startTime = Date.now();

    // Create promises for all episodes
    const promises = episodes.map(episodeId =>
      axios.get(API_URL, {
        params: { episodeId },
        timeout: 20000
      }).catch(err => ({ error: err.message, episodeId }))
    );

    // Wait for all to complete
    const results = await Promise.all(promises);

    // Process results
    results.forEach((result, index) => {
      if (result.data?.success) {
        const servers = result.data.data.servers.length;
        console.log(`✅ Episode ${index + 1}: ${servers} servers`);
      } else if (result.error) {
        console.log(`❌ Episode ${index + 1}: ${result.error}`);
      }
    });

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Total time: ${duration}ms`);
  } catch (error) {
    console.error('❌ Parallel processing failed:', error.message);
  }
}

// Main - Run selected examples
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║      Episode Scraper - Real-World Usage Examples                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  // Uncomment examples to run:
  await example1_basicEpisodeScraping();
  // await example2_autodetectLatestEpisode();
  // await example3_batchProcessing();
  // await example4_filterByQuality();
  // await example5_groupByProvider();
  // await example6_errorHandling();
  // await example7_performanceMonitoring();
  example8_frontendIntegration();
  example9_databaseCaching();
  // await example10_parallelProcessing();

  console.log('\n✅ Examples completed!');
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1_basicEpisodeScraping,
  example2_autodetectLatestEpisode,
  example3_batchProcessing,
  example4_filterByQuality,
  example5_groupByProvider,
  example6_errorHandling,
  example7_performanceMonitoring,
  example9_databaseCaching,
  example10_parallelProcessing
};
