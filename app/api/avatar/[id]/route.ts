import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const profileId = params.id;
  if (!profileId) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const image = await prisma.profileImage.findUnique({
      where: { profileId },
      select: { data: true, mimeType: true },
    });

    if (!image || !image.data) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = Buffer.from(image.data);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Internal error', { status: 500 });
  }
}
