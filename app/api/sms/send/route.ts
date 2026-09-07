import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendSms, sendExpiryReminder, normalizeMobile } from '@/lib/sms';

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
    const { action } = body;

    if (action === 'send_single') {
      const { mobile, message } = body;
      const trimmedMessage = (message || '').trim();
      const trimmedMobile = (mobile || '').trim();
      if (!trimmedMobile || !trimmedMessage) {
        return NextResponse.json({ error: 'شماره موبایل و متن پیامک الزامی است' }, { status: 400 });
      }
      const result = await sendSms(trimmedMobile, trimmedMessage, 'manual');
      return NextResponse.json(result);
    }

    if (action === 'send_reminder') {
      const { hostDomainId } = body;
      if (!hostDomainId) {
        return NextResponse.json({ error: 'شناسه هاست/دامنه الزامی است' }, { status: 400 });
      }
      const hd = await prisma.hostDomain.findUnique({ where: { id: hostDomainId } });
      if (!hd) {
        return NextResponse.json({ error: 'هاست/دامنه یافت نشد' }, { status: 404 });
      }
      const result = await sendExpiryReminder(hd.id, hd.phoneNumber, hd.firstName, hd.lastName);
      if (result.success) {
        await prisma.hostDomain.update({
          where: { id: hd.id },
          data: { smsSent: true, smsSentAt: new Date() },
        });
      }
      return NextResponse.json(result);
    }

    if (action === 'check_expiry') {
      const now = new Date();
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const due = await prisma.hostDomain.findMany({
        where: {
          smsSent: false,
          expiryDate: { lte: oneWeekLater, gte: now },
        },
      });
      const results: any[] = [];
      for (const hd of due) {
        const result = await sendExpiryReminder(hd.id, hd.phoneNumber, hd.firstName, hd.lastName);
        if (result.success) {
          await prisma.hostDomain.update({
            where: { id: hd.id },
            data: { smsSent: true, smsSentAt: new Date() },
          });
        }
        results.push({ id: hd.id, customer: `${hd.firstName} ${hd.lastName}`, success: result.success });
      }
      return NextResponse.json({ sent: results.length, results });
    }

    return NextResponse.json({ error: 'action نامعتبر است' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
