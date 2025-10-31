import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Test movies API called');
  
  return NextResponse.json({
    success: true,
    message: 'Test endpoint working',
    data: {
      data: [{ id: 'test', title: 'Test Movie' }],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 1 }
    },
    timestamp: new Date().toISOString(),
  });
}
