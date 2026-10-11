import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { startDate, endDate } = await req.json() as { startDate?: string; endDate?: string };

    // Fetch the logged-in user's daily reports in the given range (or all if no range)
    const where: Record<string, any> = { profileId: auth.userId };
    if (startDate && endDate) {
      where.reportDate = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).getTime() + 86399999), // end of day
      };
    }

    const dailyReports = await prisma.dailyWorkReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
    });

    if (dailyReports.length === 0) {
      return NextResponse.json({
        error: 'هیچ گزارش روزانه‌ای در این بازه زمانی یافت نشد. ابتدا گزارش روزانه ثبت کنید.',
      }, { status: 404 });
    }

    // Also fetch the user's profile for name (email lives on the related User model)
    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: {
        firstName: true,
        lastName: true,
        user: { select: { email: true } },
      },
    });

    const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'ناشناخته';

    // Only extract the "خلاصه فعالیت‌های انجام شده" field (stored as `description`)
    // from each daily report — no other fields are read or processed.
    // Preserve the text verbatim, no editing or rewriting.
    // Each entry is included separately even if duplicated across days.
    const sortedReports = [...dailyReports].sort(
      (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );

    const activityEntries = sortedReports
      .map((r) => r.description?.trim())
      .filter((text): text is string => !!text && text.length > 0);

    if (activityEntries.length === 0) {
      return NextResponse.json({
        error: 'هیچ فعالیت‌ای در گزارش‌های روزانه این بازه ثبت نشده است.',
      }, { status: 404 });
    }

    // Build a single continuous text containing all activities in order,
    // preserving the original wording exactly, with no deduplication or merging.
    const summaryText = activityEntries.join('\n');

    return NextResponse.json({
      success: true,
      summary: summaryText,
      reportCount: dailyReports.length,
      fullName,
      profileId: auth.userId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'خطا در تولید گزارش' }, { status: 500 });
  }
}
