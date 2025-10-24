# 🎌 Samehadaku REST API

REST API lengkap untuk scraping dan mendapatkan data anime dari **Samehadaku.how** dengan Next.js, TypeScript, dan Cheerio. API ini menyediakan akses ke semua fitur utama website Samehadaku dengan performa tinggi dan caching otomatis.

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Instalasi & Setup](#-instalasi--setup)
- [Konfigurasi](#-konfigurasi)
- [API Endpoints](#-api-endpoints)
- [Contoh Penggunaan](#-contoh-penggunaan)
- [Debug & Development](#-debug--development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

## ✨ Fitur Utama

### 🎯 **16 Endpoint API Lengkap**
- ✅ **Health Check** - Status API dan uptime
- ✅ **Home Data** - Anime populer, terbaru, dan sedang tayang
- ✅ **Genre System** - 25+ genre anime dengan filtering
- ✅ **Search Engine** - Pencarian anime real-time
- ✅ **Anime Details** - Metadata lengkap termasuk studios & episodes
- ✅ **Streaming Links** - Server streaming untuk setiap episode
- ✅ **Batch Downloads** - Download lengkap dengan multiple server
- ✅ **Schedule System** - Jadwal rilis mingguan
- ✅ **Debug Tools** - HTML analysis dan endpoint testing

### 🚀 **Performance & Reliability**
- ⚡ **Intelligent Caching** - Redis-like caching dengan TTL
- 🛡️ **Rate Limiting** - Protection dari IP ban
- 🔄 **Auto Retry** - Fallback mechanisms untuk failed requests
- 📊 **Error Handling** - Comprehensive error responses
- 🎯 **TypeScript** - Full type safety dan IntelliSense

### 🛠️ **Developer Experience**
- 📚 **RESTful Design** - Standar REST API patterns
- 📝 **OpenAPI Ready** - JSON responses yang konsisten
- 🐛 **Debug Endpoints** - Built-in debugging tools
- 📖 **Comprehensive Docs** - Dokumentasi lengkap dengan examples

## 📦 Persyaratan Sistem

- **Node.js**: 18.0.0 atau lebih baru
- **npm/yarn**: Package manager terbaru
- **RAM**: Minimum 512MB (recommended 1GB+)
- **Storage**: 100MB untuk dependencies
- **Network**: Stable internet connection

## 🚀 Instalasi & Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/samehadaku-api.git
cd samehadaku-api
```

### 2. Install Dependencies
```bash
npm install
# atau
yarn install
```

### 3. Environment Setup
```bash
cp .env.example .env.local
```

### 4. Jalankan Development Server
```bash
npm run dev
# atau
yarn dev
```

**Server akan berjalan di: http://localhost:3000** 🎉

### 5. Build untuk Production
```bash
npm run build
npm start
# atau
yarn build
yarn start
```

## ⚙️ Konfigurasi

### File Konfigurasi Utama

API ini menggunakan file `src/lib/config.ts` untuk semua konstanta dan konfigurasi situs. File ini memudahkan maintenance ketika situs target berubah.

#### Mengubah URL Situs Target

Jika situs Samehadaku berganti URL, cukup ubah satu tempat saja:

```typescript
// src/lib/config.ts
export const SITE_CONFIG = {
  // Ubah baris ini jika URL berubah
  BASE_URL: process.env.NEXT_PUBLIC_SAMEHADAKU_URL || 'https://baru.samehadaku.how',
  // ... konfigurasi lainnya tetap sama
} as const;
```

Atau gunakan environment variable:

```env
# .env.local
NEXT_PUBLIC_SAMEHADAKU_URL=https://baru.samehadaku.how
```

#### Konfigurasi Lengkap

```typescript
export const SITE_CONFIG = {
  // URL situs target
  BASE_URL: process.env.NEXT_PUBLIC_SAMEHADAKU_URL || 'https://v1.samehadaku.how',

  // Identitas situs
  SITE_NAME: 'Samehadaku',
  SITE_DOMAIN: 'samehadaku.how',

  // Konfigurasi API
  API_VERSION: '1.0',
  API_TIMEOUT: 30000,

  // User agents untuk menghindari blocking
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    // ... lebih banyak user agents
  ],

  // Rate limiting
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW: 60 * 1000,

  // Cache TTL untuk berbagai tipe data
  CACHE_TTL: {
    HOME: 5 * 60 * 1000,      // 5 menit
    ANIME_LIST: 10 * 60 * 1000, // 10 menit
    ANIME_DETAIL: 30 * 60 * 1000, // 30 menit
    SEARCH: 2 * 60 * 1000,    // 2 menit
    GENRES: 60 * 60 * 1000,   // 1 jam
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Kualitas video dan server
  VIDEO_QUALITIES: ['360p', '480p', '720p', '1080p'],
  DOWNLOAD_SERVERS: ['Mega.nz', 'Google Drive', 'AceFile', ...],
  STREAMING_SERVERS: ['Server 1', 'Server 2', ...]
} as const;
```

### Environment Variables

Edit file `.env.local` untuk mengatur konfigurasi:

```env
# ===========================================
# SAMEHADAKU API CONFIGURATION
# ===========================================

# Base URL Samehadaku - UBAH INI jika situs berganti URL
NEXT_PUBLIC_SAMEHADAKU_URL=https://v1.samehadaku.how

# ===========================================
# RATE LIMITING
# ===========================================

# Window waktu dalam miliseconds (default: 15 menit)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# CACHING SYSTEM
# ===========================================

# Cache TTL dalam detik (default: 1 jam)
CACHE_TTL_SECONDS=3600

# Cache untuk data statis (genre, dll) - 24 jam
CACHE_TTL_STATIC=86400

# ===========================================
# DEVELOPMENT
# ===========================================

# Environment mode
NODE_ENV=development

# API Base URL untuk client
NEXT_PUBLIC_API_URL=http://localhost:3000

# ===========================================
# ADVANCED SETTINGS
# ===========================================

# Timeout untuk HTTP requests (ms)
REQUEST_TIMEOUT=30000

# Maximum retry attempts
MAX_RETRY_ATTEMPTS=3

# Enable/disable debug logging
DEBUG_MODE=false
```

### Cara Maintenance Ketika Situs Berubah

1. **URL Berubah**: Update `NEXT_PUBLIC_SAMEHADAKU_URL` di `.env.local`
2. **Domain Berubah**: Update `SITE_DOMAIN` di `config.ts`
3. **HTML Structure Berubah**: Update selectors di scraper functions
4. **Rate Limiting**: Sesuaikan `RATE_LIMIT_*` variables
5. **Cache Settings**: Adjust `CACHE_TTL` untuk performa optimal

### Utility Functions

File `config.ts` juga menyediakan helper functions:

```typescript
import { SITE_CONFIG, getRandomUserAgent, isValidSiteUrl, buildSiteUrl } from './config';

// Mendapatkan user agent acak
const userAgent = getRandomUserAgent();

// Validasi URL termasuk domain yang benar
const isValid = isValidSiteUrl('https://samehadaku.how/anime/test');

// Build full URL dari path relatif
const fullUrl = buildSiteUrl('/anime/one-piece');
```

## 📡 API Endpoints

### 🏥 Health & Status

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2025-10-23T10:00:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

#### Endpoints Check
```http
GET /api/endpoints-check
```

**Response:**
```json
{
  "success": true,
  "results": {
    "/": { "status": "success", "thumbCount": 16 },
    "/anime/terbaru": { "status": "success", "thumbCount": 20 }
  }
}
```

### 🏠 Home & Overview

#### Home Data
```http
GET /api/home
```

**Response:**
```json
{
  "success": true,
  "data": {
    "featured": [...],
    "popular": [...],
    "latest": [...],
    "airing": [...]
  },
  "timestamp": "2025-10-23T10:00:00.000Z"
}
```

#### Explore Homepage
```http
GET /api/explore
```

**Response:**
```json
{
  "success": true,
  "path": "/",
  "structure": {
    "title": "Samehadaku - Nonton Streaming Anime Sub Indo",
    "h1": "Samehadaku - Nonton Streaming Anime Sub Indo",
    "mainNavLinks": [...],
    "thumbCount": 16
  }
}
```

### 📂 Data Collections

#### All Genres
```http
GET /api/genres
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "action", "name": "Action", "url": "/genre/action/" },
    { "id": "adventure", "name": "Adventure", "url": "/genre/adventure/" },
    { "id": "comedy", "name": "Comedy", "url": "/genre/comedy/" }
  ],
  "total": 25
}
```

#### Anime Movies
```http
GET /api/movies?page=1&limit=20
```

**Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 50)

#### Batch Downloads
```http
GET /api/batch?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "one-piece-batch-1",
      "title": "One Piece Episode 1-100 Batch",
      "image": "https://...",
      "url": "/batch/one-piece-batch-1/"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 50,
    "totalItems": 1000
  }
}
```

#### Currently Airing
```http
GET /api/airing?page=1&limit=20
```

#### Completed Anime
```http
GET /api/completed?page=1&limit=20
```

#### Popular Anime
```http
GET /api/popular?limit=20
```

#### Latest Anime
```http
GET /api/latest?limit=20
```

### 🔍 Search & Filter

#### Search Anime
```http
GET /api/anime/search?query=naruto&page=1
```

**Parameters:**
- `query` (string, required): Search keyword
- `page` (number): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "query": "naruto",
  "results": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47
  }
}
```

