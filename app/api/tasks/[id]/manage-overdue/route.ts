import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { isTaskOverdue, getOverdueDelayInfo } from '@/lib/tasks-overdue';

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
      select: {
        id: true,
        role: true,
        userType: true,
        orgId: true,
        firstName: true,
        lastName: true,
      },
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

// PUT /api/tasks/[id]/manage-overdue - Exclusive SuperAdmin management for overdue tasks
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  // STRICT SECURITY CHECK:
  // Only users with verified 'super_admin' or 'owner' role extracted from server JWT
  // are allowed to manage overdue tasks!
  const isSuperAdmin = auth.profile.role === 'super_admin' || auth.profile.role === 'owner';
  if (!isSuperAdmin) {
    return NextResponse.json(
      {
        error: 'دسترسی غیرمجاز: طبق قوانین امنیتی سامانه، مدیریت، تغییر مسئول و تعیین موعد وظایف به تعویق افتاده منحصراً در اختیار سوپرادمین می‌باشد.',
      },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'شناسه وظیفه ارسال نشده است' }, { status: 400 });
  }

  try {
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignees: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'وظیفه مورد نظر یافت نشد' }, { status: 404 });
    }

    const body = await req.json();
    const {
      dueDate, // ISO string or datetime
      assignedTo,
      status,
      priority,
      title,
      description,
      adminNote, // Managerial explanation / direction
    } = body;

    const previousValues = {
      dueDate: existingTask.dueDate ? existingTask.dueDate.toISOString() : null,
      assignedTo: existingTask.assignedTo,
      status: existingTask.status,
      priority: existingTask.priority,
      title: existingTask.title,
      description: existingTask.description,
    };

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    const changedFields: string[] = [];

    // Title & description updates if provided
    if (typeof title === 'string' && title.trim() && title.trim() !== existingTask.title) {
      updatePayload.title = title.trim();
      changedFields.push('title');
    }
    if (typeof description === 'string' && description !== existingTask.description) {
      updatePayload.description = description;
      changedFields.push('description');
    }

    // Assignee update
    if (assignedTo !== undefined && assignedTo !== existingTask.assignedTo) {
      updatePayload.assignedTo = assignedTo || null;
      changedFields.push('assignedTo');
    }

    // Priority update
    if (priority && priority !== existingTask.priority) {
      updatePayload.priority = priority;
      changedFields.push('priority');
    }

    // Due date update
    let targetDueDate = existingTask.dueDate;
    if (dueDate !== undefined) {
      const parsed = dueDate ? new Date(dueDate) : null;
      targetDueDate = parsed;
      updatePayload.dueDate = parsed;
      if (previousValues.dueDate !== (parsed ? parsed.toISOString() : null)) {
        changedFields.push('dueDate');
      }
    }

    // Status management logic (Requirement #6):
    // 1. If explicit status given: apply it
    // 2. If new dueDate is set in the future (> now) and status is not completed/cancelled:
    //    automatically restore status to 'in_progress' so task exits overdue list!
    // 3. If new dueDate is still in the past, and not completed/cancelled: remains 'postponed'
    let targetStatus = status || existingTask.status;

    if (status && status !== existingTask.status) {
      targetStatus = status;
      changedFields.push('status');
    } else if (targetDueDate && targetDueDate.getTime() > Date.now()) {
      // Due date was extended to the future!
      if (targetStatus === 'postponed') {
        targetStatus = 'in_progress';
        changedFields.push('status (auto-restored to in_progress)');
      }
    }

    updatePayload.status = targetStatus;

    if (targetStatus === 'completed' && !existingTask.completedAt) {
      updatePayload.completedAt = new Date();
      changedFields.push('completedAt');
    } else if (targetStatus !== 'completed' && existingTask.completedAt) {
      updatePayload.completedAt = null;
      changedFields.push('completedAt (cleared)');
    }

    // Execute atomic update
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updatePayload,
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        assignees: true,
      },
    });

    const superAdminName = `${auth.profile.firstName || ''} ${auth.profile.lastName || ''}`.trim() || 'سوپرادمین';

    // Append administrative comment if note provided
    if (adminNote && typeof adminNote === 'string' && adminNote.trim()) {
      await prisma.taskComment.create({
        data: {
          taskId: id,
          profileId: auth.userId,
          content: `[دستور مدیریتی سوپرادمین]: ${adminNote.trim()}`,
        },
      }).catch(() => {});
    }

    // Record complete history in AuditLog (Requirement #8)
    await prisma.auditLog.create({
      data: {
        orgId: existingTask.orgId,
        userId: auth.userId,
        action: 'SUPERADMIN_MANAGE_OVERDUE_TASK',
        entity: 'tasks',
        entityId: id,
        details: {
          adminName: superAdminName,
          adminRole: auth.profile.role,
          adminNote: adminNote?.trim() || null,
          changedFields,
          previousValues,
          newValues: {
            dueDate: updatePayload.dueDate ? updatePayload.dueDate.toISOString() : previousValues.dueDate,
            assignedTo: updatePayload.assignedTo !== undefined ? updatePayload.assignedTo : previousValues.assignedTo,
            status: targetStatus,
            priority: updatePayload.priority || previousValues.priority,
          },
          timestamp: new Date().toISOString(),
        },
      },
    }).catch((err) => console.error('[AUDIT LOG ERROR]', err));

    // Send notifications to the affected assignee(s)
    const targetAssigneeId = updatePayload.assignedTo || existingTask.assignedTo;
    if (targetAssigneeId && targetAssigneeId !== auth.userId) {
      await prisma.notification.create({
        data: {
          profileId: targetAssigneeId,
          title: 'مدیریت و تعیین تکلیف وظیفه توسط سوپرادمین',
          body: `وظیفه «${existingTask.title}» توسط سوپرادمین (${superAdminName}) بازبینی شد. وضعیت: ${targetStatus === 'completed' ? 'تکمیل‌شده' : targetStatus === 'cancelled' ? 'لغوشده' : 'در حال انجام'}.`,
          type: 'task',
          priority: 'urgent',
          link: '/dashboard/tasks',
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      task: serialize(updatedTask),
      message: 'وظیفه معوق با موفقیت توسط سوپرادمین مدیریت و ذخیره شد.',
    });
  } catch (error: any) {
    console.error('[MANAGE OVERDUE TASK ERROR]', error);
    return NextResponse.json({ error: 'خطا در مدیریت وظیفه: ' + error.message }, { status: 500 });
  }
}
