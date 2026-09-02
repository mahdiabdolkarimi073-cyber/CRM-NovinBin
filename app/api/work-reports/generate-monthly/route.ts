import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { formatJalali } from '@/lib/format';

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

function fmtJalali(date: Date | string): string {
  return formatJalali(date);
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

    // Build the summary from daily reports
    const totalReports = dailyReports.length;
    const completed = dailyReports.filter((r) => r.status === 'completed').length;
    const inProgress = dailyReports.filter((r) => r.status === 'in_progress').length;
    const incomplete = dailyReports.filter((r) => r.status === 'incomplete').length;
    const needsFollowup = dailyReports.filter((r) => r.status === 'needs_followup').length;

    // Collect all titles and descriptions
    const reportEntries = dailyReports.map((r, idx) => {
      const date = fmtJalali(r.reportDate);
      let entry = `${idx + 1}. [${date}] ${r.title}`;
      if (r.project) entry += ` (پروژه: ${r.project})`;
      if (r.description) entry += `\n   ${r.description}`;
      if (r.details) entry += `\n   جزئیات: ${r.details}`;
      if (r.duration) entry += `\n   مدت زمان: ${r.duration}`;
      return entry;
    });

    // Group by project
    const projectGroups: Record<string, number> = {};
    for (const r of dailyReports) {
      const proj = r.project || 'عمومی';
      projectGroups[proj] = (projectGroups[proj] || 0) + 1;
    }

    const projectSummary = Object.entries(projectGroups)
      .sort((a, b) => b[1] - a[1])
      .map(([proj, count]) => `• ${proj}: ${count.toLocaleString('fa-IR')} گزارش`)
      .join('\n');

    // Build the AI-generated summary
    const dateRangeText = startDate && endDate
      ? `از ${fmtJalali(startDate)} تا ${fmtJalali(endDate)}`
      : 'تمام دوره';

    const summaryText = `گزارش کار ماهانه — ${fullName}
بازه: ${dateRangeText}

خلاصه عملکرد:
در این بازه زمانی، مجموعاً ${totalReports.toLocaleString('fa-IR')} گزارش کار روزانه ثبت شده است.
• تکمیل شده: ${completed.toLocaleString('fa-IR')}
• در حال انجام: ${inProgress.toLocaleString('fa-IR')}
• ناقص: ${incomplete.toLocaleString('fa-IR')}
• نیازمند پیگیری: ${needsFollowup.toLocaleString('fa-IR')}

پروژه‌ها و فعالیت‌ها:
${projectSummary}

شرح فعالیت‌ها:
${reportEntries.join('\n\n')}

ارزیابی کلی:
${completed === totalReports
  ? 'تمام گزارش‌ها تکمیل شده‌اند — عملکرد بسیار خوب.'
  : completed > totalReports * 0.7
  ? 'بیش از ۷۰٪ گزارش‌ها تکمیل شده‌اند — عملکرد مطلوب.'
  : completed > totalReports * 0.5
  ? 'حدود نیمی از گزارش‌ها تکمیل شده‌اند — نیاز به بهبود.'
  : 'کمتر از نیمی از گزارش‌ها تکمیل شده‌اند — نیاز به پیگیری جدی.'
}
${needsFollowup > 0 ? `${needsFollowup.toLocaleString('fa-IR')} مورد نیازمند پیگیری است.` : 'هیچ مورد نیازمند پیگیری باقی نمانده است.'}`;

    return NextResponse.json({
      success: true,
      summary: summaryText,
      reportCount: totalReports,
      fullName,
      profileId: auth.userId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'خطا در تولید گزارش' }, { status: 500 });
  }
}
