import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const BUCKET = 'avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_KEY not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractStoragePath(avatarUrl: string): string | null {
  try {
    const parts = avatarUrl.split(`/storage/v1/object/public/${BUCKET}/`);
    if (parts.length === 2) return parts[1].split('?')[0];
    if (avatarUrl.startsWith(`${BUCKET}/`)) return avatarUrl.slice(BUCKET.length + 1);
    return null;
  } catch {
    return null;
  }
}

function isSupabaseUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/') || url.startsWith('http');
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

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const storagePath = `${auth.userId}/${safeName}`;

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      return NextResponse.json({ error: 'تنظیمات فضای ذخیره‌سازی پیکربندی نشده است' }, { status: 500 });
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: detectedMime, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'ذخیره تصویر ناموفق بود' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const profile = await prisma.profile.findUnique({ where: { id: auth.userId } });
    if (profile?.avatarUrl && isSupabaseUrl(profile.avatarUrl)) {
      const oldPath = extractStoragePath(profile.avatarUrl);
      if (oldPath) {
        try { await supabase.storage.from(BUCKET).remove([oldPath]); } catch {}
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
      if (isSupabaseUrl(profile.avatarUrl)) {
        const oldPath = extractStoragePath(profile.avatarUrl);
        if (oldPath) {
          let supabase;
          try { supabase = getSupabaseAdmin(); } catch {}
          if (supabase) {
            try { await supabase.storage.from(BUCKET).remove([oldPath]); } catch {}
          }
        }
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
