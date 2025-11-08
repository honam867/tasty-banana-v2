/**
 * Generate API Proxy
 * Proxies all /api/generate/* requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/serverApi';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8090';

async function forwardMultipart(
  request: NextRequest,
  path: string,
  token?: string
): Promise<Response> {
  const formData = await request.formData();

  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    method: 'POST',
    headers: token
      ? {
          Authorization: token,
        }
      : undefined,
    body: formData,
  });

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'application/json';

  return new Response(arrayBuffer, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
    },
  });
}

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
    return forwardMultipart(request, path, token);
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
