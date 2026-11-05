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
      select: { id: true, role: true, userType: true, customerId: true, orgId: true },
    });
    return profile;
  } catch {
    return null;
  }
}

// GET /api/customer-chat/delivery-signoffs
export async function GET(req: NextRequest) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });

  const url = new URL(req.url);
  const customerId = url.searchParams.get('customerId');

  const isSuperAdmin = profile.role === 'super_admin' || profile.role === 'owner' || profile.role === 'admin';
  const isCustomer = profile.userType === 'customer';

  try {
    let query = `
      SELECT 
        s.id, s."orgId", s."customerId", s."messageId",
        s."fileName", s."fileUrl", s."fileSize", s."confirmedBy",
        s."signerName", s."signerPhone", s."confirmedAt", s."createdAt",
        cust."companyName" AS "customerCompanyName",
        cust."firstName" AS "customerFirstName",
        cust."lastName" AS "customerLastName",
        cust."phone" AS "customerPhone"
      FROM "customer_delivery_signoffs" s
      LEFT JOIN "customers" cust ON cust.id = s."customerId"
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (isCustomer) {
      if (!profile.customerId) return NextResponse.json({ data: [] });
      params.push(profile.customerId);
      whereClauses.push(`s."customerId" = $${params.length}::uuid`);
    } else if (isSuperAdmin) {
      if (customerId) {
        params.push(customerId);
        whereClauses.push(`s."customerId" = $${params.length}::uuid`);
      }
    } else {
      // General staff: can view signoffs for specific customer they are working with
      if (customerId) {
        params.push(customerId);
        whereClauses.push(`s."customerId" = $${params.length}::uuid`);
      } else {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY s."confirmedAt" DESC`;

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

    const data = rows.map((r) => ({
      ...r,
      fileSize: r.fileSize ? Number(r.fileSize) : 0,
      customerName:
        r.customerCompanyName ||
        [r.customerFirstName, r.customerLastName].filter(Boolean).join(' ') ||
        'مشتری',
      confirmedAtFormatted: formatJalaliDateTime(r.confirmedAt),
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Fetch delivery signoffs error:', error);
    return NextResponse.json({ error: 'خطا در دریافت سوابق تأییدیه: ' + error.message }, { status: 500 });
  }
}
