import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }; } catch { return null; }
}

function serialize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serialize);
  if (typeof data === 'object') {
    const r: any = {};
    for (const k of Object.keys(data)) r[k] = serialize((data as any)[k]);
    return r;
  }
  return data;
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });
  const headers = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' };
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const incomingCalls = await prisma.customerSocialCallSession.findMany({
            where: { receiverId: auth.userId, status: { in: ['calling', 'ringing'] } }
          });
          for (const c of incomingCalls) {
            controller.enqueue(`event: incoming_call\ndata: ${JSON.stringify(serialize(c))}\n\n`);
          }
          const callUpdates = await prisma.customerSocialCallSession.findMany({
            where: { callerId: auth.userId, status: { in: ['accepted', 'rejected', 'missed', 'ended', 'failed'] } }
          });
          for (const c of callUpdates) {
            controller.enqueue(`event: call_update\ndata: ${JSON.stringify(serialize(c))}\n\n`);
          }
          const signals = await prisma.customerSocialCallSignal.findMany({
            where: { receiverId: auth.userId },
            orderBy: { createdAt: 'asc' },
            take: 20
          });
          for (const s of signals) {
            controller.enqueue(`event: call_signal\ndata: ${JSON.stringify(serialize(s))}\n\n`);
            await prisma.customerSocialCallSignal.delete({ where: { id: s.id } }).catch(() => {});
          }
        } catch {}
      }, 1500);
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(`: heartbeat\n\n`);
      }, 25000);
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    }
  });
  return new Response(stream, { headers });
}
