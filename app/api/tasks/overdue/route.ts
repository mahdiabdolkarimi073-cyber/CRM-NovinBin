import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { isTaskOverdue, getOverdueDelayInfo, syncOverdueTasks } from '@/lib/tasks-overdue';

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

// GET /api/tasks/overdue - Fetch overdue tasks with role-based scoping
export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  // Trigger non-blocking smart background sync for overdue tasks
  syncOverdueTasks().catch(() => {});

  const isSuperAdmin = auth.profile.role === 'super_admin' || auth.profile.role === 'owner';
  const orgId = auth.demoOrgId || auth.profile.orgId;
  const now = new Date();

  try {
    // Condition for overdue:
    // 1. status is 'postponed'
    // OR 2. dueDate < now AND status NOT IN ('completed', 'cancelled')
    const overdueCondition: any = {
      OR: [
        { status: 'postponed' },
        {
          dueDate: { lt: now },
          status: { notIn: ['completed', 'cancelled'] },
        },
      ],
      status: { notIn: ['completed', 'cancelled'] },
    };

    let where: any = {
      ...overdueCondition,
    };

    if (orgId) {
      where.orgId = orgId;
    }

    // Role-based access control:
    // SuperAdmin / Owner: sees ALL overdue tasks in the organization
    // Regular personnel / regular admin: sees ONLY overdue tasks assigned to them,
    // created by them, or where they are an assigned collaborator.
    if (!isSuperAdmin) {
      where = {
        ...where,
        AND: [
          {
            OR: [
              { assignedTo: auth.userId },
              { createdBy: auth.userId },
              { assignees: { some: { profileId: auth.userId } } },
            ],
          },
        ],
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' }, // Most overdue first
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        assignees: true,
      },
    });

    // Fetch related profile names for assignees and creators
    const userIds = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignedTo) userIds.add(t.assignedTo);
      if (t.createdBy) userIds.add(t.createdBy);
      t.assignees?.forEach((a) => userIds.add(a.profileId));
    });

    const profiles = await prisma.profile.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true,
      },
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Format tasks with detailed delay info and profile data
    const formatted = tasks.map((t) => {
      const delay = getOverdueDelayInfo(t.dueDate);
      const assignee = t.assignedTo ? profileMap.get(t.assignedTo) : null;
      const creator = t.createdBy ? profileMap.get(t.createdBy) : null;
      const collaborators = (t.assignees || []).map((a) => profileMap.get(a.profileId)).filter(Boolean);

      return {
        ...serialize(t),
        delayInfo: delay,
        assigneeProfile: assignee ? serialize(assignee) : null,
        creatorProfile: creator ? serialize(creator) : null,
        collaboratorProfiles: collaborators.map(serialize),
        isOverdue: true,
      };
    });

    // Also get the total overdue count in the organization (for badge display)
    const totalOrgOverdueCount = await prisma.task.count({
      where: {
        ...(orgId ? { orgId } : {}),
        ...overdueCondition,
      },
    });

    return NextResponse.json({
      tasks: formatted,
      count: formatted.length,
      totalOrgOverdueCount,
      isSuperAdmin,
    });
  } catch (error: any) {
    console.error('[GET OVERDUE TASKS ERROR]', error);
    return NextResponse.json({ error: 'خطا در بارگذاری وظایف به تعویق افتاده: ' + error.message }, { status: 500 });
  }
}
