import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string; demoOrgId?: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { invoiceId, reason } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'شناسه صورتحساب الزامی است' }, { status: 400 });
    }

    const invoice = await prisma.taxMoadiInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'صورتحساب یافت نشد' }, { status: 404 });
    }

    if (invoice.internalStatus === 'voided') {
      return NextResponse.json({ error: 'صورتحساب قبلاً باطل شده است' }, { status: 400 });
    }

    const now = new Date();
    const updated = await prisma.taxMoadiInvoice.update({
      where: { id: invoiceId },
      data: {
        internalStatus: 'voided',
        voidedAt: now,
        voidReason: reason || 'ابطال دستی',
        updatedAt: now,
      },
    });

    await prisma.taxMoadiAuditLog.create({
      data: {
        orgId: invoice.orgId,
        action: 'void',
        entity: 'invoice',
        entityId: invoiceId,
        userId: auth.userId,
        details: { reason: reason || 'ابطال دستی', voidedAt: now.toISOString() },
      },
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
