import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

function diagLog(traceId: string, step: string, info: Record<string, unknown>) {
  console.info(`[AUTH-DIAG] traceId=${traceId} step=${step}`, info);
}

export async function POST(req: NextRequest) {
  const traceId = randomUUID();

  // Enumerate cookie names before clearing (no values)
  const allCookieNames: string[] = [];
  req.cookies.getAll().forEach((c) => allCookieNames.push(c.name));

  diagLog(traceId, 'logout_start', {
    method: req.method,
    allCookieNames,
    hasTokenCookie: allCookieNames.includes('token'),
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  diagLog(traceId, 'logout_cookie_cleared', {
    cookieName: 'token',
    cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, path: '/' },
    httpStatus: 200,
  });

  return response;
}
