import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendSms, normalizeMobile } from '@/lib/sms';

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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayMeetings = await prisma.meeting.findMany({
      where: {
        smsSent: false,
        date: { gte: startOfToday, lt: endOfToday },
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
        location: true,
        staffPhone: true,
        customerPhone: true,
      },
    });

    const results: any[] = [];

    for (const meeting of todayMeetings) {
      let staffSent = false;
      let customerSent = false;

      if (meeting.staffPhone && normalizeMobile(meeting.staffPhone)) {
        const message = `یادآوری جلسه: جلسه${meeting.topic ? ` با موضوع «${meeting.topic}»` : ''} در تاریخ امروز برگزار می‌شود. شرکت مهندسان نوین بین`;
        const result = await sendSms(meeting.staffPhone, message, 'meeting_reminder_staff', meeting.id);
        staffSent = result.success;
      }

      if (meeting.customerPhone && normalizeMobile(meeting.customerPhone)) {
        const message = `یادآوری جلسه: جلسه${meeting.topic ? ` با موضوع «${meeting.topic}»` : ''} در تاریخ امروز برگزار می‌شود. شرکت مهندسان نوین بین`;
        const result = await sendSms(meeting.customerPhone, message, 'meeting_reminder_customer', meeting.id);
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

    return NextResponse.json({ success: true, checked: todayMeetings.length, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
