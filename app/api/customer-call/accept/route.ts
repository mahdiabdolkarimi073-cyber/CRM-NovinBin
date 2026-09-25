import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId الزامی است' }, { status: 400 });
  try {
    const session = await prisma.customerSocialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    if (session.receiverId !== auth.userId) return NextResponse.json({ error: 'شما گیرنده این تماس نیستید' }, { status: 403 });
    if (!['calling', 'ringing'].includes(session.status)) return NextResponse.json({ error: 'این تماس قابل پاسخ نیست' }, { status: 400 });
    const updated = await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { status: 'accepted', startedAt: new Date() } });
    await prisma.customerSocialMessage.create({
      data: {
        senderId: auth.userId,
        receiverId: session.callerId === auth.userId ? session.receiverId : session.callerId,
        content: 'تماس پاسخ داده شد',
        attachmentType: 'call_log',
      },
    });
    return NextResponse.json({ session: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
