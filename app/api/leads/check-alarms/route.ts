import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALARM_INTERVALS_DAYS: Record<string, number> = {
  serious: 2,
  contacted: 3,
  new: 4,
};

export async function POST(req: NextRequest) {
  try {
    const leads = await prisma.lead.findMany({
      where: { status: { in: ['serious', 'contacted', 'new'] } },
      select: { id: true, name: true, status: true, assignedTo: true, updatedAt: true, createdAt: true },
    });

    const now = Date.now();
    let created = 0;

    for (const lead of leads) {
      const days = ALARM_INTERVALS_DAYS[lead.status];
      if (!days) continue;
      const lastUpdate = lead.updatedAt ? new Date(lead.updatedAt).getTime() : new Date(lead.createdAt).getTime();
      const elapsedDays = Math.floor((now - lastUpdate) / (24 * 60 * 60 * 1000));
      if (elapsedDays < days) continue;

      const intervalLabel = days.toLocaleString('fa-IR');
      const statusLabel =
        lead.status === 'serious' ? 'پیگیری جدی' :
        lead.status === 'contacted' ? 'در حال پیگیری' : 'جدید';

      const recipientIds = new Set<string>();
      if (lead.assignedTo) recipientIds.add(lead.assignedTo);

      const referrals = await prisma.leadReferral.findMany({
        where: { leadId: lead.id, status: 'active' },
        select: { referredToProfileId: true },
      });
      referrals.forEach((r) => { if (r.referredToProfileId) recipientIds.add(r.referredToProfileId); });

      const existing = await prisma.notification.findFirst({
        where: {
          type: 'lead_alarm',
          link: `/dashboard/leads`,
          createdAt: { gte: new Date(now - days * 24 * 60 * 60 * 1000) },
          profileId: { in: Array.from(recipientIds) },
        },
        select: { id: true },
      });
      if (existing) continue;

      const title = `هشدار پیگیری سرنخ: ${lead.name}`;
      const body = `سرنخ با وضعیت «${statusLabel}» برای ${intervalLabel} روز بدون تغییر مانده است.`;

      for (const profileId of Array.from(recipientIds)) {
        await prisma.notification.create({
          data: { profileId, title, body, type: 'lead_alarm', priority: 'high', link: '/dashboard/leads' },
        }).catch(() => {});
        created++;
      }
    }

    return NextResponse.json({ success: true, notificationsCreated: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
