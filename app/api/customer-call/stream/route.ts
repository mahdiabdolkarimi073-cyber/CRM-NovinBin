import { NextRequest } from 'next/server';
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
  if (!auth) {
    console.error('[API customer-call/stream] Unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }
  console.log('[API customer-call/stream] SSE connection opened', { userId: auth.userId });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('connected', { userId: auth.userId });

      let lastCheck = new Date();
      let closed = false;
      const sentUpdates = new Set<string>();

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const incomingCalls = await prisma.customerSocialCallSession.findMany({
            where: {
              receiverId: auth.userId,
              createdAt: { gt: lastCheck },
              status: { in: ['calling', 'ringing'] },
            },
            orderBy: { createdAt: 'asc' },
          });
          for (const call of incomingCalls) {
            console.log('[API customer-call/stream] sending incoming_call', { sessionId: call.id, status: call.status, hasOffer: !!call.offerSdp });
            sentUpdates.add(`${call.id}:${call.status}`);
            send('incoming_call', serialize(call));
          }

          const callUpdates = await prisma.customerSocialCallSession.findMany({
            where: {
              callerId: auth.userId,
              status: { in: ['accepted', 'rejected', 'missed', 'ended', 'failed'] },
            },
            orderBy: { createdAt: 'asc' },
          });
          for (const call of callUpdates) {
            const key = `${call.id}:${call.status}`;
            if (!sentUpdates.has(key)) {
              console.log('[API customer-call/stream] sending call_update', { sessionId: call.id, status: call.status });
              sentUpdates.add(key);
              send('call_update', serialize(call));
            }
          }

          const signals = await prisma.customerSocialCallSignal.findMany({
            where: {
              receiverId: auth.userId,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: 'asc' },
          });
          for (const sig of signals) {
            console.log('[API customer-call/stream] sending call_signal', { signalId: sig.id, signalType: sig.signalType });
            send('call_signal', serialize(sig));
          }

          lastCheck = new Date();
        } catch (err) {
          send('error', { message: 'Poll failed' });
        }
      }, 1500);

      const heartbeat = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch {}
        }
      }, 25000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        console.log('[API customer-call/stream] SSE connection closed', { userId: auth.userId });
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
