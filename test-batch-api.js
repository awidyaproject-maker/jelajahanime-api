async function testBatchAPI() {
  console.log('Testing Batch Download API...');
  try {
    const response = await fetch('http://localhost:3001/api/download/witch-watch-episode-1-25-batch');
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testBatchAPI();
