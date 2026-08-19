'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, relativeTime } from '@/lib/format';

const typeLabels: Record<string, string> = {
  leave: 'مرخصی', purchase: 'خرید', payment: 'پرداخت', invoice: 'فاکتور', contract: 'قرارداد', task: 'وظیفه',
};
const statusLabels: Record<string, string> = { pending: 'در انتظار', approved: 'تأیید شده', rejected: 'رد شده' };
const statusColors: Record<string, string> = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [appr, profs] = await Promise.all([
        fetchData('approval_requests', { where: {}, orderBy: { createdAt: 'desc' } }),
        fetchData('profiles', { where: {} }),
      ]);
      setApprovals(appr);
      setProfiles(profs);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await updateData('approval_requests', { id }, {
        status: approved ? 'approved' : 'rejected',
        approverId: profile?.id,
        approvedAt: new Date().toISOString(),
      });
      toast.success(approved ? 'تأیید شد' : 'رد شد');
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا');
    }
  };

  const getName = (id: string | null) => {
    if (!id) return '—';
    const p = profiles.find((p) => p.id === id);
    return p ? `${p.firstName} ${p.lastName}` : '—';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  const pending = approvals.filter((a) => a.status === 'pending');
  const processed = approvals.filter((a) => a.status !== 'pending');

  return (
    <div>
      <PageHeader title="تأییدها و گردش کار" description="مدیریت درخواست‌های تأیید و approbation workflow" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">در انتظار تأیید</div><div className="text-2xl font-bold text-amber-600">{pending.length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">تأیید شده</div><div className="text-2xl font-bold text-emerald-600">{approvals.filter((a) => a.status === 'approved').length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">رد شده</div><div className="text-2xl font-bold text-red-600">{approvals.filter((a) => a.status === 'rejected').length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">در انتظار ({pending.length.toLocaleString('fa-IR')})</TabsTrigger>
          <TabsTrigger value="processed">پردازش شده ({processed.length.toLocaleString('fa-IR')})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card><EmptyState icon={<CheckCircle2 className="w-8 h-8" />} title="درخواست تأییدی در انتظار نیست" /></Card>
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <Card key={a.id} className="border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                        <div>
                          <div className="font-semibold text-slate-900">{typeLabels[a.type] || a.type} - {a.entity}</div>
                          {a.description && <div className="text-sm text-slate-500 mt-1">{a.description}</div>}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-400">درخواست‌کننده: {getName(a.requesterId)}</span>
                            {a.amount > 0 && <span className="text-xs font-medium text-slate-600">{formatToman(a.amount)} ت</span>}
                            <span className="text-xs text-slate-400">{relativeTime(a.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="text-emerald-600 hover:bg-emerald-50 border-emerald-200" onClick={() => handleApprove(a.id, true)}>
                          <Check className="w-4 h-4" /> تأیید
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleApprove(a.id, false)}>
                          <X className="w-4 h-4" /> رد
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed">
          {processed.length === 0 ? (
            <Card><EmptyState icon={<CheckCircle2 className="w-8 h-8" />} title="درخواست پردازش‌شده‌ای نیست" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {processed.map((a) => {
                    const color = statusColors[a.status] || '#64748b';
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
                            {a.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{typeLabels[a.type] || a.type} - {a.entity}</div>
                            <div className="text-xs text-slate-400">{getName(a.requesterId)} - {relativeTime(a.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.amount > 0 && <span className="text-sm font-medium">{formatToman(a.amount)} ت</span>}
                          <Badge style={{ backgroundColor: color + '20', color }}>{statusLabels[a.status]}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
