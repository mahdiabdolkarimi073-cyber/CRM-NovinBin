import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

function serialize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serialize);
  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) result[key] = serialize(data[key]);
    return result;
  }
  return data;
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('connected', { userId: auth.userId });

      let lastCheck = new Date();
      let closed = false;

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const newMessages = await prisma.staffChatMessage.findMany({
            where: {
              receiverId: auth.userId,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: 'asc' },
          });
          if (newMessages.length > 0) {
            lastCheck = new Date();
            for (const msg of newMessages) send('message', serialize(msg));
          }

          const readUpdates = await prisma.staffChatMessage.findMany({
            where: {
              senderId: auth.userId,
              readAt: { gt: lastCheck },
            },
            orderBy: { readAt: 'asc' },
          });
          if (readUpdates.length > 0) {
            for (const msg of readUpdates) send('read', serialize(msg));
          }
        } catch (e) {
          send('error', { message: 'Poll failed' });
        }
      }, 2000);

      const heartbeat = setInterval(() => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch {}
      }, 25000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
