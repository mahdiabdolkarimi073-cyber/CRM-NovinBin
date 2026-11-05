import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = serializeData(data[key]);
    }
    return result;
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const studentId = account.id;

    const [enrollments, installments, invoices, receipts] = await Promise.all([
      (prisma as any).academyCourseEnrollment.findMany({
        where: { studentId },
        include: { course: true },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).academyInstallment.findMany({
        where: { studentId },
        orderBy: { installmentNo: 'asc' },
      }),
      (prisma as any).academyInvoice.findMany({
        where: { studentId },
        orderBy: { issueDate: 'desc' },
      }),
      (prisma as any).academyReceipt.findMany({
        where: { studentId },
        orderBy: { receivedDate: 'desc' },
      }),
    ]);

    const totalFee = enrollments.reduce((sum: number, e: any) => sum + Number(e.fee), 0);
    const totalDiscount = enrollments.reduce((sum: number, e: any) => {
      const disc = Number(e.fee) - Number(e.paid) < 0 ? 0 : 0;
      return sum + disc;
    }, 0);
    const totalPaid = enrollments.reduce((sum: number, e: any) => sum + Number(e.paid), 0);
    const totalRemaining = totalFee - totalDiscount - totalPaid;

    const paidInstallments = installments.filter((i: any) => i.status === 'paid');
    const pendingInstallments = installments.filter((i: any) => i.status === 'pending');
    const overdueInstallments = installments.filter((i: any) => i.status === 'overdue');

    return NextResponse.json({
      user: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        role: account.role,
        avatarUrl: account.avatarUrl,
      },
      summary: {
        totalFee,
        totalDiscount,
        totalPaid,
        totalRemaining,
      },
      installments: serializeData(installments),
      invoices: serializeData(invoices),
      receipts: serializeData(receipts),
      counts: {
        paid: paidInstallments.length,
        pending: pendingInstallments.length,
        overdue: overdueInstallments.length,
      },
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات مالی' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const body = await req.json();
    const { installmentId, action } = body;

    if (action === 'pay_installment' && installmentId) {
      const installment = await (prisma as any).academyInstallment.findFirst({
        where: { id: installmentId, studentId: account.id },
      });
      if (!installment) return NextResponse.json({ error: 'قسط یافت نشد' }, { status: 404 });
      if (installment.status === 'paid') return NextResponse.json({ error: 'این قسط قبلاً پرداخت شده است' }, { status: 400 });

      await (prisma as any).academyInstallment.update({
        where: { id: installmentId },
        data: { status: 'paid', paidDate: new Date() },
      });

      const trackingCode = 'RC-' + Date.now().toString().slice(-10);
      await (prisma as any).academyReceipt.create({
        data: {
          studentId: account.id,
          amount: installment.amount,
          trackingCode,
          receivedDate: new Date(),
        },
      });

      return NextResponse.json({ success: true, trackingCode });
    }

    return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'خطا در پردازش پرداخت' }, { status: 500 });
  }
}
