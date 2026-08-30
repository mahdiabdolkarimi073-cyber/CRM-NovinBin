import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active || account.role !== 'admin') return null;
    return account;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'شناسه دانش‌آموز الزامی است' }, { status: 400 });

  const student = await (prisma as any).academyUser.findUnique({
    where: { id: studentId },
    select: { id: true, firstName: true, lastName: true, username: true, phone: true, email: true, nationalId: true, active: true, createdAt: true },
  });
  if (!student || student.role !== 'student') return NextResponse.json({ error: 'دانش‌آموز یافت نشد' }, { status: 404 });

  const [enrollments, grades, sessions, installments, invoices, receipts, contracts, notes, educationRecords, evaluations] = await Promise.all([
    (prisma as any).academyCourseEnrollment.findMany({
      where: { studentId },
      include: { course: { select: { id: true, title: true, level: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyStudentGrade.findMany({
      where: { studentId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyClassSession.findMany({
      where: { studentId },
      orderBy: { startsAt: 'desc' },
      take: 50,
    }),
    (prisma as any).academyInstallment.findMany({
      where: { studentId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    (prisma as any).academyInvoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyReceipt.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyContract.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyStudentNote.findMany({
      where: { studentId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyEducationRecord.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
    }),
    (prisma as any).academyTeacherEvaluation.findMany({
      where: { studentId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalFee = enrollments.reduce((s: number, e: any) => s + Number(e.fee), 0);
  const totalPaid = enrollments.reduce((s: number, e: any) => s + Number(e.paid), 0);
  const totalDebt = totalFee - totalPaid;
  const absentCount = sessions.filter((s: any) => s.status === 'absent').length;
  const presentCount = sessions.filter((s: any) => s.status === 'present').length;
  const lateCount = sessions.filter((s: any) => s.status === 'late').length;

  return NextResponse.json({
    student,
    summary: {
      totalFee,
      totalPaid,
      totalDebt,
      activeCourses: enrollments.filter((e: any) => e.status === 'active').length,
      absentCount,
      presentCount,
      lateCount,
      avgGrade: grades.length > 0 ? grades.reduce((s: number, g: any) => s + (g.examScore || 0), 0) / grades.length : 0,
    },
    enrollments: enrollments.map((e: any) => ({
      id: e.id,
      courseTitle: e.course?.title || '—',
      courseLevel: e.course?.level || '—',
      progress: e.progress,
      heldSessions: e.heldSessions,
      totalSessions: e.totalSessions,
      fee: Number(e.fee),
      paid: Number(e.paid),
      status: e.status,
      createdAt: e.createdAt,
    })),
    grades: grades.map((g: any) => ({
      id: g.id,
      courseTitle: g.course?.title || '—',
      examScore: g.examScore,
      assignmentScore: g.assignmentScore,
      participationScore: g.participationScore,
      speakingScore: g.speakingScore,
      listeningScore: g.listeningScore,
      readingScore: g.readingScore,
      writingScore: g.writingScore,
      note: g.note,
      createdAt: g.createdAt,
    })),
    sessions: sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      startsAt: s.startsAt,
      status: s.status,
      lateMinutes: s.lateMinutes,
      room: s.room,
      attendanceNote: s.attendanceNote,
    })),
    installments: installments.map((i: any) => ({
      id: i.id,
      courseTitle: i.course?.title || '—',
      amount: Number(i.amount),
      dueDate: i.dueDate,
      paidDate: i.paidDate,
      status: i.status,
      installmentNo: i.installmentNo,
    })),
    invoices: invoices.map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      amount: Number(inv.amount),
      issueDate: inv.issueDate,
      createdAt: inv.createdAt,
    })),
    receipts: receipts.map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      trackingCode: r.trackingCode,
      receivedDate: r.receivedDate,
      createdAt: r.createdAt,
    })),
    contracts: contracts.map((c: any) => ({
      id: c.id,
      title: c.title,
      amount: Number(c.amount),
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      createdAt: c.createdAt,
    })),
    notes: notes.map((n: any) => ({
      id: n.id,
      body: n.body,
      authorName: n.author ? `${n.author.firstName} ${n.author.lastName}` : '—',
      createdAt: n.createdAt,
    })),
    educationRecords: educationRecords.map((er: any) => ({
      id: er.id,
      currentLevel: er.currentLevel,
      currentLevelName: er.currentLevelName,
      levelStartDate: er.levelStartDate,
      placementResult: er.placementResult,
      placementDate: er.placementDate,
      targetLevel: er.targetLevel,
      progressPercent: er.progressPercent,
      teacherRating: er.teacherRating,
      teacherComment: er.teacherComment,
      averageGrade: er.averageGrade,
      updatedAt: er.updatedAt,
    })),
    evaluations: evaluations.map((ev: any) => ({
      id: ev.id,
      courseTitle: ev.course?.title || '—',
      strengths: ev.strengths,
      weaknesses: ev.weaknesses,
      learningStatus: ev.learningStatus,
      educationalSuggestion: ev.educationalSuggestion,
      currentLevel: ev.currentLevel,
      suggestedLevel: ev.suggestedLevel,
      createdAt: ev.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { studentId, action, body: noteBody } = body;

  if (!studentId || !action) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  if (action === 'add_note') {
    if (!noteBody || !noteBody.trim()) return NextResponse.json({ error: 'متن یادداشت الزامی است' }, { status: 400 });
    const note = await (prisma as any).academyStudentNote.create({
      data: { studentId, authorId: admin.id, body: noteBody.trim() },
    });
    return NextResponse.json({ note: { id: note.id, body: note.body, createdAt: note.createdAt } });
  }

  return NextResponse.json({ error: 'عملیات نامشخص' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get('noteId');
  if (!noteId) return NextResponse.json({ error: 'شناسه یادداشت الزامی است' }, { status: 400 });

  await (prisma as any).academyStudentNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
