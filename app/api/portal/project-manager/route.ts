import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { id: true, userType: true, customerId: true },
    });

    if (!profile || profile.userType !== 'customer' || !profile.customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: profile.customerId },
      select: { projectManagerId: true },
    });

    if (!customer || !customer.projectManagerId) {
      return NextResponse.json({ manager: null });
    }

    const manager = await prisma.profile.findUnique({
      where: { id: customer.projectManagerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        lastSeenAt: true,
        active: true,
      },
    });

    if (!manager || !manager.active) {
      return NextResponse.json({ manager: null });
    }

    return NextResponse.json({
      manager: {
        id: manager.id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        fullName: manager.fullName,
        avatarUrl: manager.avatarUrl,
        role: manager.role,
        lastSeenAt: manager.lastSeenAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
