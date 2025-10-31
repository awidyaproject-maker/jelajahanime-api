'use client';

import { useState, useEffect } from 'react';

interface EndpointData {
  version?: string;
}

interface TestResult {
  endpoint: string;
  data?: unknown;
  error?: string;
  status: number | 'error';
}

export default function Home() {
  const [endpoints, setEndpoints] = useState<EndpointData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api')
      .then(res => res.json())
      .then(data => setEndpoints(data));
  }, []);

  const testEndpoint = async (endpoint: string) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setTestResult({ endpoint, data, status: response.status });
    } catch (error) {
      setTestResult({ endpoint, error: error instanceof Error ? error.message : 'Unknown error', status: 'error' });
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'system-ui', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px 30px',
          borderRadius: '12px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em' }}>🎌 Samehadaku REST API</h1>
          <p style={{ margin: '0', fontSize: '18px', opacity: 0.9 }}>
            REST API Lengkap untuk Scraping Data Anime dari Samehadaku.how
          </p>
          <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
            <span>🚀 Next.js</span> • <span>⚡ TypeScript</span> • <span>🎯 16 Endpoints</span> • <span>💾 Intelligent Caching</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '5px',
          marginBottom: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'endpoints', label: 'Endpoints', icon: '📡' },
            { id: 'examples', label: 'Examples', icon: '💻' },
            { id: 'test', label: 'Test API', icon: '🧪' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#666',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>✅ Status API</h3>
                <p style={{ margin: '0', color: '#666' }}>
                  API berjalan dengan baik dan siap digunakan untuk production
                </p>
                <div style={{ marginTop: '15px' }}>
                  <span style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    ONLINE
                  </span>
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}>📊 Statistics</h3>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
                  <li>16 Endpoints Lengkap</li>
                  <li>25+ Genre Anime</li>
                  <li>Intelligent Caching</li>
                  <li>Rate Limiting Protection</li>
                </ul>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#6f42c1' }}>🚀 Quick Start</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#666' }}>
                  <div>npm install</div>
                  <div>npm run dev</div>
                  <div style={{ marginTop: '10px', color: '#007bff' }}>
                    Server: http://localhost:3000
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 20px 0' }}>🎯 Fitur Utama</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>📚 Data Lengkap</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', lineHeight: '1.6' }}>
                    <li>Detail anime lengkap</li>
                    <li>Studios & producers</li>
                    <li>Genre classification</li>
                    <li>Episode listings</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>🎬 Streaming & Download</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', lineHeight: '1.6' }}>
                    <li>Multiple streaming servers</li>
                    <li>Batch download links</li>
                    <li>Quality options (360p-1080p)</li>
                    <li>AceFile, BayFiles, LetsUpload</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>🔍 Advanced Search</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', lineHeight: '1.6' }}>
                    <li>Real-time search</li>
                    <li>Genre filtering</li>
                    <li>Pagination support</li>
                    <li>Weekly schedule</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div>
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h3>📡 API Endpoints Lengkap</h3>
              <p style={{ color: '#666', margin: '10px 0 20px 0' }}>
                Semua endpoint menggunakan RESTful design dengan response JSON yang konsisten
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '20px'
            }}>

              {/* Core Endpoints */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#007bff' }}>🎯 Core Endpoints</h4>
                <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                  {[
                    { method: 'GET', path: '/api/health', desc: 'Status API & uptime' },
                    { method: 'GET', path: '/api/endpoints-check', desc: 'Check endpoint availability' },
                    { method: 'GET', path: '/api/home', desc: 'Homepage data' },
                    { method: 'GET', path: '/api/genres', desc: 'All anime genres' }
                  ].map(endpoint => (
                    <li key={endpoint.path} style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <code style={{
                          backgroundColor: '#f8f9fa',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          color: '#007bff',
                          marginRight: '8px'
                        }}>{endpoint.method}</code>
                        <code style={{ fontFamily: 'monospace', color: '#333' }}>{endpoint.path}</code>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{endpoint.desc}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`http://localhost:3000${endpoint.path}`)}
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Anime Data */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}>🎬 Anime Data</h4>
                <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                  {[
                    { method: 'GET', path: '/api/anime', desc: 'All anime (paginated)' },
                    { method: 'GET', path: '/api/anime/:id', desc: 'Anime details' },
                    { method: 'GET', path: '/api/anime/search?query=naruto', desc: 'Search anime' },
                    { method: 'GET', path: '/api/latest', desc: 'Latest anime' },
                    { method: 'GET', path: '/api/airing', desc: 'Currently airing' },
                    { method: 'GET', path: '/api/completed', desc: 'Completed anime' },
                    { method: 'GET', path: '/api/popular', desc: 'Popular anime' },
                    { method: 'GET', path: '/api/movies', desc: 'Anime movies' },
                    { method: 'GET', path: '/api/batch', desc: 'Batch downloads' }
                  ].map(endpoint => (
                    <li key={endpoint.path} style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <code style={{
                          backgroundColor: '#f8f9fa',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          color: '#28a745',
                          marginRight: '8px'
                        }}>{endpoint.method}</code>
                        <code style={{ fontFamily: 'monospace', color: '#333' }}>{endpoint.path}</code>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{endpoint.desc}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`http://localhost:3000${endpoint.path}`)}
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Streaming & Download */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#6f42c1' }}>🎥 Streaming & Download</h4>
                <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                  {[
                    { method: 'GET', path: '/api/episode/:episodeId', desc: 'Episode details' },
                    { method: 'GET', path: '/api/stream?episodeId=xxx', desc: 'Streaming servers' },
                    { method: 'GET', path: '/api/download/:batchId', desc: 'Batch download links' }
                  ].map(endpoint => (
                    <li key={endpoint.path} style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <code style={{
                          backgroundColor: '#f8f9fa',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          color: '#6f42c1',
                          marginRight: '8px'
                        }}>{endpoint.method}</code>
                        <code style={{ fontFamily: 'monospace', color: '#333' }}>{endpoint.path}</code>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{endpoint.desc}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`http://localhost:3000${endpoint.path}`)}
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Debug & Development */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#fd7e14' }}>🔧 Debug & Development</h4>
                <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                  {[
                    { method: 'GET', path: '/api/debug', desc: 'Raw HTML response' },
                    { method: 'GET', path: '/api/debug-batch', desc: 'Batch page analysis' },
                    { method: 'GET', path: '/api/explore', desc: 'Homepage structure' },
                    { method: 'GET', path: '/api/explore-deep', desc: 'Deep HTML analysis' },
                    { method: 'GET', path: '/api/inspect', desc: 'HTML inspection' },
                    { method: 'GET', path: '/api/analyze', desc: 'Selector analysis' }
                  ].map(endpoint => (
                    <li key={endpoint.path} style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <code style={{
                          backgroundColor: '#f8f9fa',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          color: '#fd7e14',
                          marginRight: '8px'
                        }}>{endpoint.method}</code>
                        <code style={{ fontFamily: 'monospace', color: '#333' }}>{endpoint.path}</code>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{endpoint.desc}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`http://localhost:3000${endpoint.path}`)}
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div>
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h3>💻 Code Examples</h3>
              <p style={{ color: '#666', margin: '10px 0 20px 0' }}>
                Contoh penggunaan API dalam berbagai bahasa pemrograman
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '20px'
            }}>

              {/* JavaScript */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#f7df1e' }}>🟨 JavaScript/Node.js</h4>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  overflow: 'auto',
                  margin: '0'
                }}><code>{`// Health Check
const health = await fetch('/api/health');
const healthData = await health.json();

// Search Anime
const search = await fetch('/api/anime/search?query=naruto');
const searchData = await search.json();

// Get Anime Details
const anime = await fetch('/api/anime/one-piece');
const animeData = await anime.json();

// Get Streaming Links
const stream = await fetch('/api/stream?episodeId=one-piece-episode-1');
const streamData = await stream.json();

// Get Batch Download
const download = await fetch('/api/download/one-piece-batch-1');
const downloadData = await download.json();`}</code></pre>
              </div>

              {/* Python */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#3776ab' }}>🐍 Python</h4>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  overflow: 'auto',
                  margin: '0'
                }}><code>{`import requests

API_BASE = 'http://localhost:3000/api'

# Health Check
response = requests.get(f'{API_BASE}/health')
print(response.json())

# Search Anime
response = requests.get(f'{API_BASE}/anime/search',
                       params={'query': 'naruto'})
print(response.json())

# Get Anime Details
response = requests.get(f'{API_BASE}/anime/one-piece')
anime_data = response.json()

# Get Streaming Servers
response = requests.get(f'{API_BASE}/stream',
                       params={'episodeId': 'one-piece-episode-1'})
stream_data = response.json()`}</code></pre>
              </div>

              {/* cURL */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#000' }}>💻 cURL</h4>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  overflow: 'auto',
                  margin: '0'
                }}><code>{`# Health Check
curl -s http://localhost:3000/api/health

# Search Anime
curl -s "http://localhost:3000/api/anime/search?query=naruto"

# Get Anime Details
curl -s http://localhost:3000/api/anime/one-piece

# Get Streaming Links
curl -s "http://localhost:3000/api/stream?episodeId=one-piece-episode-1"

# Get Batch Download
curl -s http://localhost:3000/api/download/one-piece-batch-1`}</code></pre>
              </div>

              {/* Response Format */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}>📋 Response Format</h4>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto',
                  margin: '0'
                }}><code>{`// Success Response
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-10-23T10:00:00.000Z"
}

// Error Response
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-10-23T10:00:00.000Z"
}

// Pagination Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200
  }
}`}</code></pre>
              </div>
            </div>
          </div>
        )}

        {/* Test API Tab */}
        {activeTab === 'test' && (
          <div>
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h3>🧪 Test API Endpoints</h3>
              <p style={{ color: '#666', margin: '10px 0 20px 0' }}>
                Test endpoint secara langsung untuk memastikan API berfungsi dengan baik
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {[
                { name: 'Health Check', endpoint: '/api/health', desc: 'Status API' },
                { name: 'Endpoints Check', endpoint: '/api/endpoints-check', desc: 'Check endpoint availability' },
                { name: 'Home Data', endpoint: '/api/home', desc: 'Homepage data' },
                { name: 'All Genres', endpoint: '/api/genres', desc: 'Daftar genre' },
                { name: 'All Anime', endpoint: '/api/anime', desc: 'Anime lengkap (paginated)' },
                { name: 'Search Anime', endpoint: '/api/anime/search?query=naruto', desc: 'Cari anime' },
                { name: 'Latest Anime', endpoint: '/api/latest', desc: 'Anime terbaru' },
                { name: 'Airing Anime', endpoint: '/api/airing', desc: 'Sedang tayang' },
                { name: 'Completed Anime', endpoint: '/api/completed', desc: 'Anime selesai' },
                { name: 'Popular Anime', endpoint: '/api/popular', desc: 'Anime populer' },
                { name: 'Anime Movies', endpoint: '/api/movies', desc: 'Anime movie' },
                { name: 'Test Movies', endpoint: '/api/test-movies', desc: 'Test anime movies' },
                { name: 'Batch Downloads', endpoint: '/api/batch', desc: 'Batch anime' },
                { name: 'Weekly Schedule', endpoint: '/api/schedule', desc: 'Jadwal mingguan' },
                { name: 'Streaming Servers', endpoint: '/api/stream?episodeId=test-episode', desc: 'Server streaming' },
                { name: 'Debug Raw HTML', endpoint: '/api/debug', desc: 'Raw HTML response' },
                { name: 'Debug Anime', endpoint: '/api/debug-anime', desc: 'Debug anime page' },
                { name: 'Debug Batch', endpoint: '/api/debug-batch', desc: 'Debug batch page' },
                { name: 'Debug Episode', endpoint: '/api/debug-episode', desc: 'Debug episode page' },
                { name: 'Explore Homepage', endpoint: '/api/explore', desc: 'Struktur homepage' },
                { name: 'Deep Analysis', endpoint: '/api/explore-deep', desc: 'Analisis HTML mendalam' },
                { name: 'HTML Inspection', endpoint: '/api/inspect', desc: 'Inspeksi HTML' },
                { name: 'Selector Analysis', endpoint: '/api/analyze', desc: 'Analisis selector' }
              ].map(test => (
                <div key={test.endpoint} style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>{test.name}</h4>
                  <p style={{ color: '#666', margin: '0 0 15px 0', fontSize: '14px' }}>{test.desc}</p>
                  <button
                    onClick={() => testEndpoint(test.endpoint)}
                    disabled={loading}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      width: '100%'
                    }}
                  >
                    {loading ? '⏳ Testing...' : '🚀 Test Endpoint'}
                  </button>
                </div>
              ))}
            </div>

            {testResult && (
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 15px 0' }}>📊 Test Result</h4>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Endpoint:</strong> <code>{testResult.endpoint}</code>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Status:</strong>
                  <span style={{
                    backgroundColor: testResult.status === 200 ? '#28a745' : '#dc3545',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginLeft: '8px'
                  }}>
                    {testResult.status}
                  </span>
                </div>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '300px',
                  margin: '0'
                }}>
                  {JSON.stringify(testResult.data || testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>📚 Dokumentasi & Resources</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>📖 Documentation</h4>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                Dokumentasi lengkap API endpoints, parameters, dan examples
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>🐛 Debug Tools</h4>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                Built-in debugging tools untuk development dan troubleshooting
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>🚀 Deployment</h4>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                Panduan deployment ke Vercel, Railway, Render, dan VPS
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff3e0',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: '4px solid #f57c00',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>⚠️ Important Notes</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', textAlign: 'left', display: 'inline-block' }}>
              <li>API ini untuk keperluan edukatif/pembelajaran</li>
              <li>Implementasikan rate limiting untuk menghindari ban</li>
              <li>Gunakan caching untuk performa optimal</li>
              <li>Periksa Terms of Service website asli</li>
            </ul>
          </div>

          <div style={{
            borderTop: '1px solid #eee',
            paddingTop: '20px',
            color: '#999'
          }}>
            <p style={{ margin: '0 0 10px 0' }}>
              Made with ❤️ for anime lovers worldwide
            </p>
            <p style={{ margin: '0', fontSize: '14px' }}>
              🎌 Samehadaku REST API • Version {endpoints?.version || '1.0.0'} • Built with Next.js & TypeScript
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
