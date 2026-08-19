'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { MessageSquare, Plus } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { Ticket } from '@/lib/types';

const statusLabels: Record<string, string> = { open: 'باز', in_progress: 'در حال انجام', resolved: 'حل شده', closed: 'بسته' };
const statusColors: Record<string, string> = { open: '#3b82f6', in_progress: '#f59e0b', resolved: '#10b981', closed: '#64748b' };
const priorityLabels: Record<string, string> = { low: 'کم', medium: 'متوسط', high: 'زیاد', critical: 'بحرانی' };

export default function PortalTicketsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });

  const load = useCallback(async () => {
    if (!profile?.customerId) return;
    setLoading(true);
    try {
      const data = await fetchData<Ticket>('tickets', { where: { customerId: profile.customerId }, orderBy: { createdAt: 'desc' } });
      setTickets(data);
    } catch {
      setTickets([]);
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.customerId || !form.subject) { toast.error('موضوع را وارد کنید'); return; }
    setCreating(true);
    try {
      await createData('tickets', {
        subject: form.subject,
        description: form.description || null,
        customerId: profile.customerId,
        priority: form.priority,
        status: 'open',
        createdBy: profile.id,
        channel: 'portal',
      });
      toast.success('تیکت ثبت شد');
      setDialogOpen(false);
      setForm({ subject: '', description: '', priority: 'medium' });
      load();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + (e.message || ''));
    }
    setCreating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader
        title="تیکت‌های من"
        description="درخواست‌های پشتیبانی"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> تیکت جدید</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ثبت تیکت پشتیبانی</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>موضوع *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
                <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>اولویت</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button type="submit" disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت تیکت'}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {tickets.length === 0 ? (
        <Card><EmptyState icon={<MessageSquare className="w-8 h-8" />} title="تیکتی ندارید" description="درخواست پشتیبانی خود را ثبت کنید" action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> ثبت تیکت</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id}><CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.subject}</div>
                    {t.description && <div className="text-xs text-slate-500 mt-1">{t.description}</div>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Badge style={{ backgroundColor: statusColors[t.status] + '20', color: statusColors[t.status] }}>{statusLabels[t.status]}</Badge>
                <Badge variant="outline" className="text-xs">{priorityLabels[t.priority]}</Badge>
                <span className="text-xs text-slate-400 mr-auto">{relativeTime(t.createdAt)}</span>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
