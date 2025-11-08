import { NextRequest, NextResponse } from 'next/server';

/**
 * Token API Proxy
 * Forwards all /api/tokens/* requests to backend
 * 
 * Example:
 * GET /api/tokens/balance → http://localhost:8090/api/tokens/balance
 * GET /api/tokens/history → http://localhost:8090/api/tokens/history
 */

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8090';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeSegments } = await params;
    const route = routeSegments.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/tokens/${route}${searchParams ? `?${searchParams}` : ''}`;

    // Get authorization header
    const authHeader = request.headers.get('authorization');

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Token API Proxy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to communicate with backend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route: routeSegments } = await params;
    const route = routeSegments.join('/');
    const backendUrl = `${BACKEND_URL}/api/tokens/${route}`;
    const body = await request.json();

    // Get authorization header
    const authHeader = request.headers.get('authorization');

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Token API Proxy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to communicate with backend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