#### Filter by Genre
```http
GET /api/genre/{genre-slug}?page=1&limit=20
```

**Path Parameters:**
- `genre-slug`: Genre identifier (action, comedy, romance, etc.)

**Example:**
```http
GET /api/genre/action?page=1&limit=10
```

### 📋 Anime Details

#### Anime Information
```http
GET /api/anime/{anime-id}
```

**Path Parameters:**
- `anime-id`: Anime slug or ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "one-piece",
    "title": "One Piece",
    "image": "https://...",
    "synopsis": "Monkey D. Luffy...",
    "fullSynopsis": "Extended description...",
    "rating": 9.1,
    "year": 1999,
    "status": "ongoing",
    "episodes": 1100,
    "genres": ["Action", "Adventure", "Comedy"],
    "studios": ["Toei Animation"],
    "producers": ["Fuji TV", "TAP"],
    "episodesList": [
      {
        "episode": 1,
        "title": "Episode 1",
        "url": "/episode/one-piece-episode-1/",
        "date": "2025-01-01"
      }
    ],
    "url": "/anime/one-piece/"
  }
}
```

### 🎬 Streaming & Downloads

#### Episode Streaming Links
```http
GET /api/episode/{episode-id}
```

**Path Parameters:**
- `episode-id`: Episode identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "episodeId": "one-piece-episode-1",
    "title": "One Piece Episode 1",
    "animeTitle": "One Piece",
    "animeId": "one-piece",
    "episodeNumber": 1,
    "servers": [
      {
        "name": "Server 1 (720p)",
        "url": "https://streaming-server.com/embed/xxx"
      }
    ]
  }
}
```

