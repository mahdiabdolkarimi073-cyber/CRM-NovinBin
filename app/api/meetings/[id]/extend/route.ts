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
    const { newEndTime } = await req.json();
    if (!newEndTime) {
      return NextResponse.json({ error: 'زمان پایان جدید مورد نیاز است' }, { status: 400 });
    }

    const newEnd = new Date(newEndTime);
    if (isNaN(newEnd.getTime())) {
      return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
    }

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

    const currentEnd = meeting.endTime
      ? new Date(meeting.endTime)
      : new Date(meeting.date);

    if (newEnd <= currentEnd) {
      return NextResponse.json(
        { error: 'زمان تمدید باید بیشتر از زمان فعلی پایان جلسه باشد' },
        { status: 400 }
      );
    }

    const updated = await prisma.meeting.update({
      where: { id: params.id },
      data: {
        endTime: newEnd,
        isExtended: true,
        extendedUntil: newEnd,
      },
    });

    return NextResponse.json({ meeting: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'تمدید جلسه ناموفق بود' }, { status: 500 });
  }
}
