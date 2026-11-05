import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

function getAuth(req: NextRequest) {
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
    return decoded;
  } catch {
    return null;
  }
}

function parseLeaveMetadata(reasonStr: string | null | undefined) {
  if (!reasonStr) {
    return {
      description: '',
      leaveMode: 'daily' as const,
      substituteId: '',
      substituteName: '',
      requesterId: '',
      requesterName: '',
      transferredTasksCount: 0,
      transferredTasks: [],
    };
  }

  if (reasonStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(reasonStr);
      return {
        description: parsed.description || '',
        leaveMode: parsed.leaveMode || 'daily',
        startTime: parsed.startTime || '',
        endTime: parsed.endTime || '',
        durationHours: parsed.durationHours || 0,
        durationDays: parsed.durationDays || 1,
        substituteId: parsed.substituteId || '',
        substituteName: parsed.substituteName || '',
        requesterId: parsed.requesterId || '',
        requesterName: parsed.requesterName || '',
        transferredTasksCount: parsed.transferredTasksCount || 0,
        transferredTasks: parsed.transferredTasks || [],
        approvedById: parsed.approvedById || null,
        approvedByName: parsed.approvedByName || null,
        approvedAt: parsed.approvedAt || null,
        rejectReason: parsed.rejectReason || null,
      };
    } catch {
      // ignore JSON parse error and fallback
    }
  }

  return {
    description: reasonStr,
    leaveMode: 'daily' as const,
    substituteId: '',
    substituteName: '',
    requesterId: '',
    requesterName: '',
    transferredTasksCount: 0,
    transferredTasks: [],
  };
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';

  try {
    const userProfile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { id: true, firstName: true, lastName: true, role: true, active: true },
    });

    if (!userProfile || !userProfile.active) {
      return NextResponse.json({ error: 'حساب کاربری نامعتبر یا غیرفعال است' }, { status: 403 });
    }

    const isSuperAdmin = userProfile.role === 'super_admin' || userProfile.role === 'owner';
    const isAdmin = isSuperAdmin || userProfile.role === 'admin';

    // Action 1: Get transferable tasks for a user
    if (action === 'transferable_tasks') {
      const targetUserId = searchParams.get('userId') || userProfile.id;

      // Regular personnel can only inspect their own tasks
      if (!isSuperAdmin && targetUserId !== userProfile.id) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }

      const activeTasks = await prisma.task.findMany({
        where: {
          assignedTo: targetUserId,
          status: { in: ['in_progress', 'todo', 'pending', 'postponed'] },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          dueDate: true,
          progress: true,
        },
        orderBy: { dueDate: 'asc' },
      });

      return NextResponse.json({
        success: true,
        count: activeTasks.length,
        tasks: activeTasks,
      });
    }

    // Action 2: Get single leave detail
    if (action === 'detail') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'شناسه مرخصی الزامی است' }, { status: 400 });
      }

      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
      });

      if (!leave) {
        return NextResponse.json({ error: 'درخواست مرخصی یافت نشد' }, { status: 404 });
      }

      const metadata = parseLeaveMetadata(leave.reason);

      // Access control: only super_admin, admin, requester, or substitute can view
      if (!isAdmin && leave.employeeId !== userProfile.id && metadata.substituteId !== userProfile.id) {
        return NextResponse.json({ error: 'دسترسی به این درخواست مجاز نیست' }, { status: 403 });
      }

      // Fetch profile details
      const [requester, substitute, approver] = await Promise.all([
        prisma.profile.findUnique({
          where: { id: leave.employeeId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            user: { select: { email: true } },
          },
        }),
        metadata.substituteId
          ? prisma.profile.findUnique({
              where: { id: metadata.substituteId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                user: { select: { email: true } },
              },
            })
          : null,
        metadata.approvedById
          ? prisma.profile.findUnique({
              where: { id: metadata.approvedById },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                user: { select: { email: true } },
              },
            })
          : null,
      ]);

      const formatProfileWithEmail = (p: any) =>
        p
          ? {
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              role: p.role,
              phone: p.phone,
              email: p.user?.email || null,
            }
          : null;

      const fullName = (p: any) =>
        p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.user?.email || p.email || 'نامشخص' : 'نامشخص';

      return NextResponse.json({
        success: true,
        leave: {
          ...leave,
          metadata,
          employeeName: fullName(requester),
          substituteName: fullName(substitute),
          approverName: fullName(approver),
          requester: formatProfileWithEmail(requester),
          substitute: formatProfileWithEmail(substitute),
          approver: formatProfileWithEmail(approver),
        },
      });
    }

    // Action 3: List leaves
    // SuperAdmin sees all; Regular users see only their own and ones where they are substitute
    const allLeaves = await prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Fetch all staff profiles to resolve names quickly
    const profiles = await prisma.profile.findMany({
      where: { userType: 'staff' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        user: { select: { email: true } },
      },
    });
    const profileMap = new Map(
      profiles.map((p) => [
        p.id,
        {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          role: p.role,
          phone: p.phone,
          email: p.user?.email || null,
        },
      ])
    );
    const getName = (id: string) => {
      const p = profileMap.get(id);
      return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || '—' : '—';
    };

    const enrichedLeaves = allLeaves.map((l) => {
      const meta = parseLeaveMetadata(l.reason);
      return {
        ...l,
        metadata: meta,
        employeeName: getName(l.employeeId),
        substituteName: meta.substituteId ? getName(meta.substituteId) : '—',
        approverName: meta.approvedById ? getName(meta.approvedById) : null,
      };
    });

    const visibleLeaves = isSuperAdmin
      ? enrichedLeaves
      : enrichedLeaves.filter(
          (l) =>
            l.employeeId === userProfile.id ||
            l.metadata.substituteId === userProfile.id ||
            (isAdmin && l.status === 'pending')
        );

    return NextResponse.json({
      success: true,
      leaves: visibleLeaves,
      isSuperAdmin,
      isAdmin,
      currentUserId: userProfile.id,
    });
  } catch (error: any) {
    console.error('Leaves API GET error:', error);
    return NextResponse.json({ error: error.message || 'خطا در بارگذاری مرخصی‌ها' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'create';

  try {
    const userProfile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { id: true, firstName: true, lastName: true, role: true, active: true, orgId: true },
    });

    if (!userProfile || !userProfile.active) {
      return NextResponse.json({ error: 'حساب کاربری نامعتبر یا غیرفعال است' }, { status: 403 });
    }

    const isSuperAdmin = userProfile.role === 'super_admin' || userProfile.role === 'owner';
    const isAdmin = isSuperAdmin || userProfile.role === 'admin';
    const myName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'کاربر';

    // 1. Action: CREATE LEAVE
    if (action === 'create') {
      const body = await req.json();
      const {
        leaveMode = 'daily',
        type = 'annual',
        startDate,
        endDate,
        startTime,
        endTime,
        durationHours,
        durationDays,
        substituteId,
        reason = '',
        employeeId,
      } = body;

      const applicantId = isSuperAdmin && employeeId ? employeeId : userProfile.id;

      if (!substituteId || substituteId === 'none') {
        return NextResponse.json({ error: 'انتخاب جانشین الزامی است' }, { status: 400 });
      }

      if (substituteId === applicantId) {
        return NextResponse.json({ error: 'امکان انتخاب خود به عنوان جانشین وجود ندارد' }, { status: 400 });
      }

      if (!startDate) {
        return NextResponse.json({ error: 'تاریخ شروع مرخصی الزامی است' }, { status: 400 });
      }

      if (leaveMode === 'hourly' && (!startTime || !endTime)) {
        return NextResponse.json({ error: 'تعیین ساعت شروع و پایان مرخصی ساعتی الزامی است' }, { status: 400 });
      }

      // Resolve applicant profile & substitute profile
      const [applicant, substitute] = await Promise.all([
        prisma.profile.findUnique({
          where: { id: applicantId },
          select: { id: true, firstName: true, lastName: true, role: true },
        }),
        prisma.profile.findUnique({
          where: { id: substituteId },
          select: { id: true, firstName: true, lastName: true, role: true },
        }),
      ]);

      if (!substitute) {
        return NextResponse.json({ error: 'جانشین انتخاب‌شده در سیستم یافت نشد' }, { status: 400 });
      }

      const applicantName = applicant
        ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim()
        : myName;
      const substituteName = `${substitute.firstName || ''} ${substitute.lastName || ''}`.trim();

      // Scan applicant's active tasks that can be transferred upon approval
      const activeTasks = await prisma.task.findMany({
        where: {
          assignedTo: applicantId,
          status: { in: ['in_progress', 'todo', 'pending', 'postponed'] },
        },
        select: { id: true, title: true, priority: true, status: true },
      });

      const metadata = {
        description: reason,
        leaveMode,
        startTime: startTime || '',
        endTime: endTime || '',
        durationHours: Number(durationHours) || 0,
        durationDays: Number(durationDays) || 1,
        substituteId,
        substituteName,
        requesterId: applicantId,
        requesterName: applicantName,
        transferredTasksCount: activeTasks.length,
        transferredTasks: [],
        approvedById: null,
        approvedByName: null,
        approvedAt: null,
        rejectReason: null,
      };

      const startDateTime = new Date(startDate);
      const endDateTime = endDate ? new Date(endDate) : new Date(startDate);

      const newLeave = await prisma.leaveRequest.create({
        data: {
          employeeId: applicantId,
          type: `${leaveMode}_${type}`,
          startDate: startDateTime,
          endDate: endDateTime,
          reason: JSON.stringify(metadata),
          status: 'pending',
          orgId: userProfile.orgId,
        },
      });

      // Send notification to substitute
      await prisma.notification.create({
        data: {
          profileId: substituteId,
          title: 'تعیین به عنوان جانشین مرخصی',
          body: `${applicantName} درخواست مرخصی ثبت کرده و شما را به عنوان جانشین مشخص نموده است.`,
          type: 'leave',
          priority: 'normal',
          link: `/dashboard/leaves/${newLeave.id}`,
        },
      }).catch(() => {});

      // Notify SuperAdmins / Admins
      const admins = await prisma.profile.findMany({
        where: {
          role: { in: ['super_admin', 'owner', 'admin'] },
          id: { not: applicantId },
          active: true,
        },
        select: { id: true },
      });

      await Promise.all(
        admins.map((adm) =>
          prisma.notification.create({
            data: {
              profileId: adm.id,
              title: 'درخواست مرخصی جدید',
              body: `${applicantName} درخواست مرخصی ${leaveMode === 'hourly' ? 'ساعتی' : 'روزانه'} ثبت کرده است (جانشین: ${substituteName}).`,
              type: 'leave',
              priority: 'normal',
              link: `/dashboard/leaves/${newLeave.id}`,
            },
          }).catch(() => {})
        )
      );

      return NextResponse.json({
        success: true,
        message: 'درخواست مرخصی با موفقیت ثبت شد',
        leave: { ...newLeave, metadata },
      });
    }

    // 2. Action: APPROVE LEAVE & TRANSFER TASKS
    if (action === 'approve') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'تنها مدیران و سوپرادمین مجاز به تأیید مرخصی هستند' }, { status: 403 });
      }

      const { id } = await req.json();
      if (!id) {
        return NextResponse.json({ error: 'شناسه مرخصی نامعتبر است' }, { status: 400 });
      }

      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave) {
        return NextResponse.json({ error: 'درخواست مرخصی یافت نشد' }, { status: 404 });
      }

      if (leave.status === 'approved') {
        return NextResponse.json({ error: 'این درخواست قبلاً تأیید شده است' }, { status: 400 });
      }

      const metadata = parseLeaveMetadata(leave.reason);

      if (!metadata.substituteId) {
        return NextResponse.json({ error: 'جانشینی برای این مرخصی مشخص نشده است' }, { status: 400 });
      }

      const substitute = await prisma.profile.findUnique({
        where: { id: metadata.substituteId },
        select: { id: true, firstName: true, lastName: true },
      });

      const requester = await prisma.profile.findUnique({
        where: { id: leave.employeeId },
        select: { id: true, firstName: true, lastName: true },
      });

      const substituteName = substitute
        ? `${substitute.firstName || ''} ${substitute.lastName || ''}`.trim()
        : metadata.substituteName || 'جانشین';
      const requesterName = requester
        ? `${requester.firstName || ''} ${requester.lastName || ''}`.trim()
        : metadata.requesterName || 'همکار';

      // Find active tasks currently assigned to the applicant (not completed / not cancelled)
      const tasksToTransfer = await prisma.task.findMany({
        where: {
          assignedTo: leave.employeeId,
          status: { in: ['in_progress', 'todo', 'pending', 'postponed'] },
        },
      });

      const transferredRecordList: any[] = [];
      const nowIso = new Date().toISOString();

      // Transfer each task and log in TaskComment / history
      for (const task of tasksToTransfer) {
        // Prevent duplicate referral if already assigned
        if (task.assignedTo === metadata.substituteId) continue;

        // Update task assignee and referredDate
        await prisma.task.update({
          where: { id: task.id },
          data: {
            assignedTo: metadata.substituteId,
            referredDate: new Date(),
          },
        });

        // Add audit comment in task_comments
        await prisma.taskComment.create({
          data: {
            taskId: task.id,
            profileId: userProfile.id,
            content: `[ارجاع خودکار مرخصی]: به علت مرخصی تأییدشده همکار گرامی «${requesterName}»، مسئولیت این وظیفه به «${substituteName}» به عنوان جانشین محول گردید. (شناسه مرخصی: ${leave.id})`,
          },
        }).catch(() => {});

        // Notification for substitute per task
        await prisma.notification.create({
          data: {
            profileId: metadata.substituteId,
            title: 'ارجاع وظیفه به علت مرخصی',
            body: `وظیفه «${task.title}» به علت مرخصی ${requesterName} به شما ارجاع داده شد.`,
            type: 'task',
            priority: 'high',
            link: '/dashboard/tasks',
          },
        }).catch(() => {});

        transferredRecordList.push({
          taskId: task.id,
          taskTitle: task.title,
          previousAssigneeId: leave.employeeId,
          previousAssigneeName: requesterName,
          newAssigneeId: metadata.substituteId,
          newAssigneeName: substituteName,
          transferredAt: nowIso,
          status: task.status,
        });
      }

      // Update leave request metadata
      const updatedMetadata = {
        ...metadata,
        approvedById: userProfile.id,
        approvedByName: myName,
        approvedAt: nowIso,
        transferredTasksCount: transferredRecordList.length,
        transferredTasks: transferredRecordList,
        rejectReason: null,
      };

      const updatedLeave = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reason: JSON.stringify(updatedMetadata),
        },
      });

      // Notify requester that leave is approved
      await prisma.notification.create({
        data: {
          profileId: leave.employeeId,
          title: 'درخواست مرخصی شما تأیید شد',
          body: `درخواست مرخصی شما توسط ${myName} تأیید گردید و ${transferredRecordList.length} وظیفه فعال شما به جانشین منتقل شد.`,
          type: 'leave',
          priority: 'normal',
          link: `/dashboard/leaves/${id}`,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `مرخصی با موفقیت تأیید شد و تعداد ${transferredRecordList.length} تسک به جانشین ارجاع گردید.`,
        leave: { ...updatedLeave, metadata: updatedMetadata },
        transferredCount: transferredRecordList.length,
      });
    }

    // 3. Action: REJECT LEAVE
    if (action === 'reject') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'تنها مدیران و سوپرادمین مجاز به رد مرخصی هستند' }, { status: 403 });
      }

      const { id, rejectReason = 'موافقت نشد' } = await req.json();
      if (!id) {
        return NextResponse.json({ error: 'شناسه مرخصی نامعتبر است' }, { status: 400 });
      }

      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave) {
        return NextResponse.json({ error: 'درخواست مرخصی یافت نشد' }, { status: 404 });
      }

      const metadata = parseLeaveMetadata(leave.reason);
      const updatedMetadata = {
        ...metadata,
        approvedById: userProfile.id,
        approvedByName: myName,
        approvedAt: new Date().toISOString(),
        rejectReason,
      };

      const updatedLeave = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reason: JSON.stringify(updatedMetadata),
        },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          profileId: leave.employeeId,
          title: 'درخواست مرخصی شما رد شد',
          body: `درخواست مرخصی شما توسط ${myName} رد شد. دلیل: ${rejectReason}`,
          type: 'leave',
          priority: 'normal',
          link: `/dashboard/leaves/${id}`,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'درخواست مرخصی رد شد',
        leave: { ...updatedLeave, metadata: updatedMetadata },
      });
    }

    // 4. Action: CANCEL LEAVE
    if (action === 'cancel') {
      const { id } = await req.json();
      if (!id) {
        return NextResponse.json({ error: 'شناسه مرخصی نامعتبر است' }, { status: 400 });
      }

      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave) {
        return NextResponse.json({ error: 'درخواست مرخصی یافت نشد' }, { status: 404 });
      }

      if (!isAdmin && leave.employeeId !== userProfile.id) {
        return NextResponse.json({ error: 'شما مجاز به لغو این درخواست نیستید' }, { status: 403 });
      }

      const updatedLeave = await prisma.leaveRequest.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      return NextResponse.json({
        success: true,
        message: 'درخواست مرخصی لغو شد',
        leave: updatedLeave,
      });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر است' }, { status: 400 });
  } catch (error: any) {
    console.error('Leaves API POST error:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت یا به‌روزرسانی مرخصی' }, { status: 500 });
  }
}
