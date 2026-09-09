'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Fingerprint, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const schema = z.object({
  customerName: z.string().trim().min(1, 'نام مشتری الزامی است'),
  siteName: z.string().trim().min(1, 'نام سایت الزامی است'),
  irnicId: z.string().trim().min(1, 'شناسه ایرنیک الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});
type FormValues = z.infer<typeof schema>;

type Props = { id?: string; initialValues?: Partial<FormValues> };

export function IdentityForm({ id, initialValues }: Props) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initialValues });
  const onSubmit = async (values: FormValues) => {
    const response = await fetch(id ? `/api/irnic/${id}` : '/api/irnic', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error || 'ذخیره ناموفق بود'); return; }
    toast.success(id ? 'شناسه ویرایش شد' : 'شناسه جدید ثبت شد');
    router.push('/dashboard/irnic');
  };
  const field = (name: keyof FormValues, label: string, placeholder: string, direction?: 'ltr' | 'rtl') => <div className="field-group"><Label className="field-label">{label} <span className="required-star">*</span></Label><Input {...register(name)} placeholder={placeholder} dir={direction} className="task-input" />{errors[name] && <span className="field-error">{errors[name]?.message}</span>}</div>;

  return <div className="create-task-page" dir="rtl"><div className="create-task-container"><header className="create-task-header"><div><div className="create-task-title"><span className="title-accent-bar" /><h1>{id ? 'ویرایش شناسه ایرنیک' : 'افزودن شناسه ایرنیک'}</h1></div><div className="create-task-breadcrumb">داشبورد <b>←</b> مدیریت شناسه ایرنیک <b>←</b> {id ? 'ویرایش' : 'افزودن'}</div></div><Link href="/dashboard/irnic" className="back-button"><ArrowRight className="h-4 w-4" /> بازگشت به فهرست</Link></header><div className="create-task-grid"><form className="task-form-card" onSubmit={handleSubmit(onSubmit)}><div className="form-card-header"><div className="form-card-title"><span className="form-card-icon"><Fingerprint className="h-5 w-5" /></span><div><h2>اطلاعات شناسه</h2><p>تمام فیلدها الزامی هستند.</p></div></div></div><div className="form-card-divider" /><div className="form-fields">{field('customerName', 'نام و نام خانوادگی مشتری', 'مثال: علی رضایی')}{field('siteName', 'نام سایت', 'مثال: novinbin.ir', 'ltr')}{field('irnicId', 'شناسه ایرنیک', 'مثال: ir12345-irnic', 'ltr')}{field('password', 'رمز عبور', 'رمز عبور شناسه ایرنیک', 'ltr')}</div><div className="form-actions-row"><Button type="button" variant="outline" onClick={() => router.push('/dashboard/irnic')}>انصراف</Button><Button type="submit" className="submit-btn" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{id ? 'ذخیره تغییرات' : 'ثبت شناسه'}</Button></div></form><aside className="task-sidebar"><div className="info-card"><div className="info-card-header"><span className="info-card-icon"><Info className="h-5 w-5" /></span><h2>نکته امنیتی</h2></div><p>اطلاعات ورود مشتریان فقط برای کاربران مجاز نمایش داده می‌شود و رمز عبور به‌صورت پیش‌فرض مخفی است.</p></div></aside></div></div></div>;
}