#### Streaming Servers (Alternative)
```http
GET /api/stream?episodeId={episode-id}
```

**Query Parameters:**
- `episodeId` (string, required): Episode identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "episodeId": "one-piece-episode-1",
    "servers": [
      {
        "name": "Server 1 (480p)",
        "url": "https://server1.com/embed/xxx",
        "type": "video"
      },
      {
        "name": "Server 2 (720p)",
        "url": "https://server2.com/embed/xxx",
        "type": "video"
      }
    ]
  }
}
```

#### Batch Download Links
```http
GET /api/download/{batch-id}
```

**Path Parameters:**
- `batch-id`: Batch download identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "one-piece-batch-1",
    "title": "One Piece Episode 1-100 Batch",
    "episodes": 100,
    "size": "25GB",
    "quality": "1080p",
    "servers": [
      {
        "name": "AceFile",
        "link": "https://acefile.co/f/xxxxx/One-Piece-Batch-1080p.rar",
        "speed": "Fast"
      },
      {
        "name": "BayFiles",
        "link": "https://bayfiles.com/xxxxx/One-Piece-Batch-1080p.rar",
        "speed": "Fast"
      },
      {
        "name": "LetsUpload",
        "link": "https://letsupload.io/xxxxx/One-Piece-Batch-1080p.rar",
        "speed": "Fast"
      }
    ]
  }
}
```

