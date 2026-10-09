import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

async function checkAdmin(auth: { userId: string; role: string }) {
  const profile = await prisma.profile.findUnique({
    where: { id: auth.userId },
    select: { role: true, active: true },
  });
  return profile?.active && (profile.role === 'super_admin' || profile.role === 'owner');
}

// PATCH - extend, suspend, resume, reset
export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });

    const isAdmin = await checkAdmin(auth);
    if (!isAdmin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

    const body = await req.json();
    const { demoId, action, extraDays, newPassword } = body;

    if (!demoId || !action) {
      return NextResponse.json({ error: 'demoId و action الزامی است' }, { status: 400 });
    }

    const demo = await prisma.demo.findUnique({
      where: { id: demoId },
      include: { org: true },
    });

    if (!demo) return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });

    switch (action) {
      case 'extend': {
        const days = extraDays || 7;
        const newExpiry = new Date(demo.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + days);
        await prisma.demo.update({
          where: { id: demoId },
          data: {
            expiryDate: newExpiry,
            status: 'active',
            suspendedAt: null,
            suspendedBy: null,
          },
        });
        return NextResponse.json({ success: true, newExpiry: newExpiry.toISOString() });
      }

      case 'suspend': {
        await prisma.demo.update({
          where: { id: demoId },
          data: {
            status: 'suspended',
            suspendedAt: new Date(),
            suspendedBy: auth.userId,
          },
        });
        return NextResponse.json({ success: true });
      }

      case 'resume': {
        const isExpired = new Date() > demo.expiryDate;
        await prisma.demo.update({
          where: { id: demoId },
          data: {
            status: isExpired ? 'expired' : 'active',
            suspendedAt: null,
            suspendedBy: null,
          },
        });
        return NextResponse.json({ success: true });
      }

      case 'reset': {
        // Delete all demo org data and re-seed
        if (demo.orgId) {
          const orgId = demo.orgId;
          // Delete the org (cascades to all related data)
          await prisma.organization.delete({ where: { id: orgId } });

          const newOrg = await prisma.organization.create({
            data: {
              name: `دمو - ${demo.name}`,
              code: `DEMO-${demo.slug}`,
              plan: demo.plan,
              subscriptionStatus: 'trial',
              maxUsers: demo.maxUsers,
              settings: { isDemo: true, demoSlug: demo.slug },
            },
          });

          // Re-link the demo user's profile to the new org
          if (demo.demoUserId) {
            await prisma.profile.update({
              where: { id: demo.demoUserId },
              data: {
                orgId: newOrg.id,
                assignedPages: demo.modules as any,
                active: true,
              },
            });
          }

          await prisma.demo.update({
            where: { id: demoId },
            data: {
              orgId: newOrg.id,
              resetCount: { increment: 1 },
              lastActivityAt: new Date(),
            },
          });
        }
        return NextResponse.json({ success: true });
      }

      case 'resetPassword': {
        if (!newPassword || newPassword.length < 6) {
          return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
        }
        const hashed = bcrypt.hashSync(newPassword, 10);
        await prisma.demo.update({
          where: { id: demoId },
          data: { demoPassword: hashed },
        });
        return NextResponse.json({ success: true });
      }

      case 'updateModules': {
        const { modules } = body;
        if (modules && Array.isArray(modules)) {
          await prisma.demo.update({
            where: { id: demoId },
            data: { modules },
          });

          if (demo.demoUserId) {
            await prisma.profile.update({
              where: { id: demo.demoUserId },
              data: { assignedPages: modules },
            });
          }
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - remove demo and its org
export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });

    const isAdmin = await checkAdmin(auth);
    if (!isAdmin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const demoId = searchParams.get('demoId');

    if (!demoId) return NextResponse.json({ error: 'demoId الزامی است' }, { status: 400 });

    const demo = await prisma.demo.findUnique({ where: { id: demoId } });
    if (!demo) return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });

    // Delete demo user + profile first
    if (demo.demoUserId) {
      await prisma.profile.delete({ where: { id: demo.demoUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: demo.demoUserId } }).catch(() => {});
    }

    // Delete the demo record (this will set orgId to null due to cascade)
    await prisma.demo.delete({ where: { id: demoId } });

    // Now delete the org and all its data (cascade deletes all org-scoped records)
    if (demo.orgId) {
      await prisma.organization.delete({ where: { id: demo.orgId } }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - list all demos for admin
export async function GET(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });

    const isAdmin = await checkAdmin(auth);
    if (!isAdmin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

    const demos = await prisma.demo.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        plan: true,
        status: true,
        startDate: true,
        expiryDate: true,
        durationDays: true,
        modules: true,
        maxUsers: true,
        lastActivityAt: true,
        resetCount: true,
        suspendedAt: true,
        demoUsername: true,
        orgId: true,
        createdAt: true,
      },
    });

    const serialized = demos.map((d) => ({
      ...d,
      startDate: d.startDate.toISOString(),
      expiryDate: d.expiryDate.toISOString(),
      lastActivityAt: d.lastActivityAt?.toISOString() || null,
      suspendedAt: d.suspendedAt?.toISOString() || null,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ demos: serialized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
