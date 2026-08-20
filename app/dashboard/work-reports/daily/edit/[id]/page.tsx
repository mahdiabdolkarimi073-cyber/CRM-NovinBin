'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Calendar, Save, Pencil, List, Folder, Eye, HelpCircle, Info, Lock } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

type DailyWorkReport = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  duration: string | null;
  details: string | null;
  reportDate: string;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'in_progress', label: 'در حال انجام' },
  { value: 'incomplete', label: 'ناقص' },
  { value: 'needs_followup', label: 'نیازمند پیگیری' },
];

const DURATION_OPTIONS = [
  { value: 'under_2h', label: 'کمتر از ۲ ساعت' },
  { value: '2_to_4h', label: '۲ تا ۴ ساعت' },
  { value: '4_to_6h', label: '۴ تا ۶ ساعت' },
  { value: 'over_6h', label: 'بیشتر از ۶ ساعت' },
];

const SUMMARY_MAX = 2000;
const DETAILS_MAX = 5000;

export default function EditDailyReportPage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<DailyWorkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [form, setForm] = useState({
    title: '',
    project: '',
    reportDate: '',
    summary: '',
    details: '',
    status: '',
    duration: '',
  });

  const today = toLocalDateString(new Date());
  const todayDate = new Date();

  useEffect(() => {
    if (!params.id || !profile?.id) return;
    fetchData<DailyWorkReport>('daily_work_reports', { where: { id: params.id } })
      .then((data) => {
        const r = data[0] || null;
        setReport(r);
        if (r) {
          const reportDay = toLocalDateString(new Date(r.reportDate));
          const editable = reportDay === today && r.profileId === profile.id;
          setCanEdit(editable);
          setForm({
            title: r.title,
            project: r.project || '',
            reportDate: reportDay,
            summary: r.description || '',
            details: r.details || '',
            status: r.status,
            duration: r.duration || '',
          });
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error('خطا در بارگذاری گزارش');
        setLoading(false);
      });
  }, [params.id, profile?.id, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !profile?.id) return;
    if (!form.title.trim()) { toast.error('عنوان گزارش را وارد کنید'); return; }
    if (!form.reportDate) { toast.error('تاریخ گزارش را انتخاب کنید'); return; }
    if (!form.status) { toast.error('وضعیت گزارش را انتخاب کنید'); return; }

    setSaving(true);
    try {
      await updateData('daily_work_reports', { id: params.id }, {
        title: form.title.trim(),
        description: form.summary.trim() || null,
        project: form.project.trim() || null,
        status: form.status,
        duration: form.duration || null,
        details: form.details.trim() || null,
      });
      toast.success('گزارش ویرایش شد');
      router.push('/dashboard/work-reports/daily');
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + (error?.message || 'خطای ناشناخته'));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0875C9] border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-[14px] border border-[#D9E2EF] bg-white p-16 text-center">
        <p className="mb-4 text-slate-500">گزارش موردنظر یافت نشد</p>
        <Link href="/dashboard/work-reports/daily">
          <Button variant="outline" className="rounded-[10px]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="w-full" dir="rtl">
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-amber-200 bg-amber-50 p-12 text-center">
          <Lock className="mb-4 h-12 w-12 text-amber-500" />
          <h2 className="mb-2 text-lg font-bold text-amber-800">ویرایش این گزارش امکان‌پذیر نیست</h2>
          <p className="mb-6 max-w-md text-sm text-amber-700">
            گزارش‌ها فقط در همان روزی که ثبت شده‌اند قابل ویرایش هستند. مهلت ویرایش این گزارش به پایان رسیده است.
          </p>
          <Link href={`/dashboard/work-reports/daily/view/${report.id}`}>
            <Button className="rounded-[10px] bg-[#10265F] hover:bg-[#1a3a7a]">
              <Eye className="h-4 w-4" /> مشاهده گزارش
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">
              ویرایش گزارش کار روزانه
            </h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">
            گزارش‌ها فقط در روز ثبت قابل ویرایش هستند
          </p>
        </div>
        <Link href="/dashboard/work-reports/daily">
          <Button
            variant="outline"
            className="h-[52px] w-full rounded-[10px] border-[#D6E0EC] bg-white text-[#0F172A] shadow-sm sm:w-[215px]"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به گزارش‌ها
          </Button>
        </Link>
      </div>

      <div className="mt-8 rounded-[14px] border border-[#DCE4EF] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-[21px] w-[21px] text-[#2563EB]" />
            <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات گزارش</h2>
          </div>
          <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
              عنوان گزارش <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                پروژه / فعالیت مرتبط (اختیاری)
              </Label>
              <Input
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              />
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                تاریخ گزارش
              </Label>
              <JalaliDatePicker
                value={form.reportDate ? new Date(form.reportDate) : null}
                onChange={(d) => setForm({ ...form, reportDate: d ? toLocalDateString(d) : '' })}
                minDate={todayDate}
                maxDate={todayDate}
                className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
              خلاصه فعالیت‌های انجام شده <span className="text-[#DC2626]">*</span>
            </Label>
            <Textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value.slice(0, SUMMARY_MAX) })}
              className="h-[115px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              required
            />
            <div className="mt-1 text-left text-[12px] text-[#94A3B8]">
              {form.summary.length.toLocaleString('fa-IR')} / {SUMMARY_MAX.toLocaleString('fa-IR')}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
              جزئیات فعالیت‌ها
            </Label>
            <Textarea
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value.slice(0, DETAILS_MAX) })}
              className="h-[115px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
            />
            <div className="mt-1 text-left text-[12px] text-[#94A3B8]">
              {form.details.length.toLocaleString('fa-IR')} / {DETAILS_MAX.toLocaleString('fa-IR')}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                وضعیت گزارش <span className="text-[#DC2626]">*</span>
              </Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                مدت زمان کارکرد (اختیاری)
              </Label>
              <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]">
                  <SelectValue placeholder="انتخاب مدت زمان..." />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-row gap-3.5 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="h-[52px] w-[60%] rounded-[10px] bg-[#102A68] text-[14px] font-bold text-white transition-all hover:bg-[#1a3a7a] hover:shadow-md sm:w-[175px]"
            >
              <Save className="h-4 w-4" />
              {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
            <Link href="/dashboard/work-reports/daily" className="w-[40%] sm:w-[110px]">
              <Button
                type="button"
                variant="outline"
                className="h-[52px] w-full rounded-[10px] border-[#D4DEEA] bg-white text-[14px] font-medium text-[#172033]"
              >
                انصراف
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
