'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, deleteData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowRight, ClipboardCheck, Building2, ShieldCheck, Calendar,
  User, Loader2, Lightbulb, Info, Trash2, Check,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Warehouse, Profile, StockTaking } from '@/lib/types';

const STK_TYPES = [
  { value: 'full', label: 'کامل (کل انبار)' },
  { value: 'partial', label: 'جزئی (گروه خاص)' },
  { value: 'spot', label: 'موردی (محصول خاص)' },
];

const SCOPE_TYPES = [
  { value: 'all', label: 'کل محصولات' },
  { value: 'category', label: 'بر اساس دسته‌بندی' },
  { value: 'location', label: 'بر اساس موقعیت' },
];

const STK_STATUS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'in_progress', label: 'در حال انجام' },
  { value: 'counted', label: 'شمارش تکمیل شد' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'closed', label: 'بسته شده' },
  { value: 'cancelled', label: 'لغو شده' },
];

const guideItems = [
  { icon: Building2, title: 'انتخاب انبار', desc: 'انبار مورد نظر برای انبارگردانی را انتخاب کنید.' },
  { icon: ShieldCheck, title: 'توقف عملیات', desc: 'در صورت نیاز، می‌توانید عملیات انبار را در طول انبارگردانی متوقف کنید.' },
  { icon: Calendar, title: 'نوع انبارگردانی', desc: 'انبارگردانی می‌تواند کامل، جزئی یا موردی باشد.' },
  { icon: User, title: 'مسئول', desc: 'شخص مسئول انجام انبارگردانی را تعیین کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  padding: '0 14px',
  fontSize: 14,
  width: '100%',
  background: 'transparent',
  outline: 'none',
};

export default function EditStockTakingPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [stockTakingType, setStockTakingType] = useState('full');
  const [scopeType, setScopeType] = useState('all');
  const [scopeValue, setScopeValue] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [freezeOperations, setFreezeOperations] = useState(false);
  const [status, setStatus] = useState('draft');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [whData, staffData, stkList] = await Promise.all([
        fetchData<Warehouse>('warehouses', { where: {} }),
        fetchData<Profile>('profiles', { where: { active: true } }),
        fetchData<StockTaking>('stock_takings', { where: { id } }),
      ]);
      setWarehouses(whData || []);
      setStaff(staffData || []);

      if (stkList && stkList.length > 0) {
        const stk = stkList[0];
        setNumber(stk.number || '');
        setWarehouseId(stk.warehouseId || '');
        setStockTakingType(stk.stockTakingType || 'full');
        setScopeType(stk.scopeType || 'all');
        setScopeValue(stk.scopeValue || '');
        setResponsibleId(stk.responsibleId || '');
        setStartDate(stk.startDate ? new Date(stk.startDate).toISOString().slice(0, 10) : '');
        setDescription(stk.description || '');
        setFreezeOperations(Boolean(stk.freezeOperations));
        setStatus(stk.status || 'draft');
      } else {
        toast.error('عملیات انبارگردانی یافت نشد');
        router.push('/dashboard/stock-taking');
      }
    } catch (error: any) {
      toast.error('خطا در بارگذاری اطلاعات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!warehouseId) e.warehouseId = 'انتخاب انبار الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('اطلاعات کاربر بارگذاری نشده');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await updateData(
        'stock_takings',
        { id },
        {
          warehouseId,
          stockTakingType,
          scopeType,
          scopeValue: scopeValue || null,
          responsibleId: responsibleId || null,
          startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
          description: description || null,
          freezeOperations,
          status,
        }
      );

      try {
        await createData('stock_taking_history', {
          stockTakingId: id,
          action: 'status_changed',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: status,
          details: { updatedBy: profile.id, status },
        });
      } catch {}

      toast.success('تغییرات انبارگردانی با موفقیت ذخیره شد');
      router.push('/dashboard/stock-taking');
    } catch (error: any) {
      toast.error('خطا در ذخیره تغییرات: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('آیا از حذف این انبارگردانی اطمینان دارید؟')) return;
    try {
      await deleteData('stock_takings', { id });
      toast.success('انبارگردانی حذف شد');
      router.push('/dashboard/stock-taking');
    } catch (error: any) {
      toast.error('خطا در حذف: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/stock-taking" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="nb-editor-breadcrumb">
            <span className="nb-editor-breadcrumb-muted">داشبورد</span>
            <span className="nb-editor-breadcrumb-separator">/</span>
            <Link href="/dashboard/stock-taking" className="nb-editor-breadcrumb-muted hover:text-slate-900 dark:hover:text-slate-100">
              انبارگردانی
            </Link>
            <span className="nb-editor-breadcrumb-separator">/</span>
            <span className="nb-editor-breadcrumb-current">ویرایش {number}</span>
          </div>
        </div>

        <div className="nb-editor-topbar-right">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </button>
          )}
          <Link href="/dashboard/stock-taking" className="nb-editor-discard">
            انصراف
          </Link>
          <button
            type="submit"
            form="edit-stocktaking-form"
            disabled={submitting}
            className="nb-editor-save-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                ذخیره تغییرات
              </>
            )}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="edit-stocktaking-form" onSubmit={handleSave} className="lg:col-span-2 space-y-6">
            <div className="nb-editor-canvas">
              <div className="nb-editor-canvas-header">
                <span className="nb-editor-canvas-icon" style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #E65100 100%)' }}>
                  <ClipboardCheck className="h-4 w-4 text-white" />
                </span>
                <div>
                  <h2>ویرایش انبارگردانی</h2>
                  <p>اطلاعات و وضعیت انبارگردانی را ویرایش کنید</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره انبارگردانی</Label>
                  <input
                    value={number}
                    readOnly
                    dir="ltr"
                    className="nb-input bg-slate-50 dark:bg-slate-900 text-slate-500 font-mono"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت عملیات</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {STK_STATUS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">
                    انبار <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={warehouseId}
                    onChange={(e) => {
                      setWarehouseId(e.target.value);
                      if (errors.warehouseId) setErrors({ ...errors, warehouseId: '' });
                    }}
                    className={`nb-input ${errors.warehouseId ? 'border-rose-400' : ''}`}
                    style={inputStyle}
                  >
                    <option value="">انتخاب انبار...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.warehouseId && <p className="text-xs text-rose-500">{errors.warehouseId}</p>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مسئول انبارگردانی</Label>
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    <option value="">انتخاب مسئول...</option>
                    {staff.map((p) => (
                      <option key={p.id} value={p.id}>
                        {fullName(p.firstName, p.lastName)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع انبارگردانی</Label>
                  <select
                    value={stockTakingType}
                    onChange={(e) => setStockTakingType(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {STK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">محدوده شمارش</Label>
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {SCOPE_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {scopeType !== 'all' && (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">
                    {scopeType === 'category' ? 'نام دسته‌بندی' : 'موقعیت یا قفسه'}
                  </Label>
                  <input
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                    placeholder={scopeType === 'category' ? 'مثال: لوازم جانبی' : 'مثال: ردیف A'}
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              )}

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">تاریخ شروع</Label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="nb-input"
                  style={inputStyle}
                />
              </div>

              <div className="nb-editor-field-group">
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
                  <Checkbox
                    id="freeze"
                    checked={freezeOperations}
                    onCheckedChange={(checked) => setFreezeOperations(Boolean(checked))}
                  />
                  <label htmlFor="freeze" className="text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
                    توقف تمام عملیات ورود و خروج انبار در طول انبارگردانی
                  </label>
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات و یادداشت</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی درباره هدف یا جزئیات انبارگردانی..."
                  rows={4}
                  className="rounded-lg border border-slate-200 bg-transparent text-sm focus:border-amber-400 focus:outline-none dark:border-slate-700"
                />
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                با تغییر وضعیت به «شمارش تکمیل شد» یا «بسته شده»، تمام تغییرات و اقلام مغایرت در گزارش‌های مالی و انبار ثبت خواهند شد.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
