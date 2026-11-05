import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { normalizeIranianMobile } from '@/lib/phone-validation';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      demoSlug?: string;
      demoOrgId?: string;
      demoExpiry?: string;
    };
    if (decoded.demoSlug && decoded.demoExpiry) {
      if (new Date(decoded.demoExpiry) < new Date()) {
        return null;
      }
    }
    const profile = await prisma.profile.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, userType: true, orgId: true, firstName: true, lastName: true },
    });
    if (!profile) return null;
    return { ...decoded, profile };
  } catch {
    return null;
  }
}

// Helper to serialize bigints and dates
function serialize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serialize);
  if (typeof data === 'object') {
    const res: any = {};
    for (const k of Object.keys(data)) {
      res[k] = serialize(data[k]);
    }
    return res;
  }
  return data;
}

// GET /api/leads/[id]/convert - Preview conversion & duplicate check
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'شناسه سرنخ ارسال نشده است' }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        followUps: { select: { id: true } },
        referrals: { select: { id: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'سرنخ یافت نشد' }, { status: 404 });
    }

    const leadOrgId = lead.orgId || auth.demoOrgId || auth.profile.orgId;

    // Check if already converted
    if (lead.status === 'converted' && lead.customerId) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: lead.customerId },
      });
      return NextResponse.json({
        alreadyConverted: true,
        customer: serialize(existingCustomer),
        lead: serialize(lead),
      });
    }

    // Check for existing customer (deduplication check)
    let matchedCustomer = null;

    if (lead.phone && lead.phone.trim()) {
      const pCheck = normalizeIranianMobile(lead.phone);
      const normalizedPhone = pCheck.isValid ? pCheck.normalized : lead.phone.trim();

      matchedCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { mobile: normalizedPhone },
            { phone: lead.phone.trim() },
            { mobile: lead.phone.trim() },
          ],
          ...(leadOrgId ? { orgId: leadOrgId } : {}),
        },
      });
    }

    if (!matchedCustomer && lead.email && lead.email.trim()) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          email: { equals: lead.email.trim(), mode: 'insensitive' },
          ...(leadOrgId ? { orgId: leadOrgId } : {}),
        },
      });
    }

    if (!matchedCustomer && lead.company && lead.company.trim().length >= 3) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          companyName: { equals: lead.company.trim(), mode: 'insensitive' },
          ...(leadOrgId ? { orgId: leadOrgId } : {}),
        },
      });
    }

    const opportunityCount = await prisma.opportunity.count({
      where: { leadId: lead.id },
    });

    return NextResponse.json({
      alreadyConverted: false,
      lead: serialize(lead),
      matchedCustomer: serialize(matchedCustomer),
      followUpCount: lead.followUps.length,
      opportunityCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'خطا در بررسی سرنخ' }, { status: 500 });
  }
}

