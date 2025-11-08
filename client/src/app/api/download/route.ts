import { NextRequest } from 'next/server';

const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1'];
const R2_SUFFIX = '.r2.dev';

const allowedHosts = process.env.ALLOWED_DOWNLOAD_HOSTS
  ? process.env.ALLOWED_DOWNLOAD_HOSTS.split(',').map((host) => host.trim())
  : DEFAULT_ALLOWED_HOSTS;

const isAllowedHost = (url: URL) => {
  if (allowedHosts.includes(url.hostname)) return true;
  return url.hostname.endsWith(R2_SUFFIX);
};

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return new Response(
      JSON.stringify({ success: false, message: 'Missing url parameter' }),
      { status: 400 }
    );
  }

  try {
    const target = new URL(urlParam);

    if (!['https:'].includes(target.protocol) || !isAllowedHost(target)) {
      return new Response(
        JSON.stringify({ success: false, message: 'URL not allowed' }),
        { status: 400 }
      );
    }

    const response = await fetch(target.toString());
    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch file' }),
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const filename =
      request.nextUrl.searchParams.get('filename') ||
      target.pathname.split('/').pop() ||
      'download';

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
