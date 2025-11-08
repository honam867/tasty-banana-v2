/**
 * Hints API Proxy
 * Proxies all /api/hints/* requests to backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/serverApi';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/hints/${route.join('/')}`;
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
  const path = `/api/hints/${route.join('/')}`;
  const token = request.headers.get('authorization') || '';
  const body = await request.json();

  return proxyToBackend({
    method: 'POST',
    path,
    body,
    token,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/hints/${route.join('/')}`;
  const token = request.headers.get('authorization') || '';
  const body = await request.json();

  return proxyToBackend({
    method: 'PUT',
    path,
    body,
    token,
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/hints/${route.join('/')}`;
  const token = request.headers.get('authorization') || '';

  return proxyToBackend({
    method: 'DELETE',
    path,
    token,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = `/api/hints/${route.join('/')}`;
  const token = request.headers.get('authorization') || '';
  const body = await request.json();

  return proxyToBackend({
    method: 'PATCH',
    path,
    body,
    token,
  });
}
