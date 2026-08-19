'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatJalali, relativeTime } from '@/lib/format';
import type { RegistrationRequest } from '@/lib/types';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Building2,
  Mail,
  Phone,
  User,
} from 'lucide-react';

const statusBadge: Record<string, { label: string; class: string }> = {
  pending: { label: 'در انتظار', class: 'bg-amber-100 text-amber-700' },
  approved: { label: 'تایید شده', class: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'رد شده', class: 'bg-red-100 text-red-700' },
};

// Prisma returns camelCase fields; normalize for the UI which reads snake_case via types
type RegistrationRequestCamel = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
  birthDate: string | null;
  address: string | null;
  postalCode: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  authUserId: string | null;
  customerId: string | null;
  createdAt: string;
};

export default function RegistrationApprovalPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RegistrationRequestCamel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTarget, setViewTarget] = useState<RegistrationRequestCamel | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RegistrationRequestCamel | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = isSuperAdmin ? {} : {};
    const data = await fetchData<RegistrationRequestCamel>('registration_requests', {
      where,
      orderBy: { createdAt: 'desc' },
    });
    setRequests(data);
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (req: RegistrationRequestCamel) => {
    if (!profile) return;
    setApprovingId(req.id);

    try {
      const res = await fetch('/api/auth/approve-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          reviewerId: profile.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApprovingId(null);
        toast.error('خطا در تایید: ' + (data.error || 'ناموفق'));
        return;
      }

      toast.success('درخواست تایید شد. مشتری می‌تواند با ایمیل و رمز عبور خود وارد شود.');
      load();
    } catch (error: any) {
      toast.error('خطا در تایید: ' + (error?.message || 'ناموفق'));
    }
    setApprovingId(null);
  };

  const handleReject = async () => {
    if (!rejectTarget || !profile) return;
    setRejecting(true);
    try {
      await updateData('registration_requests', { id: rejectTarget.id }, {
        status: 'rejected',
        reviewedBy: profile.id,
        reviewedAt: new Date(),
        rejectReason: rejectReason || null,
      });
      toast.success('درخواست رد شد');
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'خطا');
    }
    setRejecting(false);
  };

  const openView = (req: RegistrationRequestCamel) => {
    setViewTarget(req);
    setViewOpen(true);
  };

  const openReject = (req: RegistrationRequestCamel) => {
    setRejectTarget(req);
    setRejectReason('');
    setRejectOpen(true);
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const rejected = requests.filter((r) => r.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderTable = (list: RegistrationRequestCamel[]) => {
    if (list.length === 0) {
      return (
        <Card>
          <EmptyState
            icon={<UserCheck className="w-8 h-8" />}
            title="درخواستی یافت نشد"
            description="درخواست‌های ثبت‌نام در این بخش نمایش داده می‌شوند"
          />
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام / شرکت</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>تلفن</TableHead>
                <TableHead>تاریخ درخواست</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((req) => {
                const st = statusBadge[req.status] || statusBadge.pending;
                const full = [req.firstName, req.lastName].filter(Boolean).join(' ') || '—';
                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-slate-100 text-slate-500 text-xs">
                            {full.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{full}</div>
                          {req.companyName && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {req.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600" dir="ltr">
                      {req.email}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600" dir="ltr">
                      {req.phone || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {formatJalali(req.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={st.class}>
                        {st.label}
                      </Badge>
                      {req.status === 'rejected' && req.rejectReason && (
                        <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                          {req.rejectReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openView(req)}
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                        {req.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              disabled={approvingId === req.id}
                              onClick={() => handleApprove(req)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {approvingId === req.id ? '...' : 'تایید'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openReject(req)}
                            >
                              <XCircle className="w-4 h-4" />
                              رد
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="تایید ثبت‌نام مشتریان"
        description="بررسی و تایید درخواست‌های ثبت‌نام مشتریان"
      />

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="w-4 h-4" />
            در انتظار
            {pending.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white">{pending.length.toLocaleString('fa-IR')}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            تایید شده
            {approved.length > 0 && (
              <span className="text-xs text-slate-400">({approved.length.toLocaleString('fa-IR')})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            <XCircle className="w-4 h-4" />
            رد شده
            {rejected.length > 0 && (
              <span className="text-xs text-slate-400">({rejected.length.toLocaleString('fa-IR')})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">{renderTable(pending)}</TabsContent>
        <TabsContent value="approved">{renderTable(approved)}</TabsContent>
        <TabsContent value="rejected">{renderTable(rejected)}</TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>جزئیات درخواست ثبت‌نام</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-sky-100 text-sky-700">
                    {(viewTarget.firstName?.[0] || '') + (viewTarget.lastName?.[0] || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">
                    {viewTarget.firstName} {viewTarget.lastName}
                  </div>
                  {viewTarget.companyName && (
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {viewTarget.companyName}
                    </div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`mr-auto ${(statusBadge[viewTarget.status] || statusBadge.pending).class}`}
                >
                  {(statusBadge[viewTarget.status] || statusBadge.pending).label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailField icon={<Mail className="w-4 h-4" />} label="ایمیل" value={viewTarget.email} ltr />
                <DetailField icon={<Phone className="w-4 h-4" />} label="تلفن" value={viewTarget.phone || '—'} ltr />
                <DetailField
                  icon={<User className="w-4 h-4" />}
                  label="تاریخ تولد"
                  value={viewTarget.birthDate ? formatJalali(viewTarget.birthDate) : '—'}
                />
                <DetailField
                  icon={<Building2 className="w-4 h-4" />}
                  label="کد پستی"
                  value={viewTarget.postalCode || '—'}
                  ltr
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-400">آدرس</Label>
                <div className="text-sm text-slate-700 p-3 rounded-lg bg-slate-50 border">
                  {viewTarget.address || '—'}
                </div>
              </div>

              {viewTarget.status === 'rejected' && viewTarget.rejectReason && (
                <div className="space-y-1">
                  <Label className="text-xs text-red-400">دلیل رد</Label>
                  <div className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200">
                    {viewTarget.rejectReason}
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-400 border-t pt-3">
                تاریخ درخواست: {formatJalali(viewTarget.createdAt)} ({relativeTime(viewTarget.createdAt)})
              </div>

              {viewTarget.status === 'pending' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setViewOpen(false);
                      openReject(viewTarget);
                    }}
                  >
                    <XCircle className="w-4 h-4" /> رد درخواست
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={approvingId === viewTarget.id}
                    onClick={() => {
                      setViewOpen(false);
                      handleApprove(viewTarget);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {approvingId === viewTarget.id ? 'در حال تایید...' : 'تایید درخواست'}
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>رد درخواست ثبت‌نام</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                آیا از رد درخواست{' '}
                <span className="font-medium text-slate-700">
                  {rejectTarget.firstName} {rejectTarget.lastName}
                </span>{' '}
                مطمئن هستید؟
              </div>
              <div className="space-y-2">
                <Label>دلیل رد (اختیاری)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="دلیل رد درخواست را وارد کنید..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                  انصراف
                </Button>
                <Button
                  variant="destructive"
                  disabled={rejecting}
                  onClick={handleReject}
                >
                  {rejecting ? 'در حال رد...' : 'رد درخواست'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-slate-700 font-medium" dir={ltr ? 'ltr' : undefined}>
        {value}
      </div>
    </div>
  );
}
