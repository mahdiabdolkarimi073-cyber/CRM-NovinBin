import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

function parseUserAgent(ua: string): { deviceModel: string | null; deviceBrand: string | null; osVersion: string | null } {
  let deviceModel: string | null = null;
  let deviceBrand: string | null = null;
  let osVersion: string | null = null;

  // OS detection
  if (/Windows NT 10/.test(ua)) osVersion = 'Windows 10/11';
  else if (/Windows NT/.test(ua)) osVersion = 'Windows';
  else if (/Android\s?([\d.]+)/.test(ua)) osVersion = 'Android ' + (ua.match(/Android\s?([\d.]+)/)?.[1] || '');
  else if (/iPhone OS\s([\d_]+)/.test(ua)) osVersion = 'iOS ' + (ua.match(/iPhone OS\s([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
  else if (/iPad.*OS\s([\d_]+)/.test(ua)) osVersion = 'iPadOS ' + (ua.match(/OS\s([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
  else if (/Mac OS X\s([\d_.]+)/.test(ua)) osVersion = 'macOS ' + (ua.match(/Mac OS X\s([\d_.]+)/)?.[1]?.replace(/_/g, '.') || '');
  else if (/Linux/.test(ua)) osVersion = 'Linux';

  // Brand & Model detection
  if (/iPhone/.test(ua)) {
    deviceBrand = 'Apple';
    const modelMatch = ua.match(/iPhone(\d+,\d+)/);
    deviceModel = modelMatch ? `iPhone (${modelMatch[1]})` : 'iPhone';
  } else if (/iPad/.test(ua)) {
    deviceBrand = 'Apple';
    deviceModel = 'iPad';
  } else if (/Macintosh/.test(ua)) {
    deviceBrand = 'Apple';
    deviceModel = 'Mac';
  } else if (/Samsung.*SM-([A-Z0-9]+)/.test(ua)) {
    deviceBrand = 'Samsung';
    const sm = ua.match(/SM-([A-Z0-9]+)/);
    deviceModel = sm ? `Samsung SM-${sm[1]}` : 'Samsung Phone';
  } else if (/Samsung/.test(ua)) {
    deviceBrand = 'Samsung';
    deviceModel = 'Samsung Device';
  } else if (/Pixel\s?([\d]+)/.test(ua)) {
    deviceBrand = 'Google';
    deviceModel = 'Google Pixel ' + (ua.match(/Pixel\s?([\d]+)/)?.[1] || '');
  } else if (/Huawei/.test(ua)) {
    deviceBrand = 'Huawei';
    deviceModel = 'Huawei Device';
  } else if (/Xiaomi|Redmi/.test(ua)) {
    deviceBrand = 'Xiaomi';
    deviceModel = 'Xiaomi Device';
  } else if (/Nokia/.test(ua)) {
    deviceBrand = 'Nokia';
    deviceModel = 'Nokia Device';
  } else if (/Windows/.test(ua)) {
    deviceBrand = 'PC';
    deviceModel = 'Windows PC';
  } else if (/Linux/.test(ua) && !/Android/.test(ua)) {
    deviceBrand = 'PC';
    deviceModel = 'Linux PC';
  }

  return { deviceModel, deviceBrand, osVersion };
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const userAgent = req.headers.get('user-agent') || body.userAgent || '';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      body.ipAddress || null;
    const { deviceModel, deviceBrand, osVersion } = parseUserAgent(userAgent);
    const deviceName = body.deviceName || deviceModel || null;
    const location = body.location || null;
    const appVersion = body.appVersion || null;

    const profile = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { userType: true },
    });

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const fingerprint = body.fingerprint || `${userAgent}|${ipAddress}`;

    const existing = await prisma.customerDevice.findFirst({
      where: { profileId: auth.userId, userAgent: fingerprint },
    });

    const now = new Date();

    if (existing) {
      const updated = await prisma.customerDevice.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          isActive: true,
          ipAddress: ipAddress || existing.ipAddress,
          deviceModel: deviceModel || existing.deviceModel,
          deviceBrand: deviceBrand || existing.deviceBrand,
          osVersion: osVersion || existing.osVersion,
          deviceName: deviceName || existing.deviceName,
          location: location || existing.location,
          appVersion: appVersion || existing.appVersion,
        },
      });
      return NextResponse.json({ data: updated, isNew: false });
    }

    const device = await prisma.customerDevice.create({
      data: {
        profileId: auth.userId,
        deviceModel,
        deviceBrand,
        osVersion,
        ipAddress,
        userAgent: fingerprint,
        appVersion,
        deviceName,
        location,
        isActive: true,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
    return NextResponse.json({ data: device, isNew: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
