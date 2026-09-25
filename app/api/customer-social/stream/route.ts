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

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(serialize(data))}\n\n`));
      };

      send('connected', { userId: auth.userId });

      let closed = false;
      let lastCheck = new Date();

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const newMessages = await prisma.customerSocialMessage.findMany({
            where: {
              OR: [
                { receiverId: auth.userId },
                { senderId: auth.userId },
              ],
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: 'asc' },
          });
          for (const m of newMessages) {
            if (m.receiverId === auth.userId) {
              send('dm', m);
            }
          }

          const readUpdates = await prisma.customerSocialMessage.findMany({
            where: { senderId: auth.userId, readAt: { gt: lastCheck } },
          });
          for (const m of readUpdates) {
            send('dm_read', m);
          }

          lastCheck = new Date();
        } catch (err) {
          console.error('[customer-social/stream] poll error', err);
          send('error', { message: 'Poll failed' });
        }
      }, 2000);

      const heartbeat = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch {}
        }
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
