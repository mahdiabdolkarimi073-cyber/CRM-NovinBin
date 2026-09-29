'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Search, KeyRound, Mail, Phone, Eye, EyeOff, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner';

type CredentialRow = {
  id: string;
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  owner: 'مدیر سازمان',
  super_admin: 'سوپر ادمین',
  admin: 'مدیر',
  personnel: 'پرسنل',
  academy_admin: 'ادمین آموزشگاه',
};

export default function CredentialsArchivePage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<CredentialRow | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = profile?.role === 'super_admin' || profile?.role === 'owner' || profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/credentials-archive');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      setRows(data.credentials || []);
    } catch (err: any) {
      toast.error(err.message || 'بارگذاری ناموفق');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = `${r.firstName || ''} ${r.lastName || ''} ${r.fullName || ''}`.toLowerCase();
    return name.includes(q) || (r.email || '').toLowerCase().includes(q) || (r.phone || '').includes(q);
  });

  const openEdit = (row: CredentialRow) => {
    setEditTarget(row);
    setEditEmail(row.email || '');
    setEditPhone(row.phone || '');
    setEditPassword('');
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/credentials-archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editTarget.id,
          email: editEmail || null,
          phone: editPhone || null,
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success('اطلاعات حساب کاربری با موفقیت ذخیره شد');
      setEditTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'ذخیره ناموفق');
    }
    setSaving(false);
  };

  if (!canManage) {
    return (
      <div>
        <PageHeader title="آرشیو نام‌های کاربری و رمز عبور" />
        <Card className="p-8 text-center">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">این بخش فقط برای مدیران قابل دسترسی است</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="آرشیو نام‌های کاربری و رمز عبور"
        description="مشاهده و مدیریت ایمیل، شماره موبایل و رمز عبور کاربران سازمان"
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="جستجو بر اساس نام، ایمیل یا شماره..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">کاربری یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-3 text-right font-medium">نام کاربر</th>
                  <th className="px-4 py-3 text-right font-medium">نقش</th>
                  <th className="px-4 py-3 text-right font-medium">ایمیل (نام کاربری)</th>
                  <th className="px-4 py-3 text-right font-medium">شماره موبایل</th>
                  <th className="px-4 py-3 text-right font-medium">رمز عبور</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-center font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const displayName = row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || '—';
                  const showPw = showPasswords[row.id];
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-smooth">
                      <td className="px-4 py-3 font-medium text-slate-800">{displayName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{roleLabels[row.role] || row.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">
                        {row.email ? (
                          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{row.email}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">
                        {row.phone ? (
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{row.phone}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 tracking-widest font-mono">
                            {showPw ? '••••••••' : '••••••••'}
                          </span>
                          <button
                            onClick={() => setShowPasswords((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                            className="text-slate-400 hover:text-slate-600"
                            title={showPw ? 'پنهان کردن' : 'نمایش'}
                          >
                            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${row.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${row.active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {row.active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(row)}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          ویرایش
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش اطلاعات حساب کاربری</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                کاربر: {editTarget.fullName || `${editTarget.firstName || ''} ${editTarget.lastName || ''}`}
              </div>
              <div className="space-y-2">
                <Label>ایمیل (نام کاربری) — اختیاری</Label>
                <Input dir="ltr" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>شماره موبایل — اختیاری</Label>
                <Input dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="09123456789" />
              </div>
              <div className="space-y-2">
                <Label>رمز عبور جدید — اختیاری</Label>
                <PasswordInput dir="ltr" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="برای تغییر، رمز جدید وارد کنید" />
                <p className="text-xs text-slate-400">حداقل ۶ کاراکتر. اگر خالی بگذارید، رمز قبلی حفظ می‌شود.</p>
              </div>
              <p className="text-xs text-slate-400 bg-amber-50 rounded-lg p-3">
                کاربر می‌تواند با ایمیل یا شماره موبایل (هر کدام که ثبت شده) و رمز عبور وارد شود. حداقل یکی از دو فیلد باید پر باشد.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
