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

    const studentGrades = await (prisma.academyStudentGrade as any).findMany({
      where: { studentId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const grades: GradeRow[] = [];
    for (const g of studentGrades) {
      const courseTitle = g.course?.title || 'دوره';
      if (g.examScore != null) grades.push({ label: `${courseTitle} - آزمون`, score: g.examScore });
      if (g.assignmentScore != null) grades.push({ label: `${courseTitle} - تکلیف`, score: g.assignmentScore });
      if (g.participationScore != null) grades.push({ label: `${courseTitle} - مشارکت`, score: g.participationScore });
      if (g.speakingScore != null) grades.push({ label: `${courseTitle} - Speaking`, score: g.speakingScore });
      if (g.listeningScore != null) grades.push({ label: `${courseTitle} - Listening`, score: g.listeningScore });
      if (g.readingScore != null) grades.push({ label: `${courseTitle} - Reading`, score: g.readingScore });
      if (g.writingScore != null) grades.push({ label: `${courseTitle} - Writing`, score: g.writingScore });
    }

    const allScores = studentGrades.flatMap((g: any) => [
      g.examScore, g.assignmentScore, g.participationScore,
      g.speakingScore, g.listeningScore, g.readingScore, g.writingScore,
    ].filter((v: any) => v != null) as number[]);

    const averageGrade = allScores.length
      ? Math.round((allScores.reduce((s: number, v: number) => s + v, 0) / allScores.length) * 10) / 10
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
