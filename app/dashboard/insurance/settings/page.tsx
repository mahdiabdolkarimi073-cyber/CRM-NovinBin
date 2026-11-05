'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { InsuranceSetting } from '@/lib/types';

export default function InsuranceSettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<InsuranceSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reminderDays: [] as number[],
    autoCreateTask: true,
    currencyUnit: 'toman',
    defaultCommissionRate: '10',
    notes: '',
  });
  const [newDay, setNewDay] = useState('');

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const s = await fetchData<InsuranceSetting>('insurance_settings', { take: 1 });
      if (s && s.length > 0) {
        setSettings(s[0]);
        setForm({
          reminderDays: s[0].reminderDays || [],
          autoCreateTask: s[0].autoCreateTask,
          currencyUnit: s[0].currencyUnit || 'toman',
          defaultCommissionRate: String(s[0].defaultCommissionRate || 10),
          notes: s[0].notes || '',
        });
      }
    } catch (e: any) { console.error(e); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        reminderDays: form.reminderDays,
        autoCreateTask: form.autoCreateTask,
        currencyUnit: form.currencyUnit,
        defaultCommissionRate: Number(form.defaultCommissionRate) || 0,
        notes: form.notes || null,
        createdBy: profile?.id,
      };
      if (settings) {
        await updateData('insurance_settings', { id: settings.id }, data);
        toast.success('تنظیمات ذخیره شد');
      } else {
        await createData('insurance_settings', data);
        toast.success('تنظیمات ایجاد شد');
      }
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const addReminderDay = () => {
    const d = Number(newDay);
    if (d > 0 && !form.reminderDays.includes(d)) {
      setForm(f => ({ ...f, reminderDays: [...f.reminderDays, d].sort((a, b) => a - b) }));
    }
    setNewDay('');
  };

  const removeReminderDay = (d: number) => {
    setForm(f => ({ ...f, reminderDays: f.reminderDays.filter(x => x !== d) }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات ماژول بیمه</h1>
        <p className="text-sm text-muted-foreground mt-1">پیکربندی ماژول مدیریت بیمه</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label>روزهای یادآوری تمدید (روز قبل از سررسید)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input type="number" value={newDay} onChange={e => setNewDay(e.target.value)} placeholder="مثلا ۳۰" className="w-32" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReminderDay(); } }} />
              <Button size="sm" variant="outline" onClick={addReminderDay}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.reminderDays.map(d => (
                <Badge key={d} variant="secondary" className="cursor-pointer" onClick={() => removeReminderDay(d)}>
                  {d} روز <X className="h-3 w-3 mr-1" />
                </Badge>
              ))}
              {form.reminderDays.length === 0 && <span className="text-sm text-muted-foreground">یادآوری تعریف نشده</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.autoCreateTask} onCheckedChange={v => setForm(f => ({ ...f, autoCreateTask: v }))} />
            <Label>ایجاد خودکار وظیفه برای تمدید</Label>
          </div>

          <div>
            <Label>واحد پول</Label>
            <Select value={form.currencyUnit} onValueChange={v => setForm(f => ({ ...f, currencyUnit: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toman">تومان</SelectItem>
                <SelectItem value="rial">ریال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>نرخ پیش‌فرض کارمزد (٪)</Label>
            <Input type="number" value={form.defaultCommissionRate} onChange={e => setForm(f => ({ ...f, defaultCommissionRate: e.target.value }))} />
          </div>

          <div>
            <Label>توضیحات</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
            ذخیره تنظیمات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
