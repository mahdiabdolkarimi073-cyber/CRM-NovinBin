import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const apiKey = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : new URL(req.url).searchParams.get('key') || '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'کلید API ارسال نشده است. از هدر Authorization با فرمت Bearer استفاده کنید.' },
        { status: 401 },
      );
    }

    const keyRecord = await (prisma as any).academyApiKey.findUnique({
      where: { apiKey },
    });

    if (!keyRecord || !keyRecord.active) {
      return NextResponse.json({ error: 'کلید API نامعتبر یا غیرفعال است' }, { status: 403 });
    }

    await (prisma as any).academyApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const courses = await (prisma as any).academyCourse.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    const data = courses.map((c: any) => ({
      id: c.id,
      title: c.title,
      code: c.code || null,
      description: c.description || null,
      teacherName: c.teacherName || null,
      level: c.level || null,
      imageUrl: c.imageUrl
        ? (c.imageUrl.startsWith('http') ? c.imageUrl : (baseUrl ? baseUrl + c.imageUrl : c.imageUrl))
        : null,
      price: Number(c.price) || 0,
      currency: 'تومان',
      startDate: c.startDate || null,
      endDate: c.endDate || null,
      link: baseUrl ? `${baseUrl}/academy/course-catalog` : `/academy/course-catalog`,
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      courses: data,
    });
  } catch {
    return NextResponse.json({ error: 'خطای سرور در دریافت دوره‌ها' }, { status: 500 });
  }
}
