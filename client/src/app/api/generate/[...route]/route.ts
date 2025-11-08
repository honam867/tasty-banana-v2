/**
 * Generate API Proxy
 * Proxies all /api/generate/* requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/serverApi';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/generate/${route.join('/')}`;
  const token = request.headers.get('authorization') || '';
  
  // Check if content-type is multipart (for image uploads)
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    // For multipart, we need to forward the FormData
    // This is more complex - for now, return an error
    return NextResponse.json(
      { 
        success: false, 
        message: 'Multipart uploads should use direct backend connection' 
      },
      { status: 501 }
    );
  }

  const body = await request.json();

  return proxyToBackend({
    method: 'POST',
    path,
    body,
    token,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/generate/${route.join('/')}`;
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${path}?${searchParams}` : path;
  const token = request.headers.get('authorization') || '';

  return proxyToBackend({
    method: 'GET',
    path: fullPath,
    token,
  });
}
