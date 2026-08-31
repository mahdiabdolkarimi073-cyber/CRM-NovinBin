import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PAGES = [
  '/academy/admin-dashboard',
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
    const payload = JSON.parse(atob(parts[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('academy_token')?.value;
  const role = getRole(token);

  if (pathname === '/academy/login' || pathname === '/academy/register' || pathname === '/academy/logout') {
    return NextResponse.next();
  }

  if (!role) {
    return NextResponse.redirect(new URL('/academy/login', req.url));
  }

  const isAdminPage = ADMIN_PAGES.some((p) => pathname.startsWith(p));
  const isTeacherPage = TEACHER_PAGES.some((p) => pathname.startsWith(p));
  const isStudentPage = STUDENT_PAGES.some((p) => pathname.startsWith(p));

  if (isAdminPage && role !== 'AdminAcademy') {
    return NextResponse.redirect(new URL('/academy/dashboard', req.url));
  }

  if (isTeacherPage && role !== 'teacher' && role !== 'AdminAcademy') {
    return NextResponse.redirect(new URL('/academy/dashboard', req.url));
  }

  if (isStudentPage && role === 'AdminAcademy') {
    return NextResponse.redirect(new URL('/academy/admin-dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/academy/:path*'],
};
