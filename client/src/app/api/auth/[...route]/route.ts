import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/serverApi';

/**
 * Catch-all API Route Handler for Authentication
 * Proxies all /api/auth/* requests to backend server
 * 
 * Examples:
 * - POST /api/auth/login → http://localhost:8090/api/auth/login
 * - POST /api/auth/register → http://localhost:8090/api/auth/register
 * - POST /api/auth/forgot → http://localhost:8090/api/auth/forgot
 * - PUT /api/auth/password/change → http://localhost:8090/api/auth/password/change
 */

interface RouteContext {
  params: Promise<{
    route: string[];
  }>;
}

/**
 * Handle POST requests
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Get route segments from params (Next.js 15+ returns Promise)
    const { route } = await context.params;
    // Preserve /api/auth prefix when forwarding to backend
    const path = `/api/auth/${route.join('/')}`;

    // Get request body
    const body = await request.json();

    // Get authorization token from headers
    const token = request.headers.get('authorization') || undefined;

    // Proxy to backend
    return await proxyToBackend({
      method: 'POST',
      path,
      body,
      token,
    });
  } catch (error: any) {
    console.error('[API Route Error]', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
      { status: 500 }
    );
  }
}

/**
 * Handle PUT requests
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { route } = await context.params;
    // Preserve /api/auth prefix when forwarding to backend
    const path = `/api/auth/${route.join('/')}`;

    const body = await request.json();
    const token = request.headers.get('authorization') || undefined;

    return await proxyToBackend({
      method: 'PUT',
      path,
      body,
      token,
    });
  } catch (error: any) {
    console.error('[API Route Error]', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { route } = await context.params;
    // Preserve /api/auth prefix when forwarding to backend
    const path = `/api/auth/${route.join('/')}`;

    const token = request.headers.get('authorization') || undefined;

    return await proxyToBackend({
      method: 'GET',
      path,
      token,
    });
  } catch (error: any) {
    console.error('[API Route Error]', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE requests
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { route } = await context.params;
    // Preserve /api/auth prefix when forwarding to backend
    const path = `/api/auth/${route.join('/')}`;

    const token = request.headers.get('authorization') || undefined;

    return await proxyToBackend({
      method: 'DELETE',
      path,
      token,
    });
  } catch (error: any) {
    console.error('[API Route Error]', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
