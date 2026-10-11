import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 12 && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم فایل نباید بیشتر از ۵ مگابایت باشد' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'فرمت مجاز: JPEG، PNG، WebP' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedMime = detectMimeType(buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json({ error: 'فایل تصویری معتبر نیست' }, { status: 400 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    await writeFile(filePath, buffer);

    const url = `/uploads/avatars/${safeName}`;

    const profile = await prisma.profile.findUnique({ where: { id: auth.userId } });
    if (profile?.avatarUrl) {
      const oldFilePath = path.join(process.cwd(), 'public', profile.avatarUrl);
      if (existsSync(oldFilePath)) {
        try { await unlink(oldFilePath); } catch {}
      }
    }

    await prisma.profile.update({
      where: { id: auth.userId },
      data: { avatarUrl: url },
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: 'آپلود تصویر ناموفق بود' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const profile = await prisma.profile.findUnique({ where: { id: auth.userId } });
    if (!profile) return NextResponse.json({ error: 'پروفایل یافت نشد' }, { status: 404 });

    if (profile.avatarUrl) {
      const oldFilePath = path.join(process.cwd(), 'public', profile.avatarUrl);
      if (existsSync(oldFilePath)) {
        try { await unlink(oldFilePath); } catch {}
      }
      await prisma.profile.update({
        where: { id: auth.userId },
        data: { avatarUrl: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'حذف تصویر ناموفق بود' }, { status: 500 });
  }
}
