import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendMeetingReminderSms, normalizeMobile } from '@/lib/sms';

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
    const body = await req.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json({ error: 'شناسه جلسه الزامی است' }, { status: 400 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        topic: true,
        date: true,
        staffPhone: true,
        customerPhone: true,
        mainResponsibleId: true,
        smsSent: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'جلسه یافت نشد' }, { status: 404 });
    }

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

    let staffSent = false;
    let customerSent = false;
    const details: string[] = [];

    if (meeting.staffPhone && normalizeMobile(meeting.staffPhone)) {
      const result = await sendMeetingReminderSms(
        meeting.id,
        meeting.staffPhone,
        staffName,
        meetingTitle,
        meetingDate
      );
      staffSent = result.success;
      details.push(`پرسنل: ${result.success ? 'موفق' : 'ناموفق'}`);
    } else {
      details.push('پرسنل: شماره نامعتبر یا موجود نیست');
    }

    if (meeting.customerPhone && normalizeMobile(meeting.customerPhone)) {
      const result = await sendMeetingReminderSms(
        meeting.id,
        meeting.customerPhone,
        meeting.title || 'مشتری گرامی',
        meetingTitle,
        meetingDate
      );
      customerSent = result.success;
      details.push(`مشتری: ${result.success ? 'موفق' : 'ناموفق'}`);
    } else {
      details.push('مشتری: شماره نامعتبر یا موجود نیست');
    }

    if (staffSent || customerSent) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { smsSent: true, smsSentAt: new Date() },
      });
    }

    return NextResponse.json({
      success: staffSent || customerSent,
      staffSent,
      customerSent,
      details,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
