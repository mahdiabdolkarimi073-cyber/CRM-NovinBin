import { prisma } from '@/lib/prisma';
import { sendMeetingReminderSms, sendExpiryReminder, normalizeMobile } from '@/lib/sms';

const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

let schedulerStarted = false;

export function startSmsScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log('[SMS Scheduler] زمان‌بند پیامک سرور فعال شد (هر ۵ دقیقه)');

  processSmsReminders().catch((err) =>
    console.error('[SMS Scheduler] خطا در اجرای اولیه:', err)
  );

  setInterval(() => {
    processSmsReminders().catch((err) =>
      console.error('[SMS Scheduler] خطا در اجرای دوره‌ای:', err)
    );
  }, POLL_INTERVAL_MS);
}

export async function processSmsReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - REMINDER_WINDOW_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      smsSent: false,
      date: { gte: windowStart, lte: windowEnd },
      OR: [
        { staffPhone: { not: null } },
        { customerPhone: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      topic: true,
      date: true,
      staffPhone: true,
      customerPhone: true,
      mainResponsibleId: true,
    },
  });

  console.log('[SMS Scheduler] جلسات نیازمند پیامک:', upcomingMeetings.length);

  for (const meeting of upcomingMeetings) {
    let staffSent = false;
    let customerSent = false;
    const meetingTitle = meeting.topic || meeting.title || 'جلسه';
    const meetingDate = new Date(meeting.date);

    let responsibleProfile: any = null;
    if (meeting.mainResponsibleId) {
      responsibleProfile = await prisma.profile.findUnique({
        where: { id: meeting.mainResponsibleId },
        select: { firstName: true, lastName: true },
      });
    }

    const staffName = responsibleProfile
      ? `${responsibleProfile.firstName || ''} ${responsibleProfile.lastName || ''}`.trim()
      : 'کاربر گرامی';

    if (meeting.staffPhone && normalizeMobile(meeting.staffPhone)) {
      const result = await sendMeetingReminderSms(
        meeting.id,
        meeting.staffPhone,
        staffName,
        meetingTitle,
        meetingDate
      );
      staffSent = result.success;
    }

    if (meeting.customerPhone && normalizeMobile(meeting.customerPhone)) {
      const result = await sendMeetingReminderSms(
        meeting.id,
        meeting.customerPhone,
        meeting.title || 'مشتری گرامی',
        meetingTitle,
        meetingDate
      );
      customerSent = result.success;
    }

    if (staffSent || customerSent) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { smsSent: true, smsSentAt: new Date() },
      });
    }
  }

  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueHosts = await prisma.hostDomain.findMany({
    where: {
      smsSent: false,
      expiryDate: { lte: oneWeekLater, gte: now },
    },
  });

  for (const hd of dueHosts) {
    const result = await sendExpiryReminder(hd.id, hd.phoneNumber, hd.firstName, hd.lastName);
    if (result.success) {
      await prisma.hostDomain.update({
        where: { id: hd.id },
        data: { smsSent: true, smsSentAt: new Date() },
      });
    }
  }

  return { meetings: upcomingMeetings.length, hosts: dueHosts.length };
}
