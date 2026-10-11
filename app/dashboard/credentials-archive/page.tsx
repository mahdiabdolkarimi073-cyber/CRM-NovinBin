'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Search, KeyRound, Mail, Phone, Eye, EyeOff, Loader2, Archive, UserPlus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

type CredentialRow = {
  id: string;
  profileId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  link: string | null;
  active: boolean;
  createdAt: string;
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
  const [editLink, setEditLink] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createLink, setCreateLink] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);

  const canManage = !!profile;

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
    return (r.fullName || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q) || (r.phone || '').includes(q) || (r.link || '').toLowerCase().includes(q);
  });

  const openEdit = (row: CredentialRow) => {
    setEditTarget(row);
    setEditEmail(row.email || '');
    setEditPhone(row.phone || '');
    setEditLink(row.link || '');
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
          link: editLink || null,
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success('اطلاعات با موفقیت ذخیره شد');
      setEditTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'ذخیره ناموفق');
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error('نام شبکه اجتماعی الزامی است');
      return;
    }
    if (createPassword.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/auth/credentials-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: createName.trim(),
          email: createEmail || undefined,
          phone: createPhone || undefined,
          link: createLink || undefined,
          password: createPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success('رکورد جدید با موفقیت ایجاد شد');
      setCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePhone('');
      setCreateLink('');
      setCreatePassword('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'ایجاد ناموفق');
    }
    setCreating(false);
  };

  if (!canManage) {
    return (
      <div>
        <PageHeader title="آرشیو نام‌های کاربری و رمز عبور شبکه اجتماعی" />
        <Card className="p-8 text-center">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">شما به این بخش دسترسی ندارید</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="آرشیو نام‌های کاربری و رمز عبور شبکه اجتماعی"
        description="مدیریت نام کاربری، رمز عبور، ایمیل، شماره و لینک حساب‌های شبکه اجتماعی"
      />

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="جستجو بر اساس نام شبکه اجتماعی، ایمیل، شماره یا لینک..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4" />
          افزودن رکورد جدید
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">رکوردی یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-3 text-right font-medium">نام شبکه اجتماعی</th>
                  <th className="px-4 py-3 text-right font-medium">ایمیل</th>
                  <th className="px-4 py-3 text-right font-medium">شماره</th>
                  <th className="px-4 py-3 text-right font-medium">لینک</th>
                  <th className="px-4 py-3 text-right font-medium">رمز عبور</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-center font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const showPw = showPasswords[row.id];
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-smooth">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.fullName || '—'}</td>
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
                      <td className="px-4 py-3 text-slate-600" dir="ltr">
                        {row.link ? (
                          <a href={row.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-600 hover:underline">
                            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="max-w-[160px] truncate">{row.link}</span>
                          </a>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 tracking-widest font-mono">
                            ••••••••
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

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش اطلاعات</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                نام شبکه اجتماعی: {editTarget.fullName}
              </div>
              <div className="space-y-2">
                <Label>ایمیل — اختیاری</Label>
                <Input dir="ltr" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>شماره — اختیاری</Label>
                <Input dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="09123456789" />
              </div>
              <div className="space-y-2">
                <Label>لینک — اختیاری</Label>
                <Input dir="ltr" value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>رمز عبور جدید — اختیاری</Label>
                <PasswordInput dir="ltr" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="برای تغییر، رمز جدید وارد کنید" />
                <p className="text-xs text-slate-400">حداقل ۶ کاراکتر. اگر خالی بگذارید، رمز قبلی حفظ می‌شود.</p>
              </div>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن رکورد جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نام شبکه اجتماعی — الزامی</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="مثال: اینستاگرام نوین بین" />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور — الزامی</Label>
              <PasswordInput dir="ltr" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" />
            </div>
            <div className="space-y-2">
              <Label>ایمیل — اختیاری</Label>
              <Input dir="ltr" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>شماره — اختیاری</Label>
              <Input dir="ltr" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="09123456789" />
            </div>
            <div className="space-y-2">
              <Label>لینک — اختیاری</Label>
              <Input dir="ltr" value={createLink} onChange={(e) => setCreateLink(e.target.value)} placeholder="https://..." />
            </div>
            <p className="text-xs text-slate-400 bg-amber-50 rounded-lg p-3">
              فقط نام شبکه اجتماعی و رمز عبور الزامی هستند. سایر فیلدها اختیاری.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ایجاد رکورد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
