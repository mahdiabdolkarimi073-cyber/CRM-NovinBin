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

function isSuperAdmin(role: string): boolean {
  return role === 'owner' || role === 'super_admin';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      newDate,
      newEndTime,
      title,
      topic,
      location,
      onlineLink,
      agenda,
      staffPhone,
      customerPhone,
    } = body;

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: { assignments: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'جلسه یافت نشد' }, { status: 404 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    const canExtend =
      isSuperAdmin(profile?.role || '') ||
      meeting.assignments.some((a) => a.assignedTo === auth.userId);

    if (!canExtend) {
      return NextResponse.json({ error: 'دسترسی تمدید این جلسه را ندارید' }, { status: 403 });
    }

    const originalDate = new Date(meeting.date);

    let parsedDate: Date | undefined;
    if (newDate) {
      parsedDate = new Date(newDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
      }
      if (parsedDate < originalDate) {
        return NextResponse.json(
          { error: 'تاریخ تمدید نمی‌تواند قبل از تاریخ ثبت اولیه جلسه باشد' },
          { status: 400 }
        );
      }
    }

    let parsedEndTime: Date | undefined;
    if (newEndTime) {
      parsedEndTime = new Date(newEndTime);
      if (isNaN(parsedEndTime.getTime())) {
        return NextResponse.json({ error: 'زمان پایان نامعتبر است' }, { status: 400 });
      }
      const currentEnd = meeting.endTime ? new Date(meeting.endTime) : new Date(meeting.date);
      if (parsedEndTime <= currentEnd) {
        return NextResponse.json(
          { error: 'زمان تمدید باید بیشتر از زمان فعلی پایان جلسه باشد' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, any> = { isExtended: true };
    if (parsedDate) updateData.date = parsedDate;
    if (parsedEndTime) {
      updateData.endTime = parsedEndTime;
      updateData.extendedUntil = parsedEndTime;
    }
    if (title !== undefined) updateData.title = title;
    if (topic !== undefined) updateData.topic = topic || null;
    if (location !== undefined) updateData.location = location || null;
    if (onlineLink !== undefined) updateData.onlineLink = onlineLink || null;
    if (agenda !== undefined) updateData.agenda = agenda || null;
    if (staffPhone !== undefined) updateData.staffPhone = staffPhone || null;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone || null;

    const updated = await prisma.meeting.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ meeting: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'تمدید جلسه ناموفق بود' }, { status: 500 });
  }
}
