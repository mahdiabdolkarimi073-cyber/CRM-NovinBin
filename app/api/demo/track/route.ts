import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { demoSlug?: string; demoOrgId?: string };
    if (!decoded.demoSlug || !decoded.demoOrgId) {
      return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 403 });
    }

    const demo = await prisma.demo.findFirst({
      where: { slug: decoded.demoSlug },
      select: { id: true, orgId: true },
    });

    if (!demo) return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });

    const body = await req.json();
    const { pagePath, action, duration, metadata } = body;

    await prisma.demoActivity.create({
      data: {
        demoId: demo.id,
        orgId: demo.orgId,
        pagePath: pagePath || '',
        action: action || 'page_view',
        duration: duration || 0,
        metadata: metadata || {},
      },
    });

    await prisma.demo.update({
      where: { id: demo.id },
      data: { lastActivityAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
