import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'نام و نام خانوادگی الزامی است'),
  formData: z.record(z.unknown()),
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
