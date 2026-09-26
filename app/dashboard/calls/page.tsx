'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, Play, Clock, Eye, Trash2, Video, MessageCircle } from 'lucide-react';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';

type CallLog = {
  id: string;
  customerId: string | null;
  phoneNumber: string | null;
  direction: 'incoming' | 'outgoing';
  status: 'answered' | 'missed' | 'rejected' | 'voicemail';
  durationSeconds: number;
  callDate: string;
  recordingUrl: string | null;
  notes: string | null;
  handledBy: string | null;
  callerId: string | null;
  receiverId: string | null;
  callType: string | null;
  source: string;
  createdAt: string;
};

type Profile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName?: string | null;
  userType: string;
  customerType?: string | null;
  companyName?: string | null;
};

const DIRECTION_INFO: Record<string, { label: string; color: string; icon: typeof PhoneIncoming }> = {
  incoming: { label: 'وارد', color: '#10b981', icon: PhoneIncoming },
  outgoing: { label: 'خارج', color: '#3b82f6', icon: PhoneOutgoing },
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  answered: { label: 'پاسخ داده شد', color: '#10b981' },
  missed: { label: 'رد شده', color: '#ef4444' },
  rejected: { label: 'رد کرد', color: '#f59e0b' },
  voicemail: { label: 'پیام صوتی', color: '#8b5cf6' },
};

const SOURCE_INFO: Record<string, { label: string; color: string; icon: typeof Phone }> = {
  phone: { label: 'تلفنی', color: '#6b7280', icon: Phone },
  social: { label: 'شبکه اجتماعی', color: '#3b82f6', icon: MessageCircle },
  customer: { label: 'تماس مشتری', color: '#10b981', icon: Phone },
};

