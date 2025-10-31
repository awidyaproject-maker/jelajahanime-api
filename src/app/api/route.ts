import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Samehadaku REST API v1.0',
    version: '1.0.0',
    endpoints: {
      home: '/api/home',
      genres: '/api/genres',
      anime: {
        all: '/api/anime?page=1&limit=20',
        latest: '/api/latest?limit=20',
        airing: '/api/airing?page=1&limit=20',
        completed: '/api/completed?page=1&limit=20',
        popular: '/api/popular?limit=20',
        movies: '/api/movies?page=1&limit=20',
        batch: '/api/batch?page=1&limit=20',
        search: '/api/anime/search?query=naruto',
        byGenre: '/api/genre/:genreId?page=1&limit=20',
        detail: '/api/anime/:id',
        episode: '/api/episode/:episodeId',
        stream: '/api/stream?episodeId=xxx',
        download: '/api/download/:batchId',
      },
      schedule: '/api/schedule',
    },
    documentation: 'https://github.com/Y5ibfxeBxe/samehadaku-api',
  });
}