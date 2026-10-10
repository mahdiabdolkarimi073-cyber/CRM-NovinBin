import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

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
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'شناسه صورتحساب الزامی است' }, { status: 400 });
    }

    const invoice = await prisma.taxMoadiInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'صورتحساب یافت نشد' }, { status: 404 });
    }

    if (!invoice.taxReferenceId) {
      return NextResponse.json({ error: 'مرجع مالیاتی (referenceId) برای این صورتحساب وجود ندارد. ابتدا صورتحساب را ارسال کنید.' }, { status: 400 });
    }

    const settings = await prisma.taxMoadiSetting.findFirst({
      where: { orgId: invoice.orgId },
    });

    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: 'تنظیمات مؤدیان فعال نیست' }, { status: 400 });
    }

    const now = new Date();

    await prisma.taxMoadiInvoice.update({
      where: { id: invoiceId },
      data: {
        lastCheckedAt: now,
        updatedAt: now,
      },
    });

    await prisma.taxMoadiAuditLog.create({
      data: {
        orgId: invoice.orgId,
        action: 'update',
        entity: 'invoice',
        entityId: invoiceId,
        userId: auth.userId,
        details: { action: 'status_check', referenceId: invoice.taxReferenceId, checkedAt: now.toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      currentStatus: invoice.taxStatus,
      referenceId: invoice.taxReferenceId,
      message: 'برای بررسی واقعی وضعیت، نیاز به اتصال به API سامانه مؤدیان با اعتبارنامه معتبر دارید. وضعیت فعلی از پایگاه داده خوانده شد.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