// POST /api/leads/[id]/convert - Atomic conversion
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'شناسه سرنخ ارسال نشده است' }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        followUps: { orderBy: { createdAt: 'asc' } },
        referrals: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'سرنخ یافت نشد' }, { status: 404 });
    }

    const leadOrgId = lead.orgId || auth.demoOrgId || auth.profile.orgId;

    // Idempotency: if already converted and customer exists, return safely
    if (lead.status === 'converted' && lead.customerId) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: lead.customerId },
      });
      return NextResponse.json({
        success: true,
        alreadyConverted: true,
        customer: serialize(existingCustomer),
        message: 'این سرنخ قبلاً به مشتری تبدیل شده است.',
      });
    }

    // 1. Check for duplicates in Customers
    let matchedCustomer = null;

    if (lead.phone && lead.phone.trim()) {
      const pCheck = normalizeIranianMobile(lead.phone);
      const normalizedPhone = pCheck.isValid ? pCheck.normalized : lead.phone.trim();

      matchedCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { mobile: normalizedPhone },
            { phone: lead.phone.trim() },
            { mobile: lead.phone.trim() },
          ],
          ...(leadOrgId ? { orgId: leadOrgId } : {}),
        },
      });
    }

    if (!matchedCustomer && lead.email && lead.email.trim()) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          email: { equals: lead.email.trim(), mode: 'insensitive' },
          ...(leadOrgId ? { orgId: leadOrgId } : {}),
        },
      });
    }

    if (!matchedCustomer && lead.company && lead.company.trim().length >= 3) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          companyName: { equals: lead.company.trim(), mode: 'insensitive' },
          ...(leadOrgId ? { orgId: leadOrgId } : {}),
        },
      });
    }

    // 2. Perform Atomic Transaction via Prisma
    const transactionResult = await prisma.$transaction(async (tx) => {
      let customerId: string;
      let finalCustomer: any = null;
      let isNewCustomer = false;

      if (matchedCustomer) {
        // Prevent duplicate - link to existing customer and enrich missing fields
        customerId = matchedCustomer.id;
        const updateData: any = {};

        if (!matchedCustomer.phone && lead.phone) updateData.phone = lead.phone;
        if (!matchedCustomer.mobile && lead.phone) updateData.mobile = lead.phone;
        if (!matchedCustomer.email && lead.email) updateData.email = lead.email;
        if (!matchedCustomer.city && lead.city) updateData.city = lead.city;
        if (!matchedCustomer.companyName && lead.company) updateData.companyName = lead.company;
        if (!matchedCustomer.source) updateData.source = lead.source || 'تبدیل از سرنخ';
        if (!matchedCustomer.assignedTo && lead.assignedTo) updateData.assignedTo = lead.assignedTo;

        if (lead.notes && lead.notes.trim()) {
          if (!matchedCustomer.notes) {
            updateData.notes = lead.notes.trim();
          } else if (!matchedCustomer.notes.includes(lead.notes.trim())) {
            updateData.notes = `${matchedCustomer.notes}\n[سوابق سرنخ]: ${lead.notes.trim()}`;
          }
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          finalCustomer = await tx.customer.update({
            where: { id: customerId },
            data: updateData,
          });
        } else {
          finalCustomer = matchedCustomer;
        }
      } else {
        // Create new customer
        isNewCustomer = true;
        const nameParts = (lead.name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'مشتری';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
        const customerType = lead.company ? 'company' : 'individual';

        finalCustomer = await tx.customer.create({
          data: {
            orgId: leadOrgId || null,
            type: customerType,
            firstName,
            lastName,
            companyName: lead.company || null,
            phone: lead.phone || null,
            mobile: lead.phone || null,
            email: lead.email || null,
            city: lead.city || null,
            source: lead.source || 'تبدیل از سرنخ',
            score: lead.score || 0,
            level: 'bronze',
            notes: lead.notes || null,
            serviceTypes: (lead.serviceTypes as any) || [],
            additionalPhones: (lead.additionalPhones as any) || [],
            assignedTo: lead.assignedTo || auth.userId,
            createdBy: auth.userId,
          },
        });
        customerId = finalCustomer.id;

        // Ensure sales representative has record in my_customers
        const targetProfileId = lead.assignedTo || auth.userId;
        const existingMyCustomer = await tx.myCustomer.findFirst({
          where: {
            profileId: targetProfileId,
            OR: [
              ...(lead.phone ? [{ mobile: lead.phone }, { phone: lead.phone }] : []),
              ...(lead.email ? [{ email: lead.email }] : []),
            ],
          },
        });

        if (!existingMyCustomer) {
          await tx.myCustomer.create({
            data: {
              profileId: targetProfileId,
              type: customerType,
              firstName,
              lastName,
              companyName: lead.company || null,
              phone: lead.phone || null,
              mobile: lead.phone || null,
              email: lead.email || null,
              city: lead.city || null,
              notes: lead.notes || null,
            },
          });
        }
      }

      // Link any opportunities
      await tx.opportunity.updateMany({
        where: { leadId: lead.id },
        data: { customerId },
      });

      // Transfer past follow-ups into customer interactions
      for (const fu of lead.followUps) {
        await tx.customerInteraction.create({
          data: {
            orgId: leadOrgId || null,
            customerId,
            type: 'call',
            direction: 'outbound',
            subject: 'پیگیری سرنخ فروش (قبل از تبدیل)',
            content: fu.result || 'پیگیری سرنخ انجام شد',
            outcome: 'follow_up',
            handledBy: fu.createdBy || auth.userId,
            interactionDate: fu.createdAt,
            createdAt: fu.createdAt,
          },
        });
      }

      // Create an audit note in customer interactions documenting conversion
      const staffName = `${auth.profile.firstName || ''} ${auth.profile.lastName || ''}`.trim() || 'کاربر سیستم';
      await tx.customerInteraction.create({
        data: {
          orgId: leadOrgId || null,
          customerId,
          type: 'note',
          direction: 'inbound',
          subject: `تبدیل سرنخ فروش به مشتری (${lead.name})`,
          content: `این پرونده از سرنخ فروش با موفقیت توسط ${staffName} تبدیل گردید.` +
            (lead.company ? `\nسازمان / شرکت: ${lead.company}` : '') +
            (lead.source ? `\nمنبع: ${lead.source}` : '') +
            (lead.notes ? `\nیادداشت‌های سرنخ: ${lead.notes}` : '') +
            (isNewCustomer ? '\nپرونده مشتری جدید ایجاد گردید.' : '\nبه پرونده مشتری موجود متصل گردید (عدم ثبت اطلاعات تکراری).'),
          outcome: 'positive',
          handledBy: auth.userId,
          interactionDate: new Date(),
        },
      });

      // Update lead status to 'converted' and link customerId
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'converted',
          customerId,
          updatedAt: new Date(),
        },
      });

      // Send notification to assignee if different from current operator
      if (lead.assignedTo && lead.assignedTo !== auth.userId) {
        await tx.notification.create({
          data: {
            profileId: lead.assignedTo,
            title: 'تبدیل سرنخ به مشتری',
            body: `سرنخ «${lead.name}» توسط ${staffName} با موفقیت به مشتری تبدیل شد.`,
            type: 'lead_converted',
            priority: 'normal',
            link: '/dashboard/customers',
          },
        }).catch(() => {});
      }

      return {
        customer: finalCustomer,
        updatedLead,
        isNewCustomer,
      };
    });

    return NextResponse.json({
      success: true,
      message: transactionResult.isNewCustomer
        ? 'سرنخ با موفقیت به مشتری جدید تبدیل شد و تمام سوابق منتقل گردید.'
        : 'سرنخ به پرونده مشتری موجود متصل شد و سوابق پیگیری یکپارچه گردید (بدون ایجاد اطلاعات تکراری).',
      customer: serialize(transactionResult.customer),
      updatedLead: serialize(transactionResult.updatedLead),
      isNewCustomer: transactionResult.isNewCustomer,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'خطا در فرآیند تبدیل سرنخ به مشتری',
    }, { status: 500 });
  }
}
