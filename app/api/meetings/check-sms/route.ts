import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendMeetingReminderSms, sendExpiryReminder, normalizeMobile } from '@/lib/sms';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// 2 hours in milliseconds
const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;

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
    const now = new Date();

    // --- Diagnostic: find ALL unsent meetings with phone numbers ---
    const allUnsentMeetings = await prisma.meeting.findMany({
      where: {
        smsSent: false,
        OR: [
          { staffPhone: { not: null } },
          { customerPhone: { not: null } },
        ],
      },
      select: {
        id: true,
        title: true,
        date: true,
        staffPhone: true,
        customerPhone: true,
        smsSent: true,
      },
      orderBy: { date: 'asc' },
      take: 20,
    });

    console.log('[MEETING SMS] === شروع بررسی ===');
    console.log('[MEETING SMS] زمان فعلی سرور (UTC):', now.toISOString());
    console.log('[MEETING SMS] کل جلسات ارسال‌نشده با شماره تلفن:', allUnsentMeetings.length);
    for (const m of allUnsentMeetings) {
      const diffMs = new Date(m.date).getTime() - now.getTime();
      const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);
      console.log(`[MEETING SMS]   - جلسه "${m.title}" | تاریخ: ${new Date(m.date).toISOString()} | اختلاف: ${diffHours} ساعت | پرسنل: ${m.staffPhone || '—'} | مشتری: ${m.customerPhone || '—'}`);
    }

    // --- Meeting reminder SMS ---
    // Window: meeting date is between [now - 2h, now + 2h]
    // - Forward: meeting is within the next 2 hours → send reminder
    // - Backward: meeting was up to 2 hours ago but SMS wasn't sent → send it now (catch-up)
    // This ensures SMS is sent even if the dashboard wasn't checked at the exact 2-hour mark.
    const windowStart = new Date(now.getTime() - REMINDER_WINDOW_MS);
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        smsSent: false,
        date: { gte: windowStart, lte: windowEnd },
        OR: [
          { staffPhone: { not: null } },
          { customerPhone: { not: null } },
        ],
      },
      select: {
        id: true,
        title: true,
        topic: true,
        date: true,
        staffPhone: true,
        customerPhone: true,
        mainResponsibleId: true,
      },
    });

    const results: any[] = [];
    console.log('[MEETING SMS] پنجره جستجو:', {
      from: windowStart.toISOString(),
      to: windowEnd.toISOString(),
      پیدا_شد: upcomingMeetings.length,
    });

    for (const meeting of upcomingMeetings) {
      let staffSent = false;
      let customerSent = false;
      const meetingTitle = meeting.topic || meeting.title || 'جلسه';
      const meetingDate = new Date(meeting.date);

      let responsibleProfile: any = null;
      if (meeting.mainResponsibleId) {
        responsibleProfile = await prisma.profile.findUnique({
          where: { id: meeting.mainResponsibleId },
          select: { firstName: true, lastName: true },
        });
      }

      const staffName = responsibleProfile
        ? `${responsibleProfile.firstName || ''} ${responsibleProfile.lastName || ''}`.trim()
        : 'کاربر گرامی';

      if (meeting.staffPhone && normalizeMobile(meeting.staffPhone)) {
        console.log('[MEETING SMS] ارسال به پرسنل:', meeting.staffPhone);
        const result = await sendMeetingReminderSms(
          meeting.id,
          meeting.staffPhone,
          staffName,
          meetingTitle,
          meetingDate
        );
        staffSent = result.success;
      }

      if (meeting.customerPhone && normalizeMobile(meeting.customerPhone)) {
        console.log('[MEETING SMS] ارسال به مشتری:', meeting.customerPhone);
        const result = await sendMeetingReminderSms(
          meeting.id,
          meeting.customerPhone,
          meeting.title || 'مشتری گرامی',
          meetingTitle,
          meetingDate
        );
        customerSent = result.success;
      }

      if (staffSent || customerSent) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { smsSent: true, smsSentAt: new Date() },
        });
      }

      results.push({
        id: meeting.id,
        title: meeting.title,
        staffSent,
        customerSent,
      });
    }

    // --- بررسی انقضای هاست/دامنه (یادآوری یک هفته‌مانده) ---
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueHosts = await prisma.hostDomain.findMany({
      where: {
        smsSent: false,
        expiryDate: { lte: oneWeekLater, gte: now },
      },
    });
    console.log('[RENEWAL SMS] تعداد هاست/دامنه‌های نیازمند تمدید:', dueHosts.length);
    for (const hd of dueHosts) {
      const result = await sendExpiryReminder(hd.id, hd.phoneNumber, hd.firstName, hd.lastName);
      console.log('[RENEWAL SMS] نتیجه ارسال:', result);
      if (result.success) {
        await prisma.hostDomain.update({
          where: { id: hd.id },
          data: { smsSent: true, smsSentAt: new Date() },
        });
      }
    }

    return NextResponse.json({ success: true, checked: upcomingMeetings.length, results });
  } catch (error: any) {
    console.error('[MEETING SMS] خطا:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
