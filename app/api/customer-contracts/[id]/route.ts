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

// GET /api/customer-contracts/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT 
        c.*,
        cust."companyName" AS "customerCompanyName",
        cust."firstName" AS "customerFirstName",
        cust."lastName" AS "customerLastName",
        cust."nationalId" AS "customerNationalId",
        cust."phone" AS "customerPhone",
        cust."email" AS "customerEmail",
        cust."address" AS "customerAddress",
        up."firstName" AS "uploaderFirstName",
        up."lastName" AS "uploaderLastName"
      FROM "customer_contracts" c
      LEFT JOIN "customers" cust ON cust.id = c."customerId"
      LEFT JOIN "profiles" up ON up.id = c."uploadedBy"
      WHERE c.id = $1::uuid
      LIMIT 1;
      `,
      id
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'قرارداد یافت نشد' }, { status: 404 });
    }

    const contract = rows[0];
    const isSuperAdmin = profile.role === 'super_admin' || profile.role === 'owner' || profile.role === 'admin';
    const isCustomer = profile.userType === 'customer';

    // Strict access control: only superadmin/admin or the contract's own customer
    if (isCustomer) {
      if (!profile.customerId || profile.customerId !== contract.customerId) {
        return NextResponse.json({ error: 'شما به این قرارداد دسترسی ندارید' }, { status: 403 });
      }
    } else if (!isSuperAdmin) {
      return NextResponse.json({ error: 'دسترسی به این قرارداد برای شما مجاز نیست' }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        ...contract,
        fileSize: contract.fileSize ? Number(contract.fileSize) : 0,
        customerName: contract.customerCompanyName || [contract.customerFirstName, contract.customerLastName].filter(Boolean).join(' ') || 'مشتری',
        uploaderName: [contract.uploaderFirstName, contract.uploaderLastName].filter(Boolean).join(' ') || 'سوپرادمین',
      },
    });
  } catch (error: any) {
    console.error('Get contract error:', error);
    return NextResponse.json({ error: 'خطا در دریافت مشخصات قرارداد: ' + error.message }, { status: 500 });
  }
}

// POST /api/customer-contracts/[id] -> Electronic Signature
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureContractAndSignoffTables();
  const profile = await getProfile(req);
  if (!profile) return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });

  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const body = await req.json();
    const { signature, signerName } = body;

    if (!signature || typeof signature !== 'string' || !signature.startsWith('data:image/')) {
      return NextResponse.json({ error: 'امضای الکترونیکی نامعتبر است' }, { status: 400 });
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "customer_contracts" WHERE id = $1::uuid LIMIT 1;`,
      id
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'قرارداد یافت نشد' }, { status: 404 });
    }

    const contract = rows[0];
    const isSuperAdmin = profile.role === 'super_admin' || profile.role === 'owner' || profile.role === 'admin';
    const isCustomer = profile.userType === 'customer';

    const now = new Date();
    const nowIso = now.toISOString();

    if (isCustomer) {
      if (!profile.customerId || profile.customerId !== contract.customerId) {
        return NextResponse.json({ error: 'شما دسترسی به امضای این قرارداد ندارید' }, { status: 403 });
      }

      // Check immutability: customer signature cannot be overwritten once submitted
      if (contract.customerSignature) {
        return NextResponse.json({ error: 'این قرارداد قبلاً توسط شما امضا و قفل شده است و غیرقابل ویرایش است' }, { status: 400 });
      }

      const defaultName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'مشتری';
      const finalSignerName = signerName?.trim() || defaultName;

      // Determine new status
      const hasAdminSigned = !!contract.adminSignature;
      const newStatus = hasAdminSigned ? 'signed_by_both' : 'signed_by_one';

      await prisma.$executeRawUnsafe(
        `
        UPDATE "customer_contracts"
        SET 
          "customerSignature" = $1,
          "customerSignedAt" = $2::timestamp,
          "customerSignerName" = $3,
          "status" = $4,
          "updatedAt" = $5::timestamp
        WHERE id = $6::uuid;
        `,
        signature,
        nowIso,
        finalSignerName,
        newStatus,
        nowIso,
        id
      );

      return NextResponse.json({
        success: true,
        message: 'امضای الکترونیکی شما با موفقیت ثبت شد و قرارداد قفل گردید',
        status: newStatus,
        signedAt: nowIso,
        signerName: finalSignerName,
      });
    } else if (isSuperAdmin) {
      // Check immutability: admin signature cannot be overwritten
      if (contract.adminSignature) {
        return NextResponse.json({ error: 'این قرارداد قبلاً توسط سوپرادمین امضا و قفل شده است و غیرقابل ویرایش است' }, { status: 400 });
      }

      const defaultName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'مدیریت و سوپرادمین';
      const finalSignerName = signerName?.trim() || defaultName;

      const hasCustomerSigned = !!contract.customerSignature;
      const newStatus = hasCustomerSigned ? 'signed_by_both' : 'signed_by_one';

      await prisma.$executeRawUnsafe(
        `
        UPDATE "customer_contracts"
        SET 
          "adminSignature" = $1,
          "adminSignedAt" = $2::timestamp,
          "adminSignerName" = $3,
          "status" = $4,
          "updatedAt" = $5::timestamp
        WHERE id = $6::uuid;
        `,
        signature,
        nowIso,
        finalSignerName,
        newStatus,
        nowIso,
        id
      );

      return NextResponse.json({
        success: true,
        message: 'امضای الکترونیکی سوپرادمین با موفقیت ثبت شد و قرارداد قفل گردید',
        status: newStatus,
        signedAt: nowIso,
        signerName: finalSignerName,
      });
    } else {
      return NextResponse.json({ error: 'دسترسی غیرمجاز به ثبت امضا' }, { status: 403 });
    }
  } catch (error: any) {
    console.error('Sign contract error:', error);
    return NextResponse.json({ error: 'خطا در ثبت امضا: ' + error.message }, { status: 500 });
  }
}
