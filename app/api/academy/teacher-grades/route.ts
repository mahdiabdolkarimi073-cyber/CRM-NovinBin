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

    const grades = targetCourseIds.length
      ? await (prisma as any).academyStudentGrade.findMany({
          where: { courseId: { in: targetCourseIds } },
        })
      : [];
    const gradeByStudent = new Map<string, any>(grades.map((g: any) => [g.studentId, g]));

    const classes = teacherCourses.map((course: any) => {
      const courseEnrollments = enrollments.filter((e: any) => e.courseId === course.id);
      const studentList = courseEnrollments.map((e: any) => {
        const student = studentById.get(e.studentId);
        const grade = gradeByStudent.get(e.studentId);
        return {
          id: e.studentId,
          fullName: student ? `${student.firstName} ${student.lastName}` : 'نامشخص',
          examScore: grade?.examScore ?? null,
          assignmentScore: grade?.assignmentScore ?? null,
          participationScore: grade?.participationScore ?? null,
          speakingScore: grade?.speakingScore ?? null,
          listeningScore: grade?.listeningScore ?? null,
          readingScore: grade?.readingScore ?? null,
          writingScore: grade?.writingScore ?? null,
          note: grade?.note ?? null,
          gradeId: grade?.id ?? null,
        };
      });

      const scoreCount = (field: string) => grades.filter((g: any) => g.courseId === course.id && g[field] != null).length;
      const avgScore = (field: string) => {
        const vals = grades.filter((g: any) => g.courseId === course.id && g[field] != null).map((g: any) => g[field]);
        return vals.length ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : 0;
      };

      return {
        id: course.id,
        title: course.title,
        level: course.level || null,
        studentCount: courseEnrollments.length,
        students: studentList,
        averages: {
          exam: avgScore('examScore'),
          assignment: avgScore('assignmentScore'),
          participation: avgScore('participationScore'),
          speaking: avgScore('speakingScore'),
          listening: avgScore('listeningScore'),
          reading: avgScore('readingScore'),
          writing: avgScore('writingScore'),
        },
        counts: {
          exam: scoreCount('examScore'),
          assignment: scoreCount('assignmentScore'),
          participation: scoreCount('participationScore'),
          speaking: scoreCount('speakingScore'),
          listening: scoreCount('listeningScore'),
          reading: scoreCount('readingScore'),
          writing: scoreCount('writingScore'),
        },
      };
    });

    return NextResponse.json({
      user: { firstName: account.firstName, lastName: account.lastName, username: account.username, avatarUrl: account.avatarUrl },
      classes,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت نمرات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const body = await req.json();
    const { studentId, courseId, examScore, assignmentScore, participationScore, speakingScore, listeningScore, readingScore, writingScore, note } = body as {
      studentId?: string; courseId?: string;
      examScore?: number | null; assignmentScore?: number | null; participationScore?: number | null;
      speakingScore?: number | null; listeningScore?: number | null; readingScore?: number | null; writingScore?: number | null;
      note?: string | null;
    };

    if (!studentId || !courseId) return NextResponse.json({ error: 'شناسه دانش‌آموز و کلاس الزامی است' }, { status: 400 });

    const course = await (prisma as any).academyCourse.findUnique({ where: { id: courseId } });
    const teacherName = `${account.firstName} ${account.lastName}`;
    if (!course || course.teacherName?.trim() !== teacherName) {
      return NextResponse.json({ error: 'این کلاس متعلق به شما نیست' }, { status: 403 });
    }

    const toNum = (v: any) => (v == null || v === '' ? null : Math.max(0, Math.min(20, Number(v))));
    const data = {
      studentId,
      courseId,
      examScore: toNum(examScore),
      assignmentScore: toNum(assignmentScore),
      participationScore: toNum(participationScore),
      speakingScore: toNum(speakingScore),
      listeningScore: toNum(listeningScore),
      readingScore: toNum(readingScore),
      writingScore: toNum(writingScore),
      note: note?.trim() || null,
      recordedBy: account.id,
      updatedAt: new Date(),
    };

    const existing = await (prisma as any).academyStudentGrade.findFirst({ where: { studentId, courseId } });
    let record;
    if (existing) {
      record = await (prisma as any).academyStudentGrade.update({ where: { id: existing.id }, data });
    } else {
      record = await (prisma as any).academyStudentGrade.create({ data: { ...data, createdAt: new Date() } });
    }

    return NextResponse.json({ success: true, grade: record });
  } catch {
    return NextResponse.json({ error: 'خطا در ثبت نمره' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const body = await req.json();
    const { updates } = body as { updates?: Array<{ studentId: string; courseId: string; examScore?: number | null; assignmentScore?: number | null; participationScore?: number | null; speakingScore?: number | null; listeningScore?: number | null; readingScore?: number | null; writingScore?: number | null; note?: string | null }> };

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

      const toNum = (v: any) => (v == null || v === '' ? null : Math.max(0, Math.min(20, Number(v))));
      const data = {
        examScore: toNum(item.examScore),
        assignmentScore: toNum(item.assignmentScore),
        participationScore: toNum(item.participationScore),
        speakingScore: toNum(item.speakingScore),
        listeningScore: toNum(item.listeningScore),
        readingScore: toNum(item.readingScore),
        writingScore: toNum(item.writingScore),
        note: item.note?.trim() || null,
        recordedBy: account.id,
        updatedAt: new Date(),
      };

      const existing = await (prisma as any).academyStudentGrade.findFirst({ where: { studentId: item.studentId, courseId: item.courseId } });
      if (existing) {
        await (prisma as any).academyStudentGrade.update({ where: { id: existing.id }, data });
      } else {
        await (prisma as any).academyStudentGrade.create({ data: { ...data, studentId: item.studentId, courseId: item.courseId, createdAt: new Date() } });
      }
      results.push({ studentId: item.studentId, success: true });
    }

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ error: 'خطا در به‌روزرسانی دسته‌ای' }, { status: 500 });
  }
}
