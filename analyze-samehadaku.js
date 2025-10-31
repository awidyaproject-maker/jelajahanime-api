const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeSamehadaku() {
  try {
    const response = await axios.get('https://v1.samehadaku.how/one-piece-episode-1125/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    console.log('=== ANALYZING SAMEHADAKU STRUCTURE ===\n');

    // Look for onclick handlers
    console.log('ONCLICK HANDLERS:');
    $('[onclick]').each((i, el) => {
      const onclick = $(el).attr('onclick');
      const text = $(el).text().trim();
      if (onclick && (onclick.includes('server') || onclick.includes('quality') || onclick.includes('player'))) {
        console.log(`Text: "${text}"`);
        console.log(`OnClick: ${onclick}\n`);
      }
    });

    // Look for data attributes
    console.log('DATA ATTRIBUTES:');
    $('[data-server], [data-quality], [data-player]').each((i, el) => {
      const data = $(el).data();
      const text = $(el).text().trim();
      console.log(`Text: "${text}"`);
      console.log(`Data:`, data);
      console.log();
    });

    // Look for select elements
    console.log('SELECT ELEMENTS:');
    $('select').each((i, el) => {
      const $select = $(el);
      const name = $select.attr('name') || $select.attr('id');
      console.log(`Select name/id: ${name}`);
      $select.find('option').each((j, option) => {
        const $option = $(option);
        const value = $option.attr('value');
        const text = $option.text().trim();
        console.log(`  Option: "${text}" -> "${value}"`);
      });
      console.log();
    });

    // Look for buttons with server/quality in class or text
    console.log('BUTTONS WITH SERVER/QUALITY:');
    $('button, .btn, [class*="server"], [class*="quality"]').each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const className = $el.attr('class');
      if (text && (text.toLowerCase().includes('server') || text.toLowerCase().includes('quality') ||
          className.includes('server') || className.includes('quality'))) {
        console.log(`Text: "${text}"`);
        console.log(`Class: ${className}`);
        console.log(`Data:`, $el.data());
        console.log();
      }
    });

    // Look for iframes
    console.log('IFRAMES:');
    $('iframe').each((i, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      const id = $el.attr('id');
      console.log(`ID: ${id}, Src: ${src}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

analyzeSamehadaku();