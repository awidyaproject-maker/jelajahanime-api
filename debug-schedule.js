import { ScheduleScraper } from './src/lib/scrapers/scheduleScraper.js';

async function debugSchedule() {
  console.log('Starting schedule page debug...');
  await ScheduleScraper.debugPageStructure();
}

debugSchedule().catch(console.error);