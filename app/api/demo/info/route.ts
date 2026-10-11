import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'slug الزامی است' }, { status: 400 });
    }

    try { slug = decodeURIComponent(slug); } catch {}

    const demo = await prisma.demo.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        companyName: true,
        status: true,
        startDate: true,
        expiryDate: true,
        durationDays: true,
        plan: true,
        modules: true,
      },
    });

    if (!demo) {
      return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });
    }

    const now = new Date();
    const isExpired = demo.status === 'expired' || now > demo.expiryDate;
    const isSuspended = demo.status === 'suspended';
    const daysRemaining = Math.max(0, Math.ceil((demo.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      ...demo,
      isExpired,
      isSuspended,
      daysRemaining,
      startDate: demo.startDate.toISOString(),
      expiryDate: demo.expiryDate.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
