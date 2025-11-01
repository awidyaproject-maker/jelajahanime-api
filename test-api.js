const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    const response = await axios.get('http://localhost:3002/api/episode/one-piece-episode-1140');
    console.log('API Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();
