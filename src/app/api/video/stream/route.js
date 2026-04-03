import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('name');
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!fileName || !apiKey) {
    return new Response('Not found', { status: 404 });
  }

  // Security: validate file name format (files/alphanumeric)
  if (!/^files\/[a-zA-Z0-9_-]+$/.test(fileName)) {
    return new Response('Invalid file reference', { status: 400 });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}&alt=media`;
    const res = await fetch(url);

    if (!res.ok) {
      return new Response('Video not found', { status: res.status });
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Download failed', { status: 500 });
  }
}
