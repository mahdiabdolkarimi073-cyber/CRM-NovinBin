import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PAGES = [
  '/academy/admin-dashboard',
  '/academy/admin-students',
  '/academy/admin-registration',
  '/academy/admin-settings',
  '/academy/students',
  '/academy/teachers',
  '/academy/education',
  '/academy/finance-management',
  '/academy/registration',
];

const TEACHER_PAGES = [
  '/academy/teacher-classes',
  '/academy/teacher-attendance',
  '/academy/teacher-evaluation',
  '/academy/teacher-grades',
];

const STUDENT_PAGES = [
  '/academy/classes',
  '/academy/attendance',
  '/academy/education-record',
  '/academy/finance',
  '/academy/registration',
];

function getRole(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload.role || null;
  } catch {
    return null;
  }
}

function diagLog(traceId: string, step: string, info: Record<string, unknown>) {
  console.info(`[AUTH-DIAG] traceId=${traceId} step=${step}`, info);
}

export function middleware(req: NextRequest) {
  const traceId = crypto.randomUUID();
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('academy_token')?.value;
  const role = getRole(token);

  // Enumerate all cookie names (no values) for diagnostics
  const allCookieNames: string[] = [];
  req.cookies.getAll().forEach((c) => allCookieNames.push(c.name));

  diagLog(traceId, 'middleware_start', {
    pathname,
    hasAcademyToken: !!token,
    role,
    allCookieNames,
  });

  if (pathname === '/academy/login' || pathname === '/academy/register' || pathname === '/academy/logout') {
    diagLog(traceId, 'middleware_public_path', { pathname });
    return NextResponse.next();
  }

  if (!role) {
    diagLog(traceId, 'middleware_no_role_redirect', {
      pathname,
      hasToken: !!token,
      allCookieNames,
      reason: 'No academy_token cookie or role extraction failed',
      redirectTo: '/academy/login',
    });
    console.log('[middleware] NO ROLE → redirect to login', { pathname, hasToken: !!token });
    return NextResponse.redirect(new URL('/academy/login', req.url));
  }

  const matchesPage = (p: string) => pathname === p || pathname.startsWith(p + '/');
  const isAdminPage = ADMIN_PAGES.some(matchesPage);
  const isTeacherPage = TEACHER_PAGES.some(matchesPage);
  const isStudentPage = STUDENT_PAGES.some(matchesPage);

  diagLog(traceId, 'middleware_page_classification', {
    pathname,
    role,
    isAdminPage,
    isTeacherPage,
    isStudentPage,
  });

  if (isAdminPage && role !== 'AdminAcademy') {
    diagLog(traceId, 'middleware_admin_page_wrong_role', {
      pathname,
      role,
      redirectTo: '/academy/dashboard',
    });
    console.log('[middleware] ADMIN PAGE WRONG ROLE → dashboard', { pathname, role });
    return NextResponse.redirect(new URL('/academy/dashboard', req.url));
  }

  if (isTeacherPage && role !== 'teacher' && role !== 'AdminAcademy') {
    diagLog(traceId, 'middleware_teacher_page_wrong_role', {
      pathname,
      role,
      redirectTo: '/academy/dashboard',
    });
    console.log('[middleware] TEACHER PAGE WRONG ROLE → dashboard', { pathname, role });
    return NextResponse.redirect(new URL('/academy/dashboard', req.url));
  }

  if (isStudentPage && !isAdminPage && role === 'AdminAcademy') {
    diagLog(traceId, 'middleware_student_page_admin_redirect', {
      pathname,
      role,
      redirectTo: '/academy/admin-dashboard',
    });
    console.log('[middleware] STUDENT PAGE WITH ADMIN ROLE → admin-dashboard', { pathname, role });
    return NextResponse.redirect(new URL('/academy/admin-dashboard', req.url));
  }

  diagLog(traceId, 'middleware_pass', { pathname, role });
  console.log('[middleware] PASS', { pathname, role });
  return NextResponse.next();
}

export const config = {
  matcher: ['/academy/:path*'],
};
