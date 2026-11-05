import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'customer-chat');
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

async function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const profile = await prisma.profile.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, userType: true, customerId: true, orgId: true },
    });
    return profile;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const profile = await getAuth(req);
  if (!profile) {
    return NextResponse.json({ error: 'عدم احراز هویت' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم فایل نباید بیشتر از ۳۰ مگابایت باشد' }, { status: 400 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = path.extname(file.name) || '';
    const safeName = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/uploads/customer-chat/${safeName}`;

    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    });
  } catch (error: any) {
    console.error('Customer chat upload error:', error);
    return NextResponse.json({ error: 'خطا در بارگذاری فایل: ' + error.message }, { status: 500 });
  }
}
