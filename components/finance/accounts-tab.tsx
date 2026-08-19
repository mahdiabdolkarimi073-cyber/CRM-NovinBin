'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type { Account, CostCenter } from '@/lib/types';

const accountTypes = [
  { key: 'asset', label: 'دارایی', color: '#3b82f6', nature: 'debit' },
  { key: 'liability', label: 'بدهی', color: '#ef4444', nature: 'credit' },
  { key: 'equity', label: 'حقوق صاحبان سهام', color: '#8b5cf6', nature: 'credit' },
  { key: 'revenue', label: 'درآمد', color: '#10b981', nature: 'credit' },
  { key: 'expense', label: 'هزینه', color: '#f59e0b', nature: 'debit' },
];

interface AccountsTabProps {
  accounts: Account[];
  costCenters: CostCenter[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AccountsTab({ accounts, costCenters, loading, onCreate, onDelete }: AccountsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', type: 'asset', parentId: '', costCenterId: '',
    description: '', isGroup: false, openingBalance: '',
  });

  const handleCreate = async () => {
    if (!form.code || !form.name) { toast.error('کد و نام حساب را وارد کنید'); return; }
    await onCreate({
      code: form.code,
      name: form.name,
      type: form.type,
      parentId: form.parentId || null,
      costCenterId: form.costCenterId || null,
      description: form.description || null,
      isGroup: form.isGroup,
      openingBalance: Number(form.openingBalance) || 0,
    });
    setDialogOpen(false);
    setForm({ code: '', name: '', type: 'asset', parentId: '', costCenterId: '', description: '', isGroup: false, openingBalance: '' });
  };

  const buildTree = (accs: Account[], parentId: string | null = null): Account[] => {
    return accs.filter((a) => a.parentId === parentId).map((a) => ({ ...a }));
  };

  const renderAccountRow = (acc: Account, level: number = 0): React.ReactElement => {
    const type = accountTypes.find((t) => t.key === acc.type) || accountTypes[0];
    const children = accounts.filter((a) => a.parentId === acc.id);
    return (
      <>
        <tr key={acc.id} className="hover:bg-slate-50 transition-smooth">
          <td className="p-3 font-mono text-slate-500" dir="ltr" style={{ paddingRight: `${level * 20 + 12}px` }}>
            {acc.code}
          </td>
          <td className="p-3 font-medium">
            <span className={level > 0 ? 'text-slate-600' : ''}>{acc.name}</span>
            {acc.isGroup && <Badge variant="secondary" className="text-[10px] mr-2">گروه</Badge>}
          </td>
          <td className="p-3"><Badge style={{ backgroundColor: type.color + '20', color: type.color }}>{type.label}</Badge></td>
          <td className="p-3 font-bold text-slate-700">{formatToman(Number(acc.balance))} ت</td>
          <td className="p-3 text-center">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => onDelete(acc.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </td>
        </tr>
        {children.map((child) => renderAccountRow(child, level + 1))}
      </>
    );
  };

  const rootAccounts = buildTree(accounts);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> حساب جدید</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>ایجاد حساب جدید</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>کد حساب *</Label><Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div className="space-y-2"><Label>نوع حساب</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{accountTypes.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>نام حساب *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>حساب والد</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="بدون والد" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون والد (حساب اصلی)</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>مرکز هزینه</Label>
                <Select value={form.costCenterId} onValueChange={(v) => setForm({ ...form, costCenterId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="بدون مرکز هزینه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مرکز هزینه</SelectItem>
                    {costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>موجودی اول دوره (تومان)</Label><Input dir="ltr" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></div>
              <div className="space-y-2"><Label>توضیحات</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isGroup} onChange={(e) => setForm({ ...form, isGroup: e.target.checked })} className="rounded" />
                این حساب یک گروه است (سند به آن ثبت نمی‌شود)
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleCreate}>ایجاد</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-400"><BookOpen className="w-8 h-8 mx-auto mb-2" /><div>حسابی تعریف نشده. چارت حساب‌های سازمان را ایجاد کنید.</div></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 text-slate-500 text-xs">
                <th className="text-right p-3 font-medium">کد</th>
                <th className="text-right p-3 font-medium">نام حساب</th>
                <th className="text-right p-3 font-medium">نوع</th>
                <th className="text-right p-3 font-medium">مانده</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rootAccounts.map((acc) => renderAccountRow(acc))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