### 📅 Schedule

#### Weekly Schedule
```http
GET /api/schedule
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monday": [...],
    "tuesday": [...],
    "wednesday": [...],
    "thursday": [...],
    "friday": [...],
    "saturday": [...],
    "sunday": [...]
  }
}
```

## 🔧 Debug & Development

### Debug Endpoints

#### Raw HTML Debug
```http
GET /api/debug
```

**Response:**
```json
{
  "success": true,
  "message": "Raw HTML response from Samehadaku",
  "htmlLength": 86636,
  "htmlPreview": "<!DOCTYPE html>...",
  "contentType": "string"
}
```

#### Batch HTML Analysis
```http
GET /api/debug-batch
```

**Response:**
```json
{
  "success": true,
  "message": "Debug info for batch pages",
  "counts": {
    "downloadLinks": 30,
    "allLinks": 35,
    "infoElements": 40
  },
  "data": {
    "downloadLinks": [...],
    "allLinks": [...]
  }
}
```

#### Deep HTML Analysis
```http
GET /api/explore-deep
```

**Response:**
```json
{
  "success": true,
  "path": "/?s=one",
  "analysis": {
    "selectors": { "anime-item": 0, "anime-card": 0 },
    "sectionSelectors": { ".featured": 0 },
    "sampleElements": { "allClasses": [...] }
  }
}
```

#### HTML Inspection
```http
GET /api/inspect
```

**Response:**
```json
{
  "success": true,
  "details": {
    "thumbElements": [...],
    "firstArticle": "...",
    "imageLinks": [...],
    "mainContent": [...]
  }
}
```

#### Selector Analysis
```http
GET /api/analyze
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "selectors": { "anime-item": 0, ".thumb": 16 },
    "sectionSelectors": { ".featured": 0 },
    "sampleElements": { "allClasses": [...] }
  }
}
```

## 💻 Contoh Penggunaan

### JavaScript/Node.js

```javascript
const API_BASE = 'http://localhost:3000/api';

// Health check
const health = await fetch(`${API_BASE}/health`);
const healthData = await health.json();

// Search anime
const search = await fetch(`${API_BASE}/anime/search?query=naruto`);
const searchData = await search.json();

// Get anime details
const anime = await fetch(`${API_BASE}/anime/one-piece`);
const animeData = await anime.json();

// Get streaming links
const stream = await fetch(`${API_BASE}/stream?episodeId=one-piece-episode-1`);
const streamData = await stream.json();

// Get batch download
const download = await fetch(`${API_BASE}/download/one-piece-batch-1`);
const downloadData = await download.json();
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000/api'

# Health check
response = requests.get(f'{API_BASE}/health')
print(response.json())

# Search anime
response = requests.get(f'{API_BASE}/anime/search', params={'query': 'naruto'})
print(response.json())

# Get anime details
response = requests.get(f'{API_BASE}/anime/one-piece')
anime_data = response.json()

# Get streaming servers
response = requests.get(f'{API_BASE}/stream', params={'episodeId': 'one-piece-episode-1'})
stream_data = response.json()
```

### cURL Examples

```bash
# Health check
curl -s http://localhost:3000/api/health | jq .

# Search anime
curl -s "http://localhost:3000/api/anime/search?query=naruto" | jq .

# Get anime details
curl -s http://localhost:3000/api/anime/one-piece | jq .

# Get streaming links
curl -s "http://localhost:3000/api/stream?episodeId=one-piece-episode-1" | jq .

# Get batch download
curl -s http://localhost:3000/api/download/one-piece-batch-1 | jq .
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Set Environment Variables**
```bash
vercel env add NODE_ENV
vercel env add CACHE_TTL_SECONDS
```

### Railway

1. **Push ke GitHub**
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

2. **Connect Repository**
   - Buka Railway.app
   - Connect GitHub repository
   - Deploy otomatis

### Render

1. **Push ke GitHub**
2. **Create New Web Service**
   - Pilih repository
   - Set build command: `npm run build`
   - Set start command: `npm start`
   - Add environment variables

### VPS/Digital Ocean

```bash
# Install PM2
npm install -g pm2

