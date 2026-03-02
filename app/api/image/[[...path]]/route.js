import { NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

/** Build backend image base: API_BASE may be "http://localhost:5000" or "http://localhost:5000/api/v1" */
function getBackendImageBase() {
  if (API_BASE.endsWith('/api/v1')) {
    return `${API_BASE}/image`;
  }
  return `${API_BASE}/api/v1/image`;
}

/**
 * Proxy image requests to the backend (same-origin, no CORS).
 * GET /api/image/logo/filename.png → fetches {API_BASE}/api/v1/image/logo/filename.png (or {API_BASE}/image/... if API_BASE already has /api/v1)
 */
export async function GET(request, { params }) {
  const pathSegments = params.path;
  if (!pathSegments?.length) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const path = pathSegments.join('/');
  const backendUrl = `${getBackendImageBase()}/${path}`;

  try {
    const res = await fetch(backendUrl, {
      method: 'GET',
      headers: { Accept: 'image/*' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Image not found', status: res.status },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err) {
    console.error('[api/image] proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 502 }
    );
  }
}
