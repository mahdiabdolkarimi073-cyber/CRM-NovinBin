'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2, Save, Server, KeyRound, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TaxMoadiSetting, TaxMoadiFiscalMemory } from '@/lib/types';

const TAXPAYER_TYPES = [
  { value: 'legal', label: 'حقوقی' },
  { value: 'individual', label: 'حقیقی' },
];

const VAT_STATUS = [
  { value: 'included', label: 'شامل مالیات' },
  { value: 'exempt', label: 'معاف از مالیات' },
  { value: 'none', label: 'بدون مالیات' },
];

const TAX_PERIOD = [
  { value: 'monthly', label: 'ماهانه' },
  { value: 'quarterly', label: 'فصلی' },
];

export default function TaxMoadiSettingsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TaxMoadiSetting | null>(null);
  const [memories, setMemories] = useState<TaxMoadiFiscalMemory[]>([]);

  const [taxpayerType, setTaxpayerType] = useState('legal');
  const [taxpayerName, setTaxpayerName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [economicCode, setEconomicCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [vatStatus, setVatStatus] = useState('included');
  const [fiscalYearStart, setFiscalYearStart] = useState('');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('');
  const [taxPeriod, setTaxPeriod] = useState('monthly');
  const [isActive, setIsActive] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingData, memData] = await Promise.all([
        fetchData<TaxMoadiSetting>('tax_moadi_settings', { where: {} }),
        fetchData<TaxMoadiFiscalMemory>('tax_moadi_fiscal_memories', { where: {} }),
      ]);
      const s = settingData?.[0];
      if (s) {
        setSettings(s);
        setTaxpayerType(s.taxpayerType || 'legal');
        setTaxpayerName(s.taxpayerName || '');
        setTradeName(s.tradeName || '');
        setNationalId(s.nationalId || '');
        setEconomicCode(s.economicCode || '');
        setPostalCode(s.postalCode || '');
        setLegalAddress(s.legalAddress || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setRegistrationNo(s.registrationNo || '');
        setVatStatus(s.vatStatus || 'included');
        setFiscalYearStart(s.fiscalYearStart || '');
        setFiscalYearEnd(s.fiscalYearEnd || '');
        setTaxPeriod(s.taxPeriod || 'monthly');
        setIsActive(s.isActive || false);
      }
      setMemories(memData || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const data = {
        taxpayerType,
        taxpayerName: taxpayerName || null,
        tradeName: tradeName || null,
        nationalId: nationalId || null,
        economicCode: economicCode || null,
        postalCode: postalCode || null,
        legalAddress: legalAddress || null,
        phone: phone || null,
        email: email || null,
        registrationNo: registrationNo || null,
        vatStatus,
        fiscalYearStart: fiscalYearStart || null,
        fiscalYearEnd: fiscalYearEnd || null,
        taxPeriod,
        isActive,
        updatedAt: new Date().toISOString(),
      };
      if (settings) {
        await updateData('tax_moadi_settings', { id: settings.id }, data);
      } else {
        await createData('tax_moadi_settings', data);
      }
      await createData('tax_moadi_audit_logs', {
        action: 'settings_change',
        entity: 'setting',
        userId: profile.id,
        details: { taxpayerType, vatStatus, isActive },
      });
      toast.success('تنظیمات ذخیره شد');
      loadData();
    } catch (error: any) {
      toast.error('ذخیره ناموفق: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
          <h1 className="text-[28px] font-bold text-[#101828]">تنظیمات و حافظه مالیاتی</h1>
        </div>
        <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> تنظیمات</div>
      </header>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Settings2 className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">اطلاعات مؤدی</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع مؤدی</Label>
                    <select value={taxpayerType} onChange={(e) => setTaxpayerType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {TAXPAYER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام مؤدی</Label>
                    <Input value={taxpayerName} onChange={(e) => setTaxpayerName(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام تجاری</Label>
                    <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کد ملی / شناسه ملی</Label>
                    <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کد اقتصادی</Label>
                    <Input value={economicCode} onChange={(e) => setEconomicCode(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کد پستی</Label>
                    <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره ثبت</Label>
                    <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تلفن</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">ایمیل</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-semibold text-[#344054]">نشانه حقوقی</Label>
                    <Input value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">وضعیت مالیات بر ارزش افزوده</Label>
                    <select value={vatStatus} onChange={(e) => setVatStatus(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {VAT_STATUS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دوره مالیاتی</Label>
                    <select value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {TAX_PERIOD.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شروع سال مالی</Label>
                    <Input value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} placeholder="1403/01/01" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">پایان سال مالی</Label>
                    <Input value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)} placeholder="1403/12/29" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-[#DCE3EE]" />
                    <Label htmlFor="isActive" className="text-sm font-semibold text-[#344054]">فعالسازی تنظیمات</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366f1]/10 text-[#6366f1]"><Server className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">حافظه‌های مالیاتی</h2>
                </div>
                {memories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#667085]">حافظه‌ای پیکربندی نشده است</p>
                ) : (
                  <div className="space-y-3">
                    {memories.map((m) => (
                      <div key={m.id} className="rounded-[8px] border border-[#E7ECF3] p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#1D2939]">{m.label || m.memoryId || 'حافظه'}</span>
                          <span className={`rounded px-2 py-0.5 text-xs ${m.isActive ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#94a3b8]/10 text-[#94a3b8]'}`}>
                            {m.isActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-[#667085]">
                          <div>محیط: {m.environment === 'production' ? 'تولید' : 'تست'}</div>
                          <div>آخرین اتصال: {m.lastConnectionOk ? 'موفق' : 'ناموفق'}</div>
                          {m.lastError && <div className="text-rose-600 mt-1">{m.lastError}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 rounded-[8px] border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <p className="text-xs text-blue-700">برای پیکربندی حافظه مالیاتی، نیاز به کلید خصوصی، شناسه کلاینت و آدرس API سامانه مؤدیان دارید. این اطلاعات از پورتال مؤدیان قابل دریافت است.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={saving} className="h-[48px] w-full rounded-[10px] bg-[#3155E7] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7] disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
