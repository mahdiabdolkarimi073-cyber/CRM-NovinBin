import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendMeetingReminderSms, sendExpiryReminder, normalizeMobile } from '@/lib/sms';

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
    const now = new Date();
    const windowStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

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
    console.log('[MEETING SMS] جلسات نزدیک به زمان (۲ ساعت):', upcomingMeetings.length);

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
