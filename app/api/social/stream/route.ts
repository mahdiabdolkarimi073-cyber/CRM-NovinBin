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
          // New DM messages received by me
          const newDMs = await prisma.socialDMMessage.findMany({
            where: { receiverId: auth.userId, createdAt: { gt: lastCheck } },
            orderBy: { createdAt: 'asc' },
          });
          if (newDMs.length > 0) {
            for (const msg of newDMs) send('dm', serialize(msg));
          }

          // DM read receipts for messages I sent
          const readUpdates = await prisma.socialDMMessage.findMany({
            where: { senderId: auth.userId, readAt: { gt: lastCheck } },
            orderBy: { readAt: 'asc' },
          });
          if (readUpdates.length > 0) {
            for (const msg of readUpdates) send('dm_read', serialize(msg));
          }

          // DM edits — messages I sent or received that were edited since last check
          const dmEdits = await prisma.socialDMMessage.findMany({
            where: {
              editedAt: { gt: lastCheck },
              OR: [{ senderId: auth.userId }, { receiverId: auth.userId }],
            },
            orderBy: { editedAt: 'asc' },
          });
          if (dmEdits.length > 0) {
            for (const msg of dmEdits) send('dm_edit', serialize(msg));
          }

          // DM deletes — detect messages that no longer exist
          // We check if any of our known messages were deleted by comparing
          // This is handled client-side via the delete API response

          // Group messages
          const myGroupIds = await prisma.socialGroupMember.findMany({
            where: { profileId: auth.userId },
            select: { groupId: true },
          });
          const groupIdList = myGroupIds.map((m) => m.groupId);

          if (groupIdList.length > 0) {
            const newGroupMessages = await prisma.socialGroupMessage.findMany({
              where: { groupId: { in: groupIdList }, createdAt: { gt: lastCheck }, senderId: { not: auth.userId } },
              orderBy: { createdAt: 'asc' },
            });
            if (newGroupMessages.length > 0) {
              for (const msg of newGroupMessages) send('group', serialize(msg));
            }

            // Group message edits
            const groupEdits = await prisma.socialGroupMessage.findMany({
              where: {
                groupId: { in: groupIdList },
                editedAt: { gt: lastCheck },
              },
              orderBy: { editedAt: 'asc' },
            });
            if (groupEdits.length > 0) {
              for (const msg of groupEdits) send('group_edit', serialize(msg));
            }
          }

          lastCheck = new Date();
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
