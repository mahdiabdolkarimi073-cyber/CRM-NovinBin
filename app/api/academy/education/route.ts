import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active || account.role !== 'AdminAcademy') return null;
    return account;
  } catch {
    return null;
  }
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function toPrice(v: any): bigint {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return BigInt(0);
  return BigInt(Math.floor(n));
}

// products payload from course form -> validated rows
function sanitizeProducts(raw: any): { ok: boolean; error?: string; rows?: { productId: string | null; name: string; price: bigint; qty: number }[]; total: number } {
  const list = Array.isArray(raw) ? raw : [];
  const rows: { productId: string | null; name: string; price: bigint; qty: number }[] = [];
  let total = 0;
  for (const item of list) {
    const name = String(item?.name || '').trim();
    if (!name) return { ok: false, error: 'نام محصول موردنیاز الزامی است' };
    const priceNum = Number(item?.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return { ok: false, error: 'قیمت محصول باید عددی نامنفی باشد' };
    const qtyNum = Number(item?.qty ?? 1);
    if (!Number.isInteger(qtyNum) || qtyNum < 1) return { ok: false, error: 'تعداد محصول باید عدد صحیح حداقل ۱ باشد' };
    rows.push({ productId: item?.productId || null, name, price: toPrice(priceNum), qty: qtyNum });
    total += priceNum * qtyNum;
  }
  return { ok: true, rows, total };
}

function computeProductsTotal(products: any[]): number {
  return products.reduce((sum, p) => sum + Number(p.price) * (p.qty || 1), 0);
}

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const [categories, courses, terms, levels, syllabi, rooms, weeklySchedules, teachers, systemProducts] = await Promise.all([
    (prisma as any).academyCourseCategory.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
    (prisma as any).academyCourse.findMany({
      include: {
        category: { select: { id: true, title: true, parentId: true } },
        products: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma as any).academyTerm.findMany({ include: { course: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyLevel.findMany({ include: { course: { select: { id: true, title: true } }, term: { select: { id: true, title: true } } }, orderBy: { order: 'asc' } }),
    (prisma as any).academySyllabus.findMany({ include: { course: { select: { id: true, title: true } }, term: { select: { id: true, title: true } }, level: { select: { id: true, title: true } } }, orderBy: { order: 'asc' } }),
    (prisma as any).academyRoom.findMany({ orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyWeeklySchedule.findMany({
      include: {
        course: { select: { id: true, title: true } },
        term: { select: { id: true, title: true } },
        level: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { weekday: 'asc' },
    }),
    (prisma as any).academyUser.findMany({ where: { role: 'teacher', active: true }, select: { id: true, firstName: true, lastName: true } }),
    (prisma as any).product.findMany({ where: { active: true }, select: { id: true, name: true, price: true }, orderBy: { name: 'asc' }, take: 200 }),
  ]);

  return NextResponse.json({
    categories: categories.map((c: any) => ({ id: c.id, title: c.title, parentId: c.parentId, order: c.order, active: c.active, createdAt: c.createdAt })),
    courses: courses.map((c: any) => {
      const products = c.products.map((p: any) => ({ id: p.id, productId: p.productId, name: p.name, price: Number(p.price), qty: p.qty }));
      const productsTotal = computeProductsTotal(c.products);
      return {
        id: c.id, title: c.title, code: c.code, description: c.description, teacherName: c.teacherName, level: c.level,
        imageUrl: c.imageUrl, categoryId: c.categoryId, categoryTitle: c.category?.title || null,
        price: Number(c.price) || 0, products, productsTotal, finalPrice: (Number(c.price) || 0) + productsTotal,
        startDate: c.startDate, endDate: c.endDate, active: c.active, createdAt: c.createdAt,
      };
    }),
    terms: terms.map((t: any) => ({ id: t.id, title: t.title, courseId: t.courseId, courseTitle: t.course?.title || null, startDate: t.startDate, endDate: t.endDate, active: t.active, createdAt: t.createdAt })),
    levels: levels.map((l: any) => ({ id: l.id, title: l.title, code: l.code, order: l.order, courseId: l.courseId, courseTitle: l.course?.title || null, termId: l.termId, termTitle: l.term?.title || null, createdAt: l.createdAt })),
    syllabi: syllabi.map((s: any) => ({ id: s.id, courseTitle: s.course?.title || '—', courseTitleText: s.course?.title || null, termTitle: s.term?.title || null, levelTitle: s.level?.title || null, title: s.title, description: s.description, order: s.order, createdAt: s.createdAt })),
    rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity, active: r.active, createdAt: r.createdAt })),
    weeklySchedules: weeklySchedules.map((w: any) => ({
      id: w.id,
      courseId: w.courseId || null,
      termId: w.termId || null,
      levelId: w.levelId || null,
      classNumber: w.classNumber || null,
      courseTitle: w.course?.title || '—',
      termTitle: w.term?.title || null,
      levelTitle: w.level?.title || null,
      classNumber: w.classNumber || null,
      teacherName: w.teacher ? `${w.teacher.firstName} ${w.teacher.lastName}` : '—',
      roomName: w.room?.name || '—',
      teacherId: w.teacherId || null,
      roomId: w.roomId || null,
      weekday: w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
      capacity: w.capacity,
      enrolled: w.enrolled,
    })),
    teachers: teachers.map((t: any) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })),
    systemProducts: systemProducts.map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price) || 0 })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { type, data } = body;

  if (!type || !data) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  let result;
  switch (type) {
    case 'category': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان دسته‌بندی الزامی است' }, { status: 400 });
      let parentId: string | null = data.parentId || null;
      if (parentId) {
        const parent = await (prisma as any).academyCourseCategory.findUnique({ where: { id: parentId } });
        if (!parent) return NextResponse.json({ error: 'دسته‌بندی والد یافت نشد' }, { status: 400 });
      }
      result = await (prisma as any).academyCourseCategory.create({ data: { title, parentId, order: toInt(data.order) || 0, active: data.active ?? true } });
      break;
    }
    case 'course': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان دوره الزامی است' }, { status: 400 });
      if (data.categoryId) {
        const cat = await (prisma as any).academyCourseCategory.findUnique({ where: { id: data.categoryId } });
        if (!cat) return NextResponse.json({ error: 'دسته‌بندی انتخاب‌شده یافت نشد' }, { status: 400 });
      }
      const sanitized = sanitizeProducts(data.products);
      if (!sanitized.ok) return NextResponse.json({ error: sanitized.error }, { status: 400 });
      result = await (prisma as any).academyCourse.create({
        data: {
          title, code: data.code || null, description: data.description || null, teacherName: data.teacherName || null,
          level: data.level || null, imageUrl: data.imageUrl || null, categoryId: data.categoryId || null,
          price: toPrice(data.price),
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          active: data.active ?? true,
          products: { create: sanitized.rows },
        },
      });
      break;
    }
    case 'term': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان ترم الزامی است' }, { status: 400 });
      if (!data.courseId) return NextResponse.json({ error: 'انتخاب دوره برای ترم الزامی است' }, { status: 400 });
      const course = await (prisma as any).academyCourse.findUnique({ where: { id: data.courseId } });
      if (!course) return NextResponse.json({ error: 'دوره انتخاب‌شده یافت نشد' }, { status: 400 });
      result = await (prisma as any).academyTerm.create({
        data: { title, courseId: data.courseId, startDate: data.startDate ? new Date(data.startDate) : new Date(), endDate: data.endDate ? new Date(data.endDate) : null, active: data.active ?? true },
      });
      break;
    }
    case 'level': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان سطح الزامی است' }, { status: 400 });
      if (!data.courseId || !data.termId) return NextResponse.json({ error: 'انتخاب دوره و ترم برای سطح الزامی است' }, { status: 400 });
      const term = await (prisma as any).academyTerm.findFirst({ where: { id: data.termId, courseId: data.courseId } });
      if (!term) return NextResponse.json({ error: 'ترم انتخاب‌شده متعلق به دوره انتخابی نیست' }, { status: 400 });
      result = await (prisma as any).academyLevel.create({
        data: { title, code: data.code || null, order: toInt(data.order) || 0, courseId: data.courseId, termId: data.termId },
      });
      break;
    }
    case 'syllabus': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان سرفصل الزامی است' }, { status: 400 });
      if (!data.courseId || !data.termId || !data.levelId) return NextResponse.json({ error: 'انتخاب دوره، ترم و سطح برای سرفصل الزامی است' }, { status: 400 });
      const level = await (prisma as any).academyLevel.findFirst({ where: { id: data.levelId, courseId: data.courseId, termId: data.termId } });
      if (!level) return NextResponse.json({ error: 'سطح انتخاب‌شده با دوره و ترم هم‌خوانی ندارد' }, { status: 400 });
      result = await (prisma as any).academySyllabus.create({
        data: { courseId: data.courseId, termId: data.termId, levelId: data.levelId, title, description: data.description || null, order: toInt(data.order) || 0 },
      });
      break;
    }
    case 'room':
      result = await (prisma as any).academyRoom.create({ data: { name: String(data.name || '').trim() || 'اتاق بدون نام', capacity: toInt(data.capacity) || 0, active: data.active ?? true } });
      break;
    case 'weeklySchedule': {
      if (!data.courseId || !data.termId || !data.levelId) return NextResponse.json({ error: 'انتخاب دوره، ترم و سطح برای برنامه الزامی است' }, { status: 400 });
      const level = await (prisma as any).academyLevel.findFirst({ where: { id: data.levelId, courseId: data.courseId, termId: data.termId } });
      if (!level) return NextResponse.json({ error: 'سطح انتخاب‌شده با دوره و ترم هم‌خوانی ندارد' }, { status: 400 });
      if (data.roomId) {
        const room = await (prisma as any).academyRoom.findFirst({ where: { id: data.roomId, active: true } });
        if (!room) return NextResponse.json({ error: 'اتاق انتخاب‌شده یافت نشد' }, { status: 400 });
      }
      result = await (prisma as any).academyWeeklySchedule.create({
        data: {
          courseId: data.courseId, termId: data.termId, levelId: data.levelId,
          classNumber: data.classNumber ? String(data.classNumber).trim() : null,
          teacherId: data.teacherId || null, roomId: data.roomId || null,
          weekday: data.weekday, startTime: data.startTime, endTime: data.endTime,
          capacity: toInt(data.capacity) || 0, enrolled: 0,
        },
      });
      break;
    }
    case 'assignTeacher':
      if (!data.courseId || !data.teacherName) return NextResponse.json({ error: 'شناسه دوره و نام مدرس الزامی است' }, { status: 400 });
      result = await (prisma as any).academyCourse.update({ where: { id: data.courseId }, data: { teacherName: data.teacherName } });
      break;
    case 'moveStudent':
      if (!data.enrollmentId || !data.targetCourseId) return NextResponse.json({ error: 'شناسه ثبت‌نام و دوره هدف الزامی است' }, { status: 400 });
      result = await (prisma as any).academyCourseEnrollment.update({ where: { id: data.enrollmentId }, data: { courseId: data.targetCourseId } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: { id: result?.id } });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { type, id, data } = body;
  if (!type || !id || !data) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  switch (type) {
    case 'category': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان دسته‌بندی الزامی است' }, { status: 400 });
      let parentId: string | null = data.parentId || null;
      if (parentId) {
        if (parentId === id) return NextResponse.json({ error: 'دسته‌بندی نمی‌تواند والد خودش باشد' }, { status: 400 });
        const parent = await (prisma as any).academyCourseCategory.findUnique({ where: { id: parentId } });
        if (!parent) return NextResponse.json({ error: 'دسته‌بندی والد یافت نشد' }, { status: 400 });
        // prevent cycles: walk up from parent
        let cursor: any = parent;
        const seen = new Set<string>([id]);
        while (cursor?.parentId) {
          if (seen.has(cursor.parentId)) return NextResponse.json({ error: 'این انتخاب حلقه در ساختار دسته‌بندی ایجاد می‌کند' }, { status: 400 });
          seen.add(cursor.parentId);
          cursor = await (prisma as any).academyCourseCategory.findUnique({ where: { id: cursor.parentId } });
        }
      }
      await (prisma as any).academyCourseCategory.update({ where: { id }, data: { title, parentId, order: toInt(data.order) || 0, active: data.active ?? true } });
      break;
    }
    case 'course': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان دوره الزامی است' }, { status: 400 });
      if (data.categoryId) {
        const cat = await (prisma as any).academyCourseCategory.findUnique({ where: { id: data.categoryId } });
        if (!cat) return NextResponse.json({ error: 'دسته‌بندی انتخاب‌شده یافت نشد' }, { status: 400 });
      }
      const sanitized = sanitizeProducts(data.products);
      if (!sanitized.ok) return NextResponse.json({ error: sanitized.error }, { status: 400 });
      await (prisma as any).$transaction([
        (prisma as any).academyCourse.update({
          where: { id },
          data: {
            title, code: data.code, description: data.description, teacherName: data.teacherName, level: data.level,
            imageUrl: data.imageUrl || null, categoryId: data.categoryId || null, price: toPrice(data.price),
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            active: data.active,
          },
        }),
        (prisma as any).academyCourseProduct.deleteMany({ where: { courseId: id } }),
        ...(sanitized.rows!.length ? [(prisma as any).academyCourseProduct.createMany({ data: sanitized.rows!.map((r) => ({ ...r, courseId: id })) })] : []),
      ]);
      break;
    }
    case 'term': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان ترم الزامی است' }, { status: 400 });
      if (!data.courseId) return NextResponse.json({ error: 'انتخاب دوره برای ترم الزامی است' }, { status: 400 });
      const course = await (prisma as any).academyCourse.findUnique({ where: { id: data.courseId } });
      if (!course) return NextResponse.json({ error: 'دوره انتخاب‌شده یافت نشد' }, { status: 400 });
      await (prisma as any).academyTerm.update({ where: { id }, data: { title, courseId: data.courseId, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined, active: data.active } });
      break;
    }
    case 'level': {
      const title = String(data.title || '').trim();
      if (!title) return NextResponse.json({ error: 'عنوان سطح الزامی است' }, { status: 400 });
      if (!data.courseId || !data.termId) return NextResponse.json({ error: 'انتخاب دوره و ترم برای سطح الزامی است' }, { status: 400 });
      const term = await (prisma as any).academyTerm.findFirst({ where: { id: data.termId, courseId: data.courseId } });
      if (!term) return NextResponse.json({ error: 'ترم انتخاب‌شده متعلق به دوره انتخابی نیست' }, { status: 400 });
      await (prisma as any).academyLevel.update({ where: { id }, data: { title, code: data.code, order: toInt(data.order) || 0, courseId: data.courseId, termId: data.termId } });
      break;
    }
    case 'room':
      await (prisma as any).academyRoom.update({ where: { id }, data: { name: String(data.name || '').trim() || 'اتاق بدون نام', capacity: toInt(data.capacity) || 0, active: data.active } });
      break;
    case 'weeklySchedule': {
      if (!data.courseId || !data.termId || !data.levelId) return NextResponse.json({ error: 'انتخاب دوره، ترم و سطح برای برنامه الزامی است' }, { status: 400 });
      const level = await (prisma as any).academyLevel.findFirst({ where: { id: data.levelId, courseId: data.courseId, termId: data.termId } });
      if (!level) return NextResponse.json({ error: 'سطح انتخاب‌شده با دوره و ترم هم‌خوانی ندارد' }, { status: 400 });
      if (data.roomId) {
        const room = await (prisma as any).academyRoom.findFirst({ where: { id: data.roomId, active: true } });
        if (!room) return NextResponse.json({ error: 'اتاق انتخاب‌شده یافت نشد' }, { status: 400 });
      }
      await (prisma as any).academyWeeklySchedule.update({
        where: { id },
        data: {
          courseId: data.courseId, termId: data.termId, levelId: data.levelId,
          classNumber: data.classNumber ? String(data.classNumber).trim() : null,
          teacherId: data.teacherId || null, roomId: data.roomId || null,
          weekday: data.weekday, startTime: data.startTime, endTime: data.endTime, capacity: toInt(data.capacity) || 0,
        },
      });
      break;
    }
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  switch (type) {
    case 'category': {
      const children = await (prisma as any).academyCourseCategory.count({ where: { parentId: id } });
      if (children > 0) return NextResponse.json({ error: 'ابتدا زیرمجموعه‌های این دسته‌بندی را حذف کنید' }, { status: 400 });
      await (prisma as any).academyCourseCategory.delete({ where: { id } });
      break;
    }
    case 'course':
      await (prisma as any).academyCourse.delete({ where: { id } });
      break;
    case 'term':
      await (prisma as any).academyTerm.delete({ where: { id } });
      break;
    case 'level':
      await (prisma as any).academyLevel.delete({ where: { id } });
      break;
    case 'syllabus':
      await (prisma as any).academySyllabus.delete({ where: { id } });
      break;
    case 'room':
      await (prisma as any).academyRoom.delete({ where: { id } });
      break;
    case 'weeklySchedule':
      await (prisma as any).academyWeeklySchedule.delete({ where: { id } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
