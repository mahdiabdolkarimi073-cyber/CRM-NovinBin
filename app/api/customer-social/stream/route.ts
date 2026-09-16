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
      let lastCheck = new Date();
      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const newMessages = await prisma.customerSocialMessage.findMany({
            where: { receiverId: auth.userId, createdAt: { gt: lastCheck } },
            orderBy: { createdAt: 'asc' }
          });
          for (const m of newMessages) {
            controller.enqueue(`event: dm\ndata: ${JSON.stringify(serialize(m))}\n\n`);
          }
          if (newMessages.length > 0) lastCheck = new Date();
          const readUpdates = await prisma.customerSocialMessage.findMany({
            where: { senderId: auth.userId, readAt: { gt: lastCheck } }
          });
          for (const m of readUpdates) {
            controller.enqueue(`event: dm_read\ndata: ${JSON.stringify(serialize(m))}\n\n`);
          }
        } catch {}
      }, 2000);
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
