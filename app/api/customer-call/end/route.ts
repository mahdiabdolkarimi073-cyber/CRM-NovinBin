import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sessionId, reason } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId الزامی است' }, { status: 400 });
  try {
    const session = await prisma.customerSocialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    if (session.callerId !== auth.userId && session.receiverId !== auth.userId) return NextResponse.json({ error: 'شما طرف این تماس نیستید' }, { status: 403 });
    const durationSeconds = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000) : null;
    const updated = await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { status: 'ended', endedAt: new Date(), durationSeconds, endReason: reason || null } });
    await prisma.customerSocialCallSignal.create({ data: { callSessionId: sessionId, senderId: auth.userId, receiverId: session.callerId === auth.userId ? session.receiverId : session.callerId, signalType: 'end', signalData: reason || 'ended' } });
    return NextResponse.json({ data: { id: updated.id, status: updated.status } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
