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

    const canRetry = ['rejected', 'needs_correction', 'sent'].includes(invoice.internalStatus);
    if (!canRetry) {
      return NextResponse.json({ error: 'این صورتحساب در وضعیت قابل تلاش مجدد نیست' }, { status: 400 });
    }

    const now = new Date();
    const updated = await prisma.taxMoadiInvoice.update({
      where: { id: invoiceId },
      data: {
        internalStatus: 'queued',
        sendQueuedAt: now,
        lastError: null,
        lastErrorCode: null,
        updatedAt: now,
      },
    });

    await prisma.taxMoadiAuditLog.create({
      data: {
        orgId: invoice.orgId,
        action: 'retry',
        entity: 'invoice',
        entityId: invoiceId,
        userId: auth.userId,
        details: { previousStatus: invoice.internalStatus, retriedAt: now.toISOString() },
      },
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