function formatDuration(seconds: number): string {
  if (!seconds) return '۰';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toLocaleString('fa-IR')}:${secs.toString().padStart(2, '0').replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}`;
}

function getUserLabel(u: Profile): string {
  if (u.userType === 'customer' && u.customerType === 'company' && u.companyName) return u.companyName;
  if (u.fullName) return u.fullName;
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.companyName || 'کاربر');
}

export default function CallsPage() {
  const { profile } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDirection, setFilterDirection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [viewCall, setViewCall] = useState<CallLog | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where: Record<string, any> = {};
    if (filterDirection !== 'all') where.direction = filterDirection;
    if (filterStatus !== 'all') where.status = filterStatus;
    if (filterSource !== 'all') where.source = filterSource;
    const data = await fetchData<CallLog>('call_logs', {
      where,
      orderBy: { callDate: 'desc' },
    });
    setCalls(data);

    // Fetch profiles for caller/receiver names
    const profileIds = new Set<string>();
    for (const c of data) {
      if (c.callerId) profileIds.add(c.callerId);
      if (c.receiverId) profileIds.add(c.receiverId);
    }
    if (profileIds.size > 0) {
      try {
        const profs = await fetchData<Profile>('profiles', {
          where: { id: { in: Array.from(profileIds) } },
        });
        const map: Record<string, Profile> = {};
        for (const p of profs) map[p.id] = p;
        setProfilesMap(map);
      } catch {}
    }
    setLoading(false);
  }, [profile, filterDirection, filterStatus, filterSource]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (call: CallLog) => {
    if (!confirm('حذف این تماس؟')) return;
    if (!profile) return;
    try {
      await deleteData('call_logs', { id: call.id });
      toast.success('حذف شد');
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getCallPartyLabel = (call: CallLog): string => {
    if (call.source === 'phone') return call.phoneNumber || '—';
    const caller = call.callerId ? profilesMap[call.callerId] : null;
    const receiver = call.receiverId ? profilesMap[call.receiverId] : null;
    const callerName = caller ? getUserLabel(caller) : 'نامشخص';
    const receiverName = receiver ? getUserLabel(receiver) : 'نامشخص';
    return `${callerName} ← ${receiverName}`;
  };

  const filtered = search
    ? calls.filter((c) => {
        const s = search.toLowerCase();
        if (c.phoneNumber?.toLowerCase().includes(s)) return true;
        const party = getCallPartyLabel(c).toLowerCase();
        if (party.includes(s)) return true;
        return false;
      })
    : calls;

  return (
    <div>
      <PageHeader
        title="تماس‌ها"
        description="ثبت و پیگیری تماس‌های تلفنی، شبکه اجتماعی و مشتریان"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="جستجو بر اساس شماره یا نام..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
            dir="ltr"
          />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه منابع</SelectItem>
            <SelectItem value="phone">تلفنی</SelectItem>
            <SelectItem value="social">شبکه اجتماعی</SelectItem>
            <SelectItem value="customer">تماس مشتری</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDirection} onValueChange={setFilterDirection}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه جهت‌ها</SelectItem>
            <SelectItem value="incoming">وارد</SelectItem>
            <SelectItem value="outgoing">خارج</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="answered">پاسخ داده شد</SelectItem>
            <SelectItem value="missed">رد شده</SelectItem>
            <SelectItem value="rejected">رد کرد</SelectItem>
            <SelectItem value="voicemail">پیام صوتی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Phone className="w-8 h-8" />}
              title="تماسی ثبت نشده"
              description="تماس‌های تلفنی و شبکه اجتماعی در اینجا نمایش داده می‌شوند"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>منبع</TableHead>
                  <TableHead>طرفین مکالمه / شماره</TableHead>
                  <TableHead>جهت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>مدت</TableHead>
                  <TableHead>تاریخ و ساعت</TableHead>
                  <TableHead>ضبط صوت</TableHead>
                  {isSuperAdmin && <TableHead className="text-center">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((call) => {
                  const dir = DIRECTION_INFO[call.direction] || DIRECTION_INFO.incoming;
                  const DirIcon = dir.icon;
                  const st = STATUS_INFO[call.status] || STATUS_INFO.answered;
                  const src = SOURCE_INFO[call.source] || SOURCE_INFO.phone;
                  const SrcIcon = src.icon;
                  const isVideo = call.callType === 'video';
                  return (
                    <TableRow key={call.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: src.color + '15' }}
                          >
                            <SrcIcon className="w-4 h-4" style={{ color: src.color }} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{src.label}</span>
                          {isVideo && <Video className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-700">{getCallPartyLabel(call)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: dir.color + '15' }}
                          >
                            <DirIcon className="w-4 h-4" style={{ color: dir.color }} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{dir.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ color: st.color, borderColor: st.color + '40' }}
                          className="text-xs"
                        >
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {call.durationSeconds > 0 ? (
                          <span className="text-sm text-slate-500 flex items-center gap-1" dir="ltr">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDuration(call.durationSeconds)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatJalaliDateTime(call.callDate)}</TableCell>
                      <TableCell>
                        {call.recordingUrl ? (
                          <div className="flex items-center gap-2">
                            <audio controls className="h-8 max-w-[200px]" src={call.recordingUrl}>
                            </audio>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">بدون ضبط</span>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setViewCall(call); setViewDialogOpen(true); }}><Eye className="w-4 h-4 text-sky-600" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(call)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده تماس</DialogTitle></DialogHeader>
          {viewCall && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">منبع:</span> <span className="font-medium">{SOURCE_INFO[viewCall.source]?.label}</span></div>
                <div><span className="text-slate-400">نوع:</span> <span className="font-medium">{viewCall.callType === 'video' ? 'تصویری' : 'صوتی'}</span></div>
                <div><span className="text-slate-400">جهت:</span> <span className="font-medium">{DIRECTION_INFO[viewCall.direction]?.label}</span></div>
                <div><span className="text-slate-400">وضعیت:</span> <span className="font-medium">{STATUS_INFO[viewCall.status]?.label}</span></div>
                <div className="col-span-2"><span className="text-slate-400">طرفین:</span> <span className="font-medium">{getCallPartyLabel(viewCall)}</span></div>
                <div><span className="text-slate-400">مدت:</span> <span className="font-medium" dir="ltr">{formatDuration(viewCall.durationSeconds)}</span></div>
                <div><span className="text-slate-400">تاریخ:</span> <span className="font-medium">{formatJalaliDateTime(viewCall.callDate)}</span></div>
              </div>
              {viewCall.notes && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="text-slate-400 block mb-1">یادداشت:</span>{viewCall.notes}</div>}
              {viewCall.recordingUrl && <audio controls className="w-full mt-2" src={viewCall.recordingUrl} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
