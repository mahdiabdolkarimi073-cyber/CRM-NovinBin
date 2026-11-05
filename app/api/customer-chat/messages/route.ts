import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ensureContractAndSignoffTables } from '@/lib/customer-contracts-db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getProfile(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const profile = await prisma.profile.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, userType: true, customerId: true, firstName: true, lastName: true, orgId: true },
    });
    return profile;
  } catch {
    return null;
  }
}

// GET /api/customer-chat/messages?customerId=xxx
export async function GET(req: NextRequest) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });

  const url = new URL(req.url);
  let targetCustomerId = url.searchParams.get('customerId');

  // Customer isolation: Customer can ONLY query their own customerId
  if (profile.userType === 'customer') {
    if (!profile.customerId) {
      return NextResponse.json({ error: 'شناسه مشتری برای این حساب تنظیم نشده است' }, { status: 403 });
    }
    targetCustomerId = profile.customerId;
  }

  if (!targetCustomerId) {
    return NextResponse.json({ error: 'شناسه مشتری الزامی است' }, { status: 400 });
  }

  try {
    // 1. Fetch chat messages
    const messages = await prisma.customerChatMessage.findMany({
      where: { customerId: targetCustomerId },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch delivery signoffs for this customer
    const signoffs: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT id, "fileName", "fileUrl", "confirmedAt", "signerName"
      FROM "customer_delivery_signoffs"
      WHERE "customerId" = $1::uuid
      ORDER BY "confirmedAt" DESC;
      `,
      targetCustomerId
    );

    const signoffMap: Record<string, any> = {};
    for (const s of signoffs) {
      if (s.fileName) signoffMap[s.fileName] = s;
      if (s.fileUrl) signoffMap[s.fileUrl] = s;
    }

    // Attach sender names where possible
    const senderIds = Array.from(new Set(messages.map((m) => m.senderId).filter(Boolean))) as string[];
    const profiles = senderIds.length > 0 ? await prisma.profile.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, firstName: true, lastName: true, role: true, userType: true },
    }) : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const enrichedMessages = messages.map((m) => {
      const sender = m.senderId ? profileMap.get(m.senderId) : null;
      const senderName = sender
        ? [sender.firstName, sender.lastName].filter(Boolean).join(' ')
        : (m.senderType === 'customer' ? 'مشتری' : m.senderType === 'system' ? 'سیستم' : 'پرسنل');

      // Check if this message's attachment has a delivery signoff
      const matchedSignoff =
        (m.attachmentName && signoffMap[m.attachmentName]) ||
        (m.attachmentUrl && signoffMap[m.attachmentUrl]) ||
        null;

      const isDeliveryFile = m.content?.includes('[DELIVERY_FILE]') || m.isReport === true;

      return {
        ...m,
        senderName,
        isDeliveryFile,
        deliveryConfirmed: !!matchedSignoff,
        deliverySignoff: matchedSignoff,
      };
    });

    return NextResponse.json({
      messages: enrichedMessages,
      signoffs,
    });
  } catch (error: any) {
    console.error('Fetch customer messages error:', error);
    return NextResponse.json({ error: 'خطا در دریافت پیام‌ها: ' + error.message }, { status: 500 });
  }
}

// POST /api/customer-chat/messages
export async function POST(req: NextRequest) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });

  try {
    const body = await req.json();
    let { customerId, content, attachmentUrl, attachmentName, isDeliveryFile, isReport } = body;

    // Customer isolation: Customer can ONLY send messages to their own customerId
    if (profile.userType === 'customer') {
      if (!profile.customerId) {
        return NextResponse.json({ error: 'شناسه مشتری برای این حساب تنظیم نشده است' }, { status: 403 });
      }
      customerId = profile.customerId;
    }

    if (!customerId) {
      return NextResponse.json({ error: 'شناسه مشتری الزامی است' }, { status: 400 });
    }

    if (!content && !attachmentUrl) {
      return NextResponse.json({ error: 'پیام یا فایل الزامی است' }, { status: 400 });
    }

    let finalContent = (content || '').trim();
    if (isDeliveryFile && !finalContent.includes('[DELIVERY_FILE]')) {
      finalContent = `[DELIVERY_FILE] ${finalContent || 'فایل تحویل سایت جهت بررسی و تأیید نهایی'}`.trim();
    }

    const senderType = profile.userType === 'customer' ? 'customer' : 'staff';

    const created = await prisma.customerChatMessage.create({
      data: {
        orgId: profile.orgId || undefined,
        customerId,
        senderType,
        senderId: profile.id,
        content: finalContent,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        isReport: !!isDeliveryFile || !!isReport,
      },
    });

    return NextResponse.json({
      success: true,
      message: created,
    });
  } catch (error: any) {
    console.error('Send customer message error:', error);
    return NextResponse.json({ error: 'خطا در ارسال پیام: ' + error.message }, { status: 500 });
  }
}