# Build aplikasi
npm run build

# Start dengan PM2
pm2 start "npm start" --name samehadaku-api

# Setup nginx (optional)
sudo apt install nginx
# Configure nginx reverse proxy
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t samehadaku-api .
docker run -p 3000:3000 samehadaku-api
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Rate Limiting
```
Error: Too many requests
```
**Solution:** Increase `RATE_LIMIT_MAX_REQUESTS` atau implementasi delay

#### 2. Cache Issues
```
Data tidak update
```
**Solution:** Clear cache atau kurangi `CACHE_TTL_SECONDS`

#### 3. Empty Responses
```
Response: { "data": [] }
```
**Solution:** Check endpoint URL atau website structure changes

#### 4. CORS Issues
```
Access-Control-Allow-Origin error
```
**Solution:** Add CORS headers atau gunakan proxy

### Debug Steps

1. **Check API Health**
```bash
curl http://localhost:3000/api/health
```

2. **Test Endpoint**
```bash
curl http://localhost:3000/api/debug
```

3. **Check Logs**
```bash
npm run dev  # Development mode
# Check console untuk error messages
```

4. **Clear Cache**
```javascript
// Di browser console
localStorage.clear();
// Atau restart server
```

### Performance Tuning

```env
# Increase cache TTL
CACHE_TTL_SECONDS=7200  # 2 hours

# Reduce rate limiting
RATE_LIMIT_MAX_REQUESTS=200

# Enable compression
ENABLE_COMPRESSION=true
```

## 📊 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-10-23T10:00:00.000Z",
  "cached": false
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-23T10:00:00.000Z"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🤝 Kontribusi

Kontribusi sangat welcome! 🚀

### Cara Berkontribusi

1. **Fork** repository ini
2. **Create** feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** ke branch (`git push origin feature/AmazingFeature`)
5. **Open** Pull Request

### Development Guidelines

- ✅ Gunakan TypeScript untuk type safety
- ✅ Implementasi proper error handling
- ✅ Add unit tests untuk fitur baru
- ✅ Update dokumentasi
- ✅ Follow existing code style
- ✅ Test di multiple environments

### Bug Reports

Gunakan GitHub Issues untuk melaporkan bugs:

```
Title: [BUG] Endpoint /api/anime returns empty data

Description:
Steps to reproduce:
1. Call GET /api/anime
2. Response is empty array

Expected behavior:
Should return anime list

Environment:
- OS: Windows 11
- Node.js: 18.17.0
- API Version: 1.0.0
```

## 📄 Lisensi

```
MIT License

Copyright (c) 2025 Samehadaku API

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## ⚠️ Disclaimer

- 📚 **Educational Purpose**: API ini dibuat untuk keperluan edukasi dan pembelajaran
- 🔒 **Respect Terms of Service**: Selalu hormati Terms of Service website asli
- 🚫 **No Illegal Use**: Dilarang menggunakan untuk aktivitas ilegal
- 📊 **Rate Limiting**: Implementasikan rate limiting untuk menghindari ban
- 🔄 **Data Accuracy**: Data dapat berubah sesuai dengan website asli

## 🙏 Acknowledgments

- **Samehadaku** - Sumber data anime
- **Next.js** - React framework
- **Cheerio** - HTML parsing
- **TypeScript** - Type safety
- **Vercel** - Hosting platform

---

**Made with ❤️ for anime lovers worldwide**

🌟 **Star this repo if you find it useful!**

📧 **Contact**: [your-email@example.com]
🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/samehadaku-api/issues)
📖 **Documentation**: [GitHub Wiki](https://github.com/yourusername/samehadaku-api/wiki)