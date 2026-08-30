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

  const whereStudent = studentId ? { studentId } : {};
  const whereTeacher = studentId ? {} : {};

  const [enrollments, installments, invoices, receipts, discounts, payments, teacherShares, teacherSettlements] = await Promise.all([
    (prisma as any).academyCourseEnrollment.findMany({
      where: whereStudent,
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyInstallment.findMany({
      where: whereStudent,
      include: { course: { select: { id: true, title: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    (prisma as any).academyInvoice.findMany({
      where: whereStudent,
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyReceipt.findMany({
      where: whereStudent,
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyDiscount.findMany({
      where: whereStudent,
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyPayment.findMany({
      where: whereStudent,
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyTeacherShare.findMany({
      where: whereTeacher,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyTeacherSettlement.findMany({
      where: whereTeacher,
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalFee = enrollments.reduce((s: number, e: any) => s + Number(e.fee), 0);
  const totalPaid = enrollments.reduce((s: number, e: any) => s + Number(e.paid), 0);
  const totalDiscount = discounts.reduce((s: number, d: any) => s + Number(d.amount), 0);
  const totalDebt = totalFee - totalPaid - totalDiscount;
  const totalPayments = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalShare = teacherShares.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalSharePaid = teacherShares.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalSettled = teacherSettlements.filter((t: any) => t.status === 'settled').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalPendingSettlement = teacherSettlements.filter((t: any) => t.status === 'pending').reduce((s: number, t: any) => s + Number(t.amount), 0);

  return NextResponse.json({
    summary: { totalFee, totalPaid, totalDiscount, totalDebt, totalPayments, totalShare, totalSharePaid, totalSharePending: totalShare - totalSharePaid, totalSettled, totalPendingSettlement },
    enrollments: enrollments.map((e: any) => ({ id: e.id, courseTitle: e.course?.title || '—', fee: Number(e.fee), paid: Number(e.paid), status: e.status, createdAt: e.createdAt })),
    installments: installments.map((i: any) => ({ id: i.id, courseTitle: i.course?.title || '—', amount: Number(i.amount), dueDate: i.dueDate, paidDate: i.paidDate, status: i.status, installmentNo: i.installmentNo })),
    invoices: invoices.map((inv: any) => ({ id: inv.id, number: inv.number, amount: Number(inv.amount), issueDate: inv.issueDate, createdAt: inv.createdAt })),
    receipts: receipts.map((r: any) => ({ id: r.id, amount: Number(r.amount), trackingCode: r.trackingCode, receivedDate: r.receivedDate, createdAt: r.createdAt })),
    discounts: discounts.map((d: any) => ({ id: d.id, courseTitle: d.course?.title || '—', title: d.title, percent: d.percent, amount: Number(d.amount), createdAt: d.createdAt })),
    payments: payments.map((p: any) => ({ id: p.id, amount: Number(p.amount), method: p.method, trackingCode: p.trackingCode, paidAt: p.paidAt, createdAt: p.createdAt })),
    teacherShares: teacherShares.map((t: any) => ({ id: t.id, teacherName: t.teacher ? `${t.teacher.firstName} ${t.teacher.lastName}` : '—', courseTitle: t.course?.title || '—', percent: t.percent, amount: Number(t.amount), status: t.status, createdAt: t.createdAt })),
    teacherSettlements: teacherSettlements.map((t: any) => ({ id: t.id, teacherName: t.teacher ? `${t.teacher.firstName} ${t.teacher.lastName}` : '—', amount: Number(t.amount), period: t.period, status: t.status, settledAt: t.settledAt, createdAt: t.createdAt })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { type, data } = body;
  if (!type || !data) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  let result;
  switch (type) {
    case 'installment':
      result = await (prisma as any).academyInstallment.create({ data: { studentId: data.studentId, courseId: data.courseId || null, amount: BigInt(data.amount || 0), dueDate: new Date(data.dueDate), installmentNo: data.installmentNo || 1, status: 'pending' } });
      break;
    case 'invoice':
      result = await (prisma as any).academyInvoice.create({ data: { studentId: data.studentId, courseId: data.courseId || null, number: data.number, amount: BigInt(data.amount || 0) } });
      break;
    case 'receipt':
      result = await (prisma as any).academyReceipt.create({ data: { studentId: data.studentId, invoiceId: data.invoiceId || null, amount: BigInt(data.amount || 0), trackingCode: data.trackingCode || null } });
      break;
    case 'discount':
      result = await (prisma as any).academyDiscount.create({ data: { studentId: data.studentId || null, courseId: data.courseId || null, title: data.title, percent: data.percent || 0, amount: BigInt(data.amount || 0) } });
      break;
    case 'payment':
      result = await (prisma as any).academyPayment.create({ data: { studentId: data.studentId, invoiceId: data.invoiceId || null, amount: BigInt(data.amount || 0), method: data.method || 'cash', trackingCode: data.trackingCode || null } });
      break;
    case 'teacherShare':
      result = await (prisma as any).academyTeacherShare.create({ data: { teacherId: data.teacherId, courseId: data.courseId || null, percent: data.percent || 0, amount: BigInt(data.amount || 0), status: 'pending' } });
      break;
    case 'teacherSettlement':
      result = await (prisma as any).academyTeacherSettlement.create({ data: { teacherId: data.teacherId, amount: BigInt(data.amount || 0), period: data.period, status: 'pending' } });
      break;
    case 'settleShare':
      await (prisma as any).academyTeacherShare.update({ where: { id: data.id }, data: { status: 'paid' } });
      break;
    case 'settleSettlement':
      await (prisma as any).academyTeacherSettlement.update({ where: { id: data.id }, data: { status: 'settled', settledAt: new Date() } });
      break;
    case 'payInstallment':
      await (prisma as any).academyInstallment.update({ where: { id: data.id }, data: { status: 'paid', paidDate: new Date() } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: { id: result?.id } });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { type, id, data } = body;
  if (!type || !id || !data) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  switch (type) {
    case 'installment':
      await (prisma as any).academyInstallment.update({ where: { id }, data: { amount: BigInt(data.amount || 0), dueDate: new Date(data.dueDate), status: data.status || 'pending', paidDate: data.paidDate ? new Date(data.paidDate) : null } });
      break;
    case 'invoice':
      await (prisma as any).academyInvoice.update({ where: { id }, data: { number: data.number, amount: BigInt(data.amount || 0) } });
      break;
    case 'discount':
      await (prisma as any).academyDiscount.update({ where: { id }, data: { title: data.title, percent: data.percent || 0, amount: BigInt(data.amount || 0) } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  switch (type) {
    case 'installment':
      await (prisma as any).academyInstallment.delete({ where: { id } });
      break;
    case 'invoice':
      await (prisma as any).academyInvoice.delete({ where: { id } });
      break;
    case 'receipt':
      await (prisma as any).academyReceipt.delete({ where: { id } });
      break;
    case 'discount':
      await (prisma as any).academyDiscount.delete({ where: { id } });
      break;
    case 'payment':
      await (prisma as any).academyPayment.delete({ where: { id } });
      break;
    case 'teacherShare':
      await (prisma as any).academyTeacherShare.delete({ where: { id } });
      break;
    case 'teacherSettlement':
      await (prisma as any).academyTeacherSettlement.delete({ where: { id } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
