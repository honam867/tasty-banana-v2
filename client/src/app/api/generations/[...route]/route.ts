/**
 * Generations API Proxy
 * Proxies all /api/generations/* requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/serverApi';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/generations/${route.join('/')}`;
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${path}?${searchParams}` : path;
  const token = request.headers.get('authorization') || '';

  return proxyToBackend({
    method: 'GET',
    path: fullPath,
    token,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/generations/${route.join('/')}`;
  const token = request.headers.get('authorization') || '';
  const body = await request.json();

  return proxyToBackend({
    method: 'POST',
    path,
    body,
    token,
  });
}
