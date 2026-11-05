import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'نام و نام خانوادگی الزامی است'),
  formData: z.record(z.unknown()),
});

const ratingVal = z.coerce.number().int().min(1).max(5);
const textVal = z.string().trim().min(1);

const step2Schema = z.object({
  r1: ratingVal, r2: ratingVal, r3: ratingVal, r4: ratingVal, r5: ratingVal,
  r6: ratingVal, r7: ratingVal, r8: ratingVal, r9: ratingVal, r10: ratingVal,
  r11: ratingVal, r12: ratingVal, r13: ratingVal, r14: ratingVal, r15: ratingVal,
  r16: ratingVal, r17: ratingVal,
  a1: textVal, a2: textVal, a3: textVal, a4: textVal, a5: textVal, a6: textVal,
  a7: textVal, a8: textVal, a9: textVal, a10: textVal, a11: textVal, a12: textVal,
  a13: textVal, a14: textVal, a15: textVal, a16: textVal, a17: textVal, a18: textVal,
});

export async function POST(req: NextRequest) {
  try {
    const parsed = applicationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'اطلاعات فرم نامعتبر است' }, { status: 400 });
    const application = await prisma.employmentApplication.create({ data: { fullName: parsed.data.fullName, formData: parsed.data.formData } });
    return NextResponse.json({ id: application.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'ثبت درخواست استخدام ناموفق بود' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, step2 } = body as { id: string; step2: Record<string, unknown> };
    if (!id) return NextResponse.json({ error: 'شناسه درخواست الزامی است' }, { status: 400 });
    const parsed = step2Schema.safeParse(step2);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'اطلاعات مرحله دوم نامعتبر است' }, { status: 400 });
    const data: any = {};
    for (let i = 1; i <= 17; i++) data[`r${i}`] = (parsed.data as any)[`r${i}`];
    for (let i = 1; i <= 18; i++) data[`a${i}`] = (parsed.data as any)[`a${i}`];
    data.step = 2;
    const updated = await prisma.employmentApplication.update({ where: { id }, data });
    return NextResponse.json({ id: updated.id, step: 2 });
  } catch {
    return NextResponse.json({ error: 'ثبت مرحله دوم ناموفق بود' }, { status: 500 });
  }
}
