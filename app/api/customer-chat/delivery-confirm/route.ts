import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ensureContractAndSignoffTables } from '@/lib/customer-contracts-db';
import { formatJalaliDateTime } from '@/lib/format';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getProfile(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const profile = await prisma.profile.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, userType: true, customerId: true, firstName: true, lastName: true, phone: true, orgId: true },
    });
    return profile;
  } catch {
    return null;
  }
}

// POST /api/customer-chat/delivery-confirm
export async function POST(req: NextRequest) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });

  // Only customers can confirm site delivery
  if (profile.userType !== 'customer' || !profile.customerId) {
    return NextResponse.json({ error: 'تنها مشتری می‌تواند تأییدیه تحویل سایت را ثبت کند' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { messageId, fileName, fileUrl, fileSize } = body;

    if (!fileName && !fileUrl) {
      return NextResponse.json({ error: 'اطلاعات فایل تحویل سایت ناقص است' }, { status: 400 });
    }

    const targetFileName = fileName || 'فایل تحویل سایت';
    const targetFileUrl = fileUrl || '';

    // Check immutability: Ensure this file has not been confirmed already for this customer
    const existing: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT id, "confirmedAt", "signerName" 
      FROM "customer_delivery_signoffs"
      WHERE "customerId" = $1::uuid AND ("fileName" = $2 OR (LENGTH($3) > 0 AND "fileUrl" = $3))
      LIMIT 1;
      `,
      profile.customerId,
      targetFileName,
      targetFileUrl
    );

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'این فایل قبلاً توسط شما تأیید شده است و سوابق آن غیرقابل تغییر و غیرقابل حذف است.',
          existingSignoff: existing[0],
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: profile.customerId },
      select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, mobile: true },
    });

    const signerName =
      customer?.companyName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') ||
      'مشتری';

    const signerPhone = customer?.phone || customer?.mobile || profile.phone || '';
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Insert immutable record in customer_delivery_signoffs
    const insertQuery = `
      INSERT INTO "customer_delivery_signoffs" (
        "orgId", "customerId", "messageId", "fileName",
        "fileUrl", "fileSize", "confirmedBy", "signerName",
        "signerPhone", "confirmedAt"
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4,
        $5, $6, $7::uuid, $8,
        $9, $10::timestamp
      ) RETURNING *;
    `;

    const inserted: any[] = await prisma.$queryRawUnsafe(
      insertQuery,
      profile.orgId || null,
      profile.customerId,
      messageId && messageId.length === 36 ? messageId : null,
      targetFileName,
      targetFileUrl,
      fileSize || 0,
      profile.id,
      signerName,
      signerPhone,
      nowIso
    );

    const signoffRecord = inserted[0];

    // 2. Insert immutable permanent system message into customer_chat_messages
    const jalaliTime = formatJalaliDateTime(now);
    const systemNotice = `✅ این فایل تحویل سایت («${targetFileName}») توسط مشتری (${signerName}) در تاریخ و ساعت ${jalaliTime} با موفقیت تأیید شد. (کد رهگیری: ${signoffRecord.id.slice(0, 8)})`;

    try {
      await prisma.customerChatMessage.create({
        data: {
          orgId: profile.orgId || undefined,
          customerId: profile.customerId,
          senderType: 'system',
          senderId: profile.id,
          content: systemNotice,
          attachmentUrl: targetFileUrl || null,
          attachmentName: targetFileName || null,
        },
      });
    } catch (msgErr) {
      console.warn('Could not insert system message into customerChatMessage via Prisma delegate, using raw SQL:', msgErr);
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "customer_chat_messages" (
          "orgId", "customerId", "senderType", "senderId", "content", "attachmentUrl", "attachmentName", "createdAt"
        ) VALUES (
          $1::uuid, $2::uuid, 'system', $3::uuid, $4, $5, $6, $7::timestamp
        );
        `,
        profile.orgId || null,
        profile.customerId,
        profile.id,
        systemNotice,
        targetFileUrl || null,
        targetFileName || null,
        nowIso
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تأییدیه تحویل سایت با موفقیت ثبت شد و غیرقابل تغییر می‌باشد',
      signoff: {
        ...signoffRecord,
        fileSize: signoffRecord.fileSize ? Number(signoffRecord.fileSize) : 0,
        confirmedAtFormatted: jalaliTime,
      },
    });
  } catch (error: any) {
    console.error('Site delivery confirm error:', error);
    return NextResponse.json({ error: 'خطا در ثبت تأییدیه: ' + error.message }, { status: 500 });
  }
}
