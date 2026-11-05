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

// GET /api/customer-contracts
export async function GET(req: NextRequest) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  const isSuperAdmin = profile.role === 'super_admin' || profile.role === 'owner' || profile.role === 'admin';
  const isCustomer = profile.userType === 'customer';

  if (!isSuperAdmin && !isCustomer) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز. تنها مدیران و مشتری مربوطه به قراردادها دسترسی دارند' }, { status: 403 });
  }

  const url = new URL(req.url);
  const customerIdParam = url.searchParams.get('customerId');

  try {
    let query = `
      SELECT 
        c.id, c."orgId", c."customerId", c.title, c.description,
        c."fileUrl", c."fileName", c."fileSize", c."uploadedBy",
        c.status, c."adminSignature", c."adminSignedAt", c."adminSignerName",
        c."customerSignature", c."customerSignedAt", c."customerSignerName",
        c."legalDisclaimerAccepted", c."createdAt", c."updatedAt",
        cust."companyName" AS "customerCompanyName",
        cust."firstName" AS "customerFirstName",
        cust."lastName" AS "customerLastName",
        cust."nationalId" AS "customerNationalId",
        cust."phone" AS "customerPhone",
        cust."mobile" AS "customerMobile",
        up."firstName" AS "uploaderFirstName",
        up."lastName" AS "uploaderLastName"
      FROM "customer_contracts" c
      LEFT JOIN "customers" cust ON cust.id = c."customerId"
      LEFT JOIN "profiles" up ON up.id = c."uploadedBy"
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (isCustomer) {
      if (!profile.customerId) {
        return NextResponse.json({ data: [] });
      }
      params.push(profile.customerId);
      whereClauses.push(`c."customerId" = $${params.length}::uuid`);
    } else if (isSuperAdmin) {
      if (customerIdParam) {
        params.push(customerIdParam);
        whereClauses.push(`c."customerId" = $${params.length}::uuid`);
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY c."createdAt" DESC`;

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

    const data = rows.map((r) => ({
      ...r,
      fileSize: r.fileSize ? Number(r.fileSize) : 0,
      customerName: r.customerCompanyName || [r.customerFirstName, r.customerLastName].filter(Boolean).join(' ') || 'مشتری',
      uploaderName: [r.uploaderFirstName, r.uploaderLastName].filter(Boolean).join(' ') || 'سوپرادمین',
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Fetch customer contracts error:', error);
    return NextResponse.json({ error: 'خطا در دریافت قراردادها: ' + error.message }, { status: 500 });
  }
}

// POST /api/customer-contracts
export async function POST(req: NextRequest) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  // Superadmin / Admin only
  const isSuperAdmin = profile.role === 'super_admin' || profile.role === 'owner' || profile.role === 'admin';
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'تنها سوپرادمین مجاز به ثبت قرارداد مشتری است' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { customerId, title, description, fileUrl, fileName, fileSize } = body;

    if (!customerId) return NextResponse.json({ error: 'انتخاب مشتری الزامی است' }, { status: 400 });
    if (!title || !title.trim()) return NextResponse.json({ error: 'عنوان قرارداد الزامی است' }, { status: 400 });
    if (!fileUrl) return NextResponse.json({ error: 'بارگذاری فایل قرارداد PDF الزامی است' }, { status: 400 });

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, firstName: true, lastName: true, companyName: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'مشتری انتخاب‌شده در دیتابیس یافت نشد' }, { status: 404 });
    }

    const orgIdVal = profile.orgId && profile.orgId.length === 36 ? profile.orgId : null;
    const numericSize = fileSize ? Number(fileSize) : 0;

    const insertQuery = `
      INSERT INTO "customer_contracts" (
        "orgId", "customerId", "title", "description",
        "fileUrl", "fileName", "fileSize", "uploadedBy",
        "status", "legalDisclaimerAccepted"
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4,
        $5, $6, $7::bigint, $8::uuid,
        'pending', true
      ) RETURNING *;
    `;

    const inserted: any[] = await prisma.$queryRawUnsafe(
      insertQuery,
      orgIdVal,
      customerId,
      title.trim(),
      description ? description.trim() : null,
      fileUrl,
      fileName || 'contract.pdf',
      numericSize,
      profile.id
    );

    const record = inserted[0];
    return NextResponse.json({
      data: {
        ...record,
        fileSize: record.fileSize ? Number(record.fileSize) : 0,
      },
      message: 'قرارداد با موفقیت بارگذاری و ثبت شد',
    });
  } catch (error: any) {
    console.error('Create customer contract error:', error);
    return NextResponse.json({ error: 'خطا در ثبت قرارداد: ' + error.message }, { status: 500 });
  }
}
