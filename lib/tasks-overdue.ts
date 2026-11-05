import { prisma } from '@/lib/prisma';
import { toPersianDigits } from '@/lib/format';

/**
 * Checks if a task is overdue based on due date/time and its status.
 * A task is considered overdue if:
 * 1. Its status is already 'postponed' (unless completed/cancelled)
 * 2. OR its dueDate (date + time) has passed AND status is not 'completed' and not 'cancelled'
 */
export function isTaskOverdue(task: {
  dueDate?: string | Date | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!task) return false;
  const status = task.status || '';
  if (status === 'completed' || status === 'cancelled') return false;
  if (status === 'postponed') return true;
  if (!task.dueDate) return false;

  const due = new Date(task.dueDate).getTime();
  return !isNaN(due) && due < Date.now();
}

/**
 * Calculates human-readable delay duration from due date in Persian
 */
export function getOverdueDelayInfo(dueDate: string | Date | null | undefined): {
  isOverdue: boolean;
  delayText: string;
  delayMs: number;
  days: number;
  hours: number;
} {
  if (!dueDate) {
    return { isOverdue: false, delayText: 'نامشخص', delayMs: 0, days: 0, hours: 0 };
  }

  const dueTime = new Date(dueDate).getTime();
  if (isNaN(dueTime)) {
    return { isOverdue: false, delayText: 'نامشخص', delayMs: 0, days: 0, hours: 0 };
  }

  const now = Date.now();
  const diffMs = now - dueTime;

  if (diffMs <= 0) {
    return { isOverdue: false, delayText: 'هنوز نرسیده', delayMs: 0, days: 0, hours: 0 };
  }

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  let delayText = '';
  if (days > 0) {
    if (remainingHours > 0) {
      delayText = `${toPersianDigits(days)} روز و ${toPersianDigits(remainingHours)} ساعت تأخیر`;
    } else {
      delayText = `${toPersianDigits(days)} روز تأخیر`;
    }
  } else if (totalHours > 0) {
    if (remainingMinutes > 0) {
      delayText = `${toPersianDigits(totalHours)} ساعت و ${toPersianDigits(remainingMinutes)} دقیقه تأخیر`;
    } else {
      delayText = `${toPersianDigits(totalHours)} ساعت تأخیر`;
    }
  } else {
    delayText = `${toPersianDigits(Math.max(1, totalMinutes))} دقیقه تأخیر`;
  }

  return {
    isOverdue: true,
    delayText,
    delayMs: diffMs,
    days,
    hours: totalHours,
  };
}

let isSyncing = false;

/**
 * Periodically and atomically scans tasks whose due date + time has passed
 * and marks them as 'postponed' if not already completed, cancelled, or postponed.
 * Also logs the auto-detection into AuditLog.
 */
export async function syncOverdueTasks(): Promise<{ updatedCount: number }> {
  if (isSyncing) {
    return { updatedCount: 0 };
  }

  isSyncing = true;
  try {
    const now = new Date();

    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['completed', 'cancelled', 'postponed'] },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        orgId: true,
        assignedTo: true,
        status: true,
      },
      take: 100,
    });

    if (overdueTasks.length === 0) {
      return { updatedCount: 0 };
    }

    const ids = overdueTasks.map((t) => t.id);

    // Atomically transition all detected tasks to 'postponed'
    await prisma.task.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'postponed',
        updatedAt: now,
      },
    });

    // Record audit logs for accountability
    const auditEntries = overdueTasks.map((t) => ({
      orgId: t.orgId,
      action: 'AUTO_OVERDUE_DETECTION',
      entity: 'tasks',
      entityId: t.id,
      details: {
        reason: 'موعد مقرر وظیفه سپری شده و سیستم آن را به صورت خودکار به وضعیت به تعویق افتاده منتقل نمود',
        previousStatus: t.status,
        newStatus: 'postponed',
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        detectedAt: now.toISOString(),
      },
    }));

    await prisma.auditLog.createMany({
      data: auditEntries,
      skipDuplicates: true,
    }).catch(() => {});

    return { updatedCount: overdueTasks.length };
  } catch (error) {
    console.error('[OVERDUE TASKS SYNC ERROR]', error);
    return { updatedCount: 0 };
  } finally {
    isSyncing = false;
  }
}

// Background recurring timer in server context (runs every 60 seconds)
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.__overdueTasksSyncTimer) {
    g.__overdueTasksSyncTimer = setInterval(() => {
      syncOverdueTasks().catch(() => {});
    }, 60 * 1000);
  }
}
