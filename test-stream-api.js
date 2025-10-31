async function testStreamAPI() {
  console.log('Testing Stream API...');
  try {
    const response = await fetch('http://localhost:3000/api/stream?episodeId=ninja-to-gokudou-episode-4');
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testStreamAPI();
