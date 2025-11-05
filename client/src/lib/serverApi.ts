/**
 * Server-Side API Client
 * Used by Next.js API routes to communicate with backend
 * NOT exposed to browser - backend URL remains hidden
 */

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8090';
const BACKEND_API_TIMEOUT = parseInt(process.env.BACKEND_API_TIMEOUT || '30000');

interface ProxyRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: any;
  token?: string;
}

/**
 * Forward request to backend API
 * This runs on Next.js server, not in browser
 */
export async function proxyToBackend(options: ProxyRequestOptions): Promise<Response> {
  const { method, path, body, token } = options;

  // Construct full backend URL
  const url = `${BACKEND_API_URL}${path}`;

  console.log(`[Server Proxy] ${method} ${url}`);

  try {
    // Create headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization token if provided
    if (token) {
      headers['Authorization'] = token;
    }

    // Make request to backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_API_TIMEOUT);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Get response data
    const data = await response.json();

    console.log(`[Server Proxy] Response ${response.status}`, data);

    // Return response with same status code
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[Server Proxy Error]', error);

    // Handle timeout
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Request timeout',
        }),
        { status: 504 }
      );
    }

    // Handle network errors
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Backend service unavailable',
        error: error.message,
      }),
      { status: 503 }
    );
  }
}
