import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) {
      console.log('[admin-dashboard] NO TOKEN cookie found');
      return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    }
    let payload: { academyUserId: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    } catch (verifyErr) {
      console.error('[admin-dashboard] JWT VERIFY FAILED', verifyErr.message, { tokenPreview: token.slice(0, 20) + '...' });
      return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    }
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) {
      console.log('[admin-dashboard] ACCOUNT NOT FOUND OR INACTIVE', { id: payload.academyUserId, found: !!account, active: account?.active });
      return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });
    }
    if (account.role !== 'AdminAcademy') {
      console.log('[admin-dashboard] WRONG ROLE', { role: account.role });
      return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
    }
    console.log('[admin-dashboard] AUTH OK', { userId: account.id, role: account.role });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [students, teachers, leads, newRegistrations, enrollments, todaySessions, installments, courses] = await Promise.all([
      (prisma as any).academyUser.count({ where: { role: 'student', active: true } }),
      (prisma as any).academyUser.count({ where: { role: 'teacher', active: true } }),
      (prisma as any).academyRegistrationRequest.count({ where: { status: 'pending' } }),
      (prisma as any).academyUser.count({ where: { role: 'student', createdAt: { gte: startOfMonth } } }),
      (prisma as any).academyCourseEnrollment.findMany({ where: { status: 'active' } }),
      (prisma as any).academyClassSession.findMany({ where: { startsAt: { gte: startOfDay, lt: endOfDay } }, orderBy: { startsAt: 'asc' } }),
      (prisma as any).academyInstallment.findMany({ where: { status: { in: ['pending', 'overdue'] } } }),
      (prisma as any).academyCourse.findMany({ where: { active: true } }),
    ]);

    const monthRevenue = enrollments
      .filter((e: any) => new Date(e.createdAt) >= startOfMonth)
      .reduce((sum: number, e: any) => sum + Number(e.paid), 0);

    const totalDebt = enrollments.reduce((sum: number, e: any) => sum + (Number(e.fee) - Number(e.paid)), 0);

    const todayAbsences = todaySessions.filter((s: any) => s.status === 'absent').length;

    const courseCapacity = courses.reduce((sum: number, c: any) => sum + (c.capacity || 0), 0);
    const enrolledCount = enrollments.length;
    const freeCapacity = Math.max(0, courseCapacity - enrolledCount);

    const atRiskEnrollments = await (prisma as any).academyCourseEnrollment.findMany({
      where: { status: 'active', progress: { lt: 30 } },
    });
    const atRiskStudentIds = [...new Set(atRiskEnrollments.map((e: any) => e.studentId))];
    const atRiskStudentRecords = atRiskStudentIds.length > 0
      ? await (prisma as any).academyUser.findMany({
          where: { id: { in: atRiskStudentIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const studentMap = new Map(atRiskStudentRecords.map((s: any) => [s.id, s]));
    const atRisk = atRiskEnrollments
      .map((e: any) => {
        const student = studentMap.get(e.studentId);
        if (!student) return null;
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          progress: e.progress,
        };
      })
      .filter((x: any) => x !== null);

    const recentLeads = await (prisma as any).academyRegistrationRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const recentRegistrations = await (prisma as any).academyUser.findMany({
      where: { role: 'student', createdAt: { gte: startOfMonth } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    });

    return NextResponse.json({
      user: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        role: account.role,
        email: account.email,
        phone: account.phone,
      },
      stats: {
        activeStudents: students,
        teachers,
        newLeads: leads,
        newRegistrations,
        monthRevenue,
        totalDebt,
        todayClasses: todaySessions.length,
        freeCapacity,
        todayAbsences,
        atRiskCount: atRisk.length,
      },
      todayClasses: todaySessions.map((s: any) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        weekday: s.weekday,
        room: s.room,
        status: s.status,
      })),
      atRiskStudents: atRisk,
      recentLeads: recentLeads.map((l: any) => ({ id: l.id, type: l.type, status: l.status, createdAt: l.createdAt })),
      recentRegistrations: recentRegistrations.map((r: any) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error('[admin-dashboard] UNHANDLED ERROR', err);
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات داشبورد مدیر' }, { status: 500 });
  }
}
