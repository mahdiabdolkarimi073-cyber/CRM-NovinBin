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

function isSuperAdmin(role: string): boolean {
  return role === 'owner' || role === 'super_admin';
}

async function hasGraphicWorkAccess(userId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true, active: true },
  });
  if (!profile?.active) return false;
  if (isSuperAdmin(profile.role)) return true;
  const access = await prisma.graphicWorkAccess.findUnique({
    where: { profileId: userId },
  });
  return !!access && access.granted;
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const hasAccess = await hasGraphicWorkAccess(auth.userId);
    if (!hasAccess) return NextResponse.json({ error: 'دسترسی به کارهای گرافیک ندارید' }, { status: 403 });

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true, orgId: true },
    });

    const where = isSuperAdmin(profile?.role || '')
      ? {}
      : { userId: auth.userId };

    const works = await prisma.graphicWork.findMany({
      where,
      include: { files: true, images: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ works });
  } catch (error: any) {
    return NextResponse.json({ error: 'دریافت کارهای گرافیک ناموفق بود' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const hasAccess = await hasGraphicWorkAccess(auth.userId);
    if (!hasAccess) return NextResponse.json({ error: 'دسترسی به کارهای گرافیک ندارید' }, { status: 403 });

    const body = await req.json();
    const { textContent, fileUrls, imageUrls } = body as {
      textContent?: string;
      fileUrls?: { url: string; name?: string; type?: string; size?: number }[];
      imageUrls?: { url: string }[];
    };

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { orgId: true },
    });

    const work = await prisma.graphicWork.create({
      data: {
        userId: auth.userId,
        orgId: profile?.orgId || null,
        textContent: textContent || null,
        files: {
          create: (fileUrls || []).map((f) => ({
            fileUrl: f.url,
            fileName: f.name || null,
            fileType: f.type || null,
            fileSize: f.size || 0,
          })),
        },
        images: {
          create: (imageUrls || []).map((img) => ({
            imageUrl: img.url,
          })),
        },
      },
      include: { files: true, images: true },
    });

    return NextResponse.json({ work });
  } catch (error: any) {
    return NextResponse.json({ error: 'ایجاد کار گرافیک ناموفق بود' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const hasAccess = await hasGraphicWorkAccess(auth.userId);
    if (!hasAccess) return NextResponse.json({ error: 'دسترسی به کارهای گرافیک ندارید' }, { status: 403 });

    const body = await req.json();
    const { id, textContent } = body as { id: string; textContent?: string };

    if (!id) return NextResponse.json({ error: 'شناسه مورد نیاز است' }, { status: 400 });

    const work = await prisma.graphicWork.findUnique({ where: { id }, select: { userId: true } });
    if (!work) return NextResponse.json({ error: 'مورد یافت نشد' }, { status: 404 });

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (!isSuperAdmin(profile?.role || '') && work.userId !== auth.userId) {
      return NextResponse.json({ error: 'فقط owner می‌تواند متن را ویرایش کند' }, { status: 403 });
    }

    const updated = await prisma.graphicWork.update({
      where: { id },
      data: { textContent: textContent ?? undefined },
      include: { files: true, images: true },
    });

    return NextResponse.json({ work: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'ویرایش متن ناموفق بود' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const fileId = searchParams.get('fileId');
    const imageId = searchParams.get('imageId');

    if (!id) return NextResponse.json({ error: 'شناسه مورد نیاز است' }, { status: 400 });

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (!isSuperAdmin(profile?.role || '')) {
      return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند حذف کند' }, { status: 403 });
    }

    if (fileId) {
      await prisma.graphicWorkFile.delete({ where: { id: fileId } });
      return NextResponse.json({ success: true });
    }

    if (imageId) {
      await prisma.graphicWorkImage.delete({ where: { id: imageId } });
      return NextResponse.json({ success: true });
    }

    await prisma.graphicWork.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'حذف ناموفق بود' }, { status: 500 });
  }
}
