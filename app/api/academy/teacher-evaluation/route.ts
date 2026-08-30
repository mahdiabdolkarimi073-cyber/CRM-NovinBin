import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getTeacher(req: NextRequest): Promise<any | null> {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active || account.role !== 'teacher') return null;
    return account;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const teacherName = `${account.firstName} ${account.lastName}`;
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    const allCourses = await (prisma as any).academyCourse.findMany({ where: { active: true } });
    const teacherCourses = allCourses.filter((c: any) => c.teacherName?.trim() === teacherName);
    const courseIds = teacherCourses.map((c: any) => c.id);

    if (classId && !courseIds.includes(classId)) {
      return NextResponse.json({ error: 'این کلاس متعلق به شما نیست' }, { status: 403 });
    }

    const targetCourseIds = classId ? [classId] : courseIds;

    const enrollments = targetCourseIds.length
      ? await (prisma as any).academyCourseEnrollment.findMany({
          where: { courseId: { in: targetCourseIds }, status: 'active' },
        })
      : [];
    const studentIds = Array.from(new Set(enrollments.map((e: any) => e.studentId)));
    const students = studentIds.length
      ? await (prisma as any).academyUser.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentById = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const evaluations = targetCourseIds.length
      ? await (prisma as any).academyTeacherEvaluation.findMany({
          where: { courseId: { in: targetCourseIds } },
        })
      : [];
    const evalByStudent = new Map<string, any>(evaluations.map((e: any) => [e.studentId, e]));

    const classes = teacherCourses.map((course: any) => {
      const courseEnrollments = enrollments.filter((e: any) => e.courseId === course.id);
      const studentList = courseEnrollments.map((e: any) => {
        const student = studentById.get(e.studentId);
        const ev = evalByStudent.get(e.studentId);
        return {
          id: e.studentId,
          fullName: student ? `${student.firstName} ${student.lastName}` : 'نامشخص',
          strengths: ev?.strengths ?? null,
          weaknesses: ev?.weaknesses ?? null,
          learningStatus: ev?.learningStatus ?? null,
          educationalSuggestion: ev?.educationalSuggestion ?? null,
          currentLevel: ev?.currentLevel ?? null,
          suggestedLevel: ev?.suggestedLevel ?? null,
          evaluationId: ev?.id ?? null,
        };
      });

      const statusCounts: Record<string, number> = {};
      evaluations.filter((e: any) => e.courseId === course.id && e.learningStatus).forEach((e: any) => {
        statusCounts[e.learningStatus] = (statusCounts[e.learningStatus] || 0) + 1;
      });

      return {
        id: course.id,
        title: course.title,
        level: course.level || null,
        studentCount: courseEnrollments.length,
        students: studentList,
        statusCounts,
      };
    });

    return NextResponse.json({
      user: { firstName: account.firstName, lastName: account.lastName, username: account.username, avatarUrl: account.avatarUrl },
      classes,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت ارزیابی‌ها' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const body = await req.json();
    const { studentId, courseId, strengths, weaknesses, learningStatus, educationalSuggestion, currentLevel, suggestedLevel } = body as {
      studentId?: string; courseId?: string;
      strengths?: string | null; weaknesses?: string | null; learningStatus?: string | null;
      educationalSuggestion?: string | null; currentLevel?: string | null; suggestedLevel?: string | null;
    };

    if (!studentId || !courseId) return NextResponse.json({ error: 'شناسه دانش‌آموز و کلاس الزامی است' }, { status: 400 });

    const course = await (prisma as any).academyCourse.findUnique({ where: { id: courseId } });
    const teacherName = `${account.firstName} ${account.lastName}`;
    if (!course || course.teacherName?.trim() !== teacherName) {
      return NextResponse.json({ error: 'این کلاس متعلق به شما نیست' }, { status: 403 });
    }

    const data = {
      strengths: strengths?.trim() || null,
      weaknesses: weaknesses?.trim() || null,
      learningStatus: learningStatus || null,
      educationalSuggestion: educationalSuggestion?.trim() || null,
      currentLevel: currentLevel || null,
      suggestedLevel: suggestedLevel || null,
      recordedBy: account.id,
      updatedAt: new Date(),
    };

    const existing = await (prisma as any).academyTeacherEvaluation.findFirst({ where: { studentId, courseId } });
    let record;
    if (existing) {
      record = await (prisma as any).academyTeacherEvaluation.update({ where: { id: existing.id }, data });
    } else {
      record = await (prisma as any).academyTeacherEvaluation.create({ data: { ...data, studentId, courseId, createdAt: new Date() } });
    }

    return NextResponse.json({ success: true, evaluation: record });
  } catch {
    return NextResponse.json({ error: 'خطا در ثبت ارزیابی' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const body = await req.json();
    const { updates } = body as { updates?: Array<{ studentId: string; courseId: string; strengths?: string | null; weaknesses?: string | null; learningStatus?: string | null; educationalSuggestion?: string | null; currentLevel?: string | null; suggestedLevel?: string | null }> };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'لیست به‌روزرسانی‌ها الزامی است' }, { status: 400 });
    }

    const teacherName = `${account.firstName} ${account.lastName}`;
    const results: any[] = [];

    for (const item of updates) {
      if (!item.studentId || !item.courseId) {
        results.push({ studentId: item.studentId, success: false, error: 'داده ناقص' });
        continue;
      }
      const course = await (prisma as any).academyCourse.findUnique({ where: { id: item.courseId } });
      if (!course || course.teacherName?.trim() !== teacherName) {
        results.push({ studentId: item.studentId, success: false, error: 'دسترسی ندارید' });
        continue;
      }

      const data = {
        strengths: item.strengths?.trim() || null,
        weaknesses: item.weaknesses?.trim() || null,
        learningStatus: item.learningStatus || null,
        educationalSuggestion: item.educationalSuggestion?.trim() || null,
        currentLevel: item.currentLevel || null,
        suggestedLevel: item.suggestedLevel || null,
        recordedBy: account.id,
        updatedAt: new Date(),
      };

      const existing = await (prisma as any).academyTeacherEvaluation.findFirst({ where: { studentId: item.studentId, courseId: item.courseId } });
      if (existing) {
        await (prisma as any).academyTeacherEvaluation.update({ where: { id: existing.id }, data });
      } else {
        await (prisma as any).academyTeacherEvaluation.create({ data: { ...data, studentId: item.studentId, courseId: item.courseId, createdAt: new Date() } });
      }
      results.push({ studentId: item.studentId, success: true });
    }

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ error: 'خطا در به‌روزرسانی دسته‌ای' }, { status: 500 });
  }
}
