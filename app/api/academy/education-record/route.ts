import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const LEVEL_NAMES: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficiency',
};

interface GradeRow { label: string; score: number; }

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const studentId = account.id;

    const record = await (prisma as any).academyEducationRecord.findFirst({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
    });

    const enrollments = await (prisma.academyCourseEnrollment as any).findMany({
      where: { studentId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const activeCourse = enrollments[0] || null;
    const course = activeCourse
      ? await (prisma.academyCourse as any).findUnique({ where: { id: activeCourse.courseId } })
      : null;

    let grades: GradeRow[] = record?.grades ? (record.grades as GradeRow[]) : [];
    if (!grades.length) {
      const assignments = await (prisma.academyAssignment as any).findMany({
        where: { studentId, score: { not: null } },
        orderBy: { createdAt: 'asc' },
        take: 6,
      });
      grades = assignments
        .filter((a: any) => typeof a.score === 'number')
        .map((a: any) => ({ label: a.title, score: a.score as number }));
    }

    const averageGrade = record?.averageGrade
      ? record.averageGrade
      : grades.length
        ? Math.round((grades.reduce((s, g) => s + g.score, 0) / grades.length) * 10) / 10
        : 0;

    const progress = record?.progressPercent ?? activeCourse?.progress ?? 0;

    return NextResponse.json({
      user: {
        firstName: account.firstName,
        lastName: account.lastName,
        avatarUrl: account.avatarUrl,
        role: account.role,
      },
      record: record
        ? {
            currentLevel: record.currentLevel,
            currentLevelName: record.currentLevelName || LEVEL_NAMES[record.currentLevel] || null,
            levelStartDate: record.levelStartDate,
            placementResult: record.placementResult || record.currentLevel,
            placementDate: record.placementDate,
            targetLevel: record.targetLevel,
            targetLevelName: record.targetLevelName || LEVEL_NAMES[record.targetLevel] || null,
            progressPercent: progress,
            teacherRating: record.teacherRating,
            teacherComment: record.teacherComment,
            nextCourseTitle: record.nextCourseTitle,
            nextCourseReasons: record.nextCourseReasons || [],
          }
        : null,
      activeCourse: activeCourse
        ? {
            title: course?.title || 'دوره فعال',
            teacherName: course?.teacherName || null,
            level: course?.level || null,
            progress: activeCourse.progress || 0,
          }
        : null,
      grades,
      averageGrade,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت پرونده آموزشی' }, { status: 500 });
  }
}
