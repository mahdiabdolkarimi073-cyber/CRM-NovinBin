import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function generateSlug(name: string): string {
  const slug = name.trim().toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${slug || 'demo'}-${rand}`;
}

function generateUsername(name: string): string {
  const base = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^\w.]/g, '').slice(0, 20);
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${base || 'demo'}.${rand}`;
}

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true, active: true, orgId: true },
    });

    if (!profile?.active || (profile.role !== 'super_admin' && profile.role !== 'owner' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, companyName, plan, durationDays, modules, maxUsers, startDate } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'نام الزامی است' }, { status: 400 });
    }

    const duration = durationDays || 15;
    const start = startDate ? new Date(startDate) : new Date();
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + duration);

    const slug = generateSlug(name);
    const username = generateUsername(name);
    const password = generatePassword();
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create Organization for demo
    const org = await prisma.organization.create({
      data: {
        name: `دمو - ${name.trim()}`,
        code: `DEMO-${slug}`,
        plan: plan || 'starter',
        subscriptionStatus: 'trial',
        maxUsers: maxUsers || 10,
        settings: { isDemo: true, demoSlug: slug },
      },
    });

    // Create demo User + Profile (owner role within demo org)
    const demoUser = await prisma.user.create({
      data: {
        email: `demo+${slug}@novinbin.ir`,
        passwordHash: hashedPassword,
        link: slug,
      },
    });

    const demoProfile = await prisma.profile.create({
      data: {
        id: demoUser.id,
        orgId: org.id,
        userType: 'staff',
        role: 'owner',
        fullName: name.trim(),
        companyName: companyName || null,
        assignedPages: modules || [],
        active: true,
      },
    });

    // Create the demo record
    const demo = await prisma.demo.create({
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        companyName: companyName || null,
        plan: plan || 'starter',
        status: 'active',
        startDate: start,
        expiryDate: expiry,
        createdBy: auth.userId,
        slug,
        durationDays: duration,
        modules: modules || [],
        maxUsers: maxUsers || 10,
        demoUserId: demoUser.id,
        demoPassword: hashedPassword,
        demoUsername: username,
        orgId: org.id,
      },
    });

    // Log activity
    await prisma.demoActivity.create({
      data: {
        demoId: demo.id,
        orgId: org.id,
        pagePath: '/demo/create',
        action: 'access_created',
        duration: 0,
        metadata: { username, password, slug },
      },
    });

    return NextResponse.json({
      id: demo.id,
      slug,
      username,
      password,
      demoUrl: `/demo/${slug}`,
      expiryDate: expiry.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
