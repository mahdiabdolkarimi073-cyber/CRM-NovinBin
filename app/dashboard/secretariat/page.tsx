'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, FilePlus2, Send, Inbox, Outbox, Archive, PenTool,
  Clock, AlertCircle, ChevronLeft, Eye, Check, X, Undo2,
  History, Mail, Lock, Flame, FileCheck, Search,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, relativeTime } from '@/lib/format';
import { toast } from 'sonner';

type AnyRow = Record<string, any>;

const LETTER_TYPES = [
  { key: 'incoming', label: 'وارده', color: '#3b82f6' },
  { key: 'outgoing', label: 'صادره', color: '#10b981' },
  { key: 'internal', label: 'داخلی', color: '#8b5cf6' },
];

const URGENCY_LEVELS = [
  { key: 'normal', label: 'عادی', color: '#64748b' },
  { key: 'urgent', label: 'فوری', color: '#f59e0b' },
  { key: 'very_urgent', label: 'خیلی فوری', color: '#ef4444' },
];

const CONFIDENTIALITY_LEVELS = [
  { key: 'normal', label: 'عادی', color: '#64748b' },
  { key: 'confidential', label: 'محرمانه', color: '#f59e0b' },
  { key: 'very_confidential', label: 'خیلی محرمانه', color: '#ef4444' },
];

const LETTER_STATUSES = [
  { key: 'DRAFT', label: 'پیش‌نویس', color: '#64748b' },
  { key: 'IN_REVIEW', label: 'در حال بررسی', color: '#3b82f6' },
  { key: 'PENDING_APPROVAL', label: 'در انتظار تأیید', color: '#f59e0b' },
  { key: 'PENDING_SIGNATURE', label: 'در انتظار امضا', color: '#8b5cf6' },
  { key: 'SIGNED', label: 'امضا شده', color: '#06b6d4' },
  { key: 'REGISTERED', label: 'ثبت شده', color: '#10b981' },
  { key: 'ISSUED', label: 'صادر شده', color: '#22c55e' },
  { key: 'SENT', label: 'ارسال شده', color: '#0ea5e9' },
  { key: 'DELIVERED', label: 'تحویل شده', color: '#14b8a6' },
  { key: 'ARCHIVED', label: 'بایگانی شده', color: '#94a3b8' },
  { key: 'REJECTED', label: 'رد شده', color: '#ef4444' },
  { key: 'CANCELLED', label: 'لغو شده', color: '#dc2626' },
];

const REFERRAL_TYPES = [
  { key: 'review', label: 'جهت بررسی' },
  { key: 'action', label: 'جهت اقدام' },
  { key: 'inform', label: 'جهت اطلاع' },
  { key: 'approve', label: 'جهت تأیید' },
  { key: 'sign', label: 'جهت امضا' },
  { key: 'reply', label: 'جهت پاسخ' },
  { key: 'archive', label: 'جهت بایگانی' },
];

const SEND_METHODS = [
  { key: 'internal', label: 'کارتابل داخلی' },
  { key: 'email', label: 'ایمیل' },
  { key: 'system', label: 'سامانه داخلی' },
  { key: 'print', label: 'چاپ' },
  { key: 'post', label: 'پست' },
  { key: 'messenger', label: 'پیام‌رسان سازمانی' },
  { key: 'other', label: 'سایر' },
];

function statusInfo(key: string) {
  return LETTER_STATUSES.find((s) => s.key === key) || { key, label: key, color: '#64748b' };
}
function typeInfo(key: string) {
  return LETTER_TYPES.find((t) => t.key === key) || { key, label: key, color: '#64748b' };
}
function urgencyInfo(key: string) {
  return URGENCY_LEVELS.find((u) => u.key === key) || { key, label: key, color: '#64748b' };
}
function confidentialityInfo(key: string) {
  return CONFIDENTIALITY_LEVELS.find((c) => c.key === key) || { key, label: key, color: '#64748b' };
}

export default function SecretariatPage() {
  const { profile } = useAuth();
  const [letters, setLetters] = useState<AnyRow[]>([]);
  const [referrals, setReferrals] = useState<AnyRow[]>([]);
  const [signatures, setSignatures] = useState<AnyRow[]>([]);
  const [timeline, setTimeline] = useState<AnyRow[]>([]);
  const [attachments, setAttachments] = useState<AnyRow[]>([]);
  const [users, setUsers] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  const [showCreate, setShowCreate] = useState(false);
  const [showReferral, setShowReferral] = useState<AnyRow | null>(null);
  const [showDetail, setShowDetail] = useState<AnyRow | null>(null);
  const [showSign, setShowSign] = useState<AnyRow | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = isSuperAdmin || profile?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [lettersData, referralsData, sigData, timelineData, usersData] = await Promise.all([
        fetchData<AnyRow>('secretariat_letters', { orderBy: { createdAt: 'desc' }, take: 200 }),
        fetchData<AnyRow>('secretariat_referrals', { orderBy: { createdAt: 'desc' }, take: 500 }),
        fetchData<AnyRow>('secretariat_signatures', { orderBy: { createdAt: 'desc' }, take: 200 }),
        fetchData<AnyRow>('secretariat_timeline', { orderBy: { createdAt: 'desc' }, take: 500 }),
        fetchData<AnyRow>('profiles', { take: 200 }),
      ]);
      setLetters(lettersData || []);
      setReferrals(referralsData || []);
      setSignatures(sigData || []);
      setTimeline(timelineData || []);
      setUsers(usersData || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach((u) => {
      m[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.fullName || 'کاربر';
    });
    return m;
  }, [users]);

  const filteredLetters = useMemo(() => {
    let result = letters;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.subject?.toLowerCase().includes(q) ||
        l.letterNumber?.toLowerCase().includes(q) ||
        l.senderName?.toLowerCase().includes(q) ||
        l.receiverName?.toLowerCase().includes(q) ||
        l.trackingCode?.toLowerCase().includes(q)
      );
    }
    if (!isAdmin) {
      const myReferralLetterIds = new Set(
        referrals
          .filter((r) => r.toUserId === profile?.id || r.fromUserId === profile?.id)
          .map((r) => r.letterId)
      );
      result = result.filter(
        (l) => l.createdById === profile?.id || l.currentHolderId === profile?.id || myReferralLetterIds.has(l.id)
      );
    }
    return result;
  }, [letters, search, isAdmin, referrals, profile]);

  const inboxLetters = useMemo(() => {
    const myReferralLetterIds = new Set(
      referrals.filter((r) => r.toUserId === profile?.id && r.status === 'pending').map((r) => r.letterId)
    );
    return filteredLetters.filter((l) => myReferralLetterIds.has(l.id) || l.currentHolderId === profile?.id);
  }, [filteredLetters, referrals, profile]);

  const outboxLetters = useMemo(() => {
    const mySentLetterIds = new Set(
      referrals.filter((r) => r.fromUserId === profile?.id).map((r) => r.letterId)
    );
    return filteredLetters.filter((l) => mySentLetterIds.has(l.id) || l.createdById === profile?.id);
  }, [filteredLetters, referrals, profile]);

  const draftLetters = useMemo(
    () => filteredLetters.filter((l) => l.status === 'DRAFT'),
    [filteredLetters]
  );

  const pendingSignLetters = useMemo(() => {
    const signLetterIds = new Set(
      signatures.filter((s) => s.signerId === profile?.id && s.status === 'pending').map((s) => s.letterId)
    );
    return filteredLetters.filter((l) => signLetterIds.has(l.id) || (l.status === 'PENDING_SIGNATURE' && l.currentHolderId === profile?.id));
  }, [filteredLetters, signatures, profile]);

  const archivedLetters = useMemo(
    () => filteredLetters.filter((l) => l.status === 'ARCHIVED' || l.status === 'DELIVERED'),
    [filteredLetters]
  );

  const urgentLetters = useMemo(
    () => filteredLetters.filter((l) => l.urgency === 'urgent' || l.urgency === 'very_urgent'),
    [filteredLetters]
  );

  const tabLetters = useMemo(() => {
    switch (activeTab) {
      case 'inbox': return inboxLetters;
      case 'outbox': return outboxLetters;
      case 'drafts': return draftLetters;
      case 'pending-sign': return pendingSignLetters;
      case 'archive': return archivedLetters;
      case 'urgent': return urgentLetters;
      default: return filteredLetters;
    }
  }, [activeTab, inboxLetters, outboxLetters, draftLetters, pendingSignLetters, archivedLetters, urgentLetters, filteredLetters]);

  const handleCreateLetter = async (formData: AnyRow) => {
    try {
      const trackingCode = `SEC-${Date.now().toString(36).toUpperCase()}`;
      const letter = await createData<AnyRow>('secretariat_letters', {
        ...formData,
        trackingCode,
        currentHolderId: profile?.id,
      });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: 'نامه ایجاد شد',
        details: `نوع: ${typeInfo(formData.letterType).label} - موضوع: ${formData.subject}`,
      });
      toast.success('نامه با موفقیت ایجاد شد');
      setShowCreate(false);
      loadData();
    } catch (error: any) {
      toast.error('خطا در ایجاد نامه: ' + error.message);
    }
  };

  const handleReferral = async (letter: AnyRow, toUserId: string, referralType: string, notes: string, deadline?: string) => {
    try {
      await createData('secretariat_referrals', {
        letterId: letter.id,
        fromUserId: profile?.id,
        toUserId,
        referralType,
        notes,
        deadline: deadline || null,
        priority: letter.urgency || 'normal',
        status: 'pending',
      });
      await updateData('secretariat_letters', { id: letter.id }, {
        currentHolderId: toUserId,
        status: referralType === 'sign' ? 'PENDING_SIGNATURE' : referralType === 'approve' ? 'PENDING_APPROVAL' : 'IN_REVIEW',
      });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: `ارجاع به ${userMap[toUserId] || 'کاربر'}`,
        details: `نوع ارجاع: ${REFERRAL_TYPES.find((r) => r.key === referralType)?.label || referralType}`,
      });
      try {
        await createData('notifications', {
          profileId: toUserId,
          title: `نامه جدید: ${letter.subject}`,
          body: `ارجاع ${REFERRAL_TYPES.find((r) => r.key === referralType)?.label || ''} - ${notes?.slice(0, 100) || ''}`,
          type: 'secretariat',
          priority: letter.urgency === 'very_urgent' ? 'high' : 'normal',
          link: '/dashboard/secretariat',
        });
      } catch {}
      toast.success('نامه ارجاع داده شد');
      setShowReferral(null);
      loadData();
    } catch (error: any) {
      toast.error('خطا در ارجاع: ' + error.message);
    }
  };

  const handleSign = async (letter: AnyRow, status: 'approved' | 'rejected' | 'correction_requested', notes: string) => {
    try {
      const contentSnapshot = letter.body || '';
      await createData('secretariat_signatures', {
        letterId: letter.id,
        signerId: profile?.id,
        status,
        notes,
        contentSnapshot,
        signedAt: new Date().toISOString(),
      });
      const newStatus = status === 'approved' ? 'SIGNED' : status === 'rejected' ? 'REJECTED' : 'IN_REVIEW';
      const updateDataObj: AnyRow = {
        status: newStatus,
        currentHolderId: status === 'approved' ? letter.createdById : profile?.id,
      };
      if (status === 'approved') {
        updateDataObj.isSigned = true;
        updateDataObj.signedAt = new Date().toISOString();
        updateDataObj.signedById = profile?.id;
        updateDataObj.signedContent = contentSnapshot;
      }
      await updateData('secretariat_letters', { id: letter.id }, updateDataObj);
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: status === 'approved' ? 'امضا شد' : status === 'rejected' ? 'رد شد' : 'درخواست اصلاح',
        details: notes || '',
      });
      toast.success(status === 'approved' ? 'نامه امضا شد' : status === 'rejected' ? 'نامه رد شد' : 'درخواست اصلاح ثبت شد');
      setShowSign(null);
      loadData();
    } catch (error: any) {
      toast.error('خطا در امضا: ' + error.message);
    }
  };

  const handleRegister = async (letter: AnyRow) => {
    try {
      const regNum = `REG-${Date.now().toString(36).toUpperCase()}`;
      await updateData('secretariat_letters', { id: letter.id }, {
        status: 'REGISTERED',
        registrationNumber: regNum,
      });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: 'ثبت نهایی شد',
        details: `شماره ثبت: ${regNum}`,
      });
      toast.success('نامه ثبت نهایی شد');
      loadData();
    } catch (error: any) {
      toast.error('خطا در ثبت: ' + error.message);
    }
  };

  const handleIssue = async (letter: AnyRow, sendMethod: string) => {
    try {
      const issuedNum = `OUT-${Date.now().toString(36).toUpperCase()}`;
      await updateData('secretariat_letters', { id: letter.id }, {
        status: 'ISSUED',
        issuedNumber,
        issuedDate: new Date().toISOString(),
        sendMethod,
        sendStatus: 'ready',
      });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: 'صادر شد',
        details: `شماره صادره: ${issuedNum} - روش ارسال: ${SEND_METHODS.find((s) => s.key === sendMethod)?.label || sendMethod}`,
      });
      toast.success('نامه صادر شد');
      loadData();
    } catch (error: any) {
      toast.error('خطا در صدور: ' + error.message);
    }
  };

  const handleSend = async (letter: AnyRow) => {
    try {
      await updateData('secretariat_letters', { id: letter.id }, {
        status: 'SENT',
        sendStatus: 'sent',
        sentAt: new Date().toISOString(),
        sendTrackingCode: `TRK-${Date.now().toString(36).toUpperCase()}`,
      });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: 'به گیرنده ارسال شد',
        details: `کد رهگیری ارسال: TRK-${Date.now().toString(36).toUpperCase()}`,
      });
      toast.success('نامه ارسال شد');
      loadData();
    } catch (error: any) {
      toast.error('خطا در ارسال: ' + error.message);
    }
  };

  const handleArchive = async (letter: AnyRow) => {
    try {
      await updateData('secretariat_letters', { id: letter.id }, { status: 'ARCHIVED' });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: 'بایگانی شد',
        details: '',
      });
      toast.success('نامه بایگانی شد');
      loadData();
    } catch (error: any) {
      toast.error('خطا در بایگانی: ' + error.message);
    }
  };

  const handleCancel = async (letter: AnyRow) => {
    try {
      await updateData('secretariat_letters', { id: letter.id }, { status: 'CANCELLED' });
      await createData('secretariat_timeline', {
        letterId: letter.id,
        action: 'لغو شد',
        details: '',
      });
      toast.success('نامه لغو شد');
      loadData();
    } catch (error: any) {
      toast.error('خطا در لغو: ' + error.message);
    }
  };

  const handleReturn = async (referral: AnyRow) => {
    try {
      await updateData('secretariat_referrals', { id: referral.id }, { status: 'returned' });
      await updateData('secretariat_letters', { id: referral.letterId }, { currentHolderId: referral.fromUserId });
      await createData('secretariat_timeline', {
        letterId: referral.letterId,
        action: `برگشت به ${userMap[referral.fromUserId] || 'فرستنده'}`,
        details: '',
      });
      toast.success('نامه برگردانده شد');
      loadData();
    } catch (error: any) {
      toast.error('خطا در برگشت: ' + error.message);
    }
  };

  const letterTimeline = useMemo(() => {
    if (!showDetail) return [];
    return timeline.filter((t) => t.letterId === showDetail.id).sort((a, b) => new Date(a.actionAt).getTime() - new Date(b.actionAt).getTime());
  }, [timeline, showDetail]);

  const letterReferrals = useMemo(() => {
    if (!showDetail) return [];
    return referrals.filter((r) => r.letterId === showDetail.id).sort((a, b) => new Date(b.referredAt).getTime() - new Date(a.referredAt).getTime());
  }, [referrals, showDetail]);

  const letterSignatures = useMemo(() => {
    if (!showDetail) return [];
    return signatures.filter((s) => s.letterId === showDetail.id);
  }, [signatures, showDetail]);

  const tabs = [
    { key: 'inbox', label: 'ورودی', icon: Inbox, count: inboxLetters.length },
    { key: 'outbox', label: 'خروجی', icon: Outbox, count: outboxLetters.length },
    { key: 'drafts', label: 'پیش‌نویس‌ها', icon: FileText, count: draftLetters.length },
    { key: 'pending-sign', label: 'در انتظار امضا', icon: PenTool, count: pendingSignLetters.length },
    { key: 'urgent', label: 'فوری', icon: Flame, count: urgentLetters.length },
    { key: 'archive', label: 'بایگانی', icon: Archive, count: archivedLetters.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="دبیرخانه"
        description="مدیریت نامه‌های وارده، صادره و داخلی - گردش، امضا و ثبت نامه"
      />

      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/60 p-1.5">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="flex items-center gap-1.5 rounded-lg px-2 mobile:px-3 py-1.5 mobile:py-2 text-[10px] mobile:text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <t.icon className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                    {t.count.toLocaleString('fa-IR')}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-xl" size="sm">
            <FilePlus2 className="h-4 w-4" />
            نامه جدید
          </Button>
          <div className="flex h-9 tablet:h-10 items-center gap-2 rounded-xl border-2 border-border bg-muted/40 px-3 transition-all focus-within:border-accent focus-within:bg-card flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو در نامه‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 mobile:grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4">
        {tabs.map((t) => (
          <Card key={t.key} className="border-border bg-card transition-all hover:border-accent/30 hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <t.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className="text-lg font-bold text-foreground">{t.count.toLocaleString('fa-IR')}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
        {!loading && tabLetters.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">نامه‌ای وجود ندارد</p>
          </div>
        )}
        {!loading && tabLetters.map((letter) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            userMap={userMap}
            onDetail={() => setShowDetail(letter)}
            onReferral={() => setShowReferral(letter)}
            onSign={() => setShowSign(letter)}
            onRegister={() => handleRegister(letter)}
            onIssue={(method) => handleIssue(letter, method)}
            onSend={() => handleSend(letter)}
            onArchive={() => handleArchive(letter)}
            onCancel={() => handleCancel(letter)}
            canAct={isAdmin || letter.currentHolderId === profile?.id || letter.createdById === profile?.id}
            isImmutable={letter.isSigned}
          />
        ))}
      </div>

      {showCreate && (
        <CreateLetterDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateLetter}
        />
      )}

      {showReferral && (
        <ReferralDialog
          letter={showReferral}
          users={users.filter((u) => u.id !== profile?.id && u.active !== false)}
          userMap={userMap}
          open={!!showReferral}
          onClose={() => setShowReferral(null)}
          onSubmit={handleReferral}
        />
      )}

      {showSign && (
        <SignDialog
          letter={showSign}
          open={!!showSign}
          onClose={() => setShowSign(null)}
          onSubmit={handleSign}
        />
      )}

      {showDetail && (
        <DetailDialog
          letter={showDetail}
          userMap={userMap}
          timeline={letterTimeline}
          referrals={letterReferrals}
          signatures={letterSignatures}
          open={!!showDetail}
          onClose={() => setShowDetail(null)}
          onReferral={() => { setShowDetail(null); setShowReferral(showDetail); }}
          onSign={() => { setShowDetail(null); setShowSign(showDetail); }}
          canAct={isAdmin || showDetail.currentHolderId === profile?.id || showDetail.createdById === profile?.id}
        />
      )}
    </div>
  );
}

function LetterCard({
  letter, userMap, onDetail, onReferral, onSign, onRegister, onIssue, onSend, onArchive, onCancel, canAct, isImmutable,
}: {
  letter: AnyRow;
  userMap: Record<string, string>;
  onDetail: () => void;
  onReferral: () => void;
  onSign: () => void;
  onRegister: () => void;
  onIssue: (method: string) => void;
  onSend: () => void;
  onArchive: () => void;
  onCancel: () => void;
  canAct: boolean;
  isImmutable: boolean;
}) {
  const si = statusInfo(letter.status);
  const ti = typeInfo(letter.letterType);
  const ui = urgencyInfo(letter.urgency);
  const ci = confidentialityInfo(letter.confidentiality);
  const isSigned = letter.isSigned;

  return (
    <Card className="border-border bg-card transition-all hover:border-accent/30 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
          <div className="flex flex-1 flex-col gap-2" onClick={onDetail} role="button" tabIndex={0}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: si.color + '15', color: si.color }}>
                {si.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: ti.color + '15', color: ti.color }}>
                {ti.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: ui.color + '15', color: ui.color }}>
                <Flame className="h-2.5 w-2.5" />
                {ui.label}
              </span>
              {letter.confidentiality !== 'normal' && (
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: ci.color + '15', color: ci.color }}>
                  <Lock className="h-2.5 w-2.5" />
                  {ci.label}
                </span>
              )}
              {isSigned && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  <FileCheck className="h-2.5 w-2.5" />
                  امضا شده
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground">{letter.subject}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {letter.letterNumber && <span>شماره: {letter.letterNumber}</span>}
              {letter.senderName && <span>فرستنده: {letter.senderName}</span>}
              {letter.receiverName && <span>گیرنده: {letter.receiverName}</span>}
              {letter.trackingCode && <span>کد رهگیری: {letter.trackingCode}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {relativeTime(letter.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={onDetail} className="gap-1 text-xs">
              <Eye className="h-3.5 w-3.5" />
              مشاهده
            </Button>
            {canAct && !isImmutable && letter.status !== 'ARCHIVED' && letter.status !== 'CANCELLED' && (
              <Button variant="outline" size="sm" onClick={onReferral} className="gap-1 text-xs">
                <Send className="h-3.5 w-3.5" />
                ارجاع
              </Button>
            )}
            {canAct && letter.status === 'PENDING_SIGNATURE' && (
              <Button variant="outline" size="sm" onClick={onSign} className="gap-1 text-xs">
                <PenTool className="h-3.5 w-3.5" />
                امضا
              </Button>
            )}
            {canAct && letter.status === 'SIGNED' && (
              <Button variant="outline" size="sm" onClick={onRegister} className="gap-1 text-xs">
                <FileCheck className="h-3.5 w-3.5" />
                ثبت نهایی
              </Button>
            )}
            {canAct && letter.status === 'REGISTERED' && (
              <Select onValueChange={onIssue}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="صدور..." /></SelectTrigger>
                <SelectContent>
                  {SEND_METHODS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canAct && letter.status === 'ISSUED' && (
              <Button variant="outline" size="sm" onClick={onSend} className="gap-1 text-xs">
                <Mail className="h-3.5 w-3.5" />
                ارسال
              </Button>
            )}
            {canAct && (letter.status === 'SENT' || letter.status === 'DELIVERED') && (
              <Button variant="ghost" size="sm" onClick={onArchive} className="gap-1 text-xs">
                <Archive className="h-3.5 w-3.5" />
                بایگانی
              </Button>
            )}
            {canAct && letter.status === 'DRAFT' && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 text-xs text-destructive">
                <X className="h-3.5 w-3.5" />
                لغو
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateLetterDialog({
  open, onClose, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AnyRow) => void;
}) {
  const [form, setForm] = useState<AnyRow>({
    letterType: 'internal',
    subject: '',
    letterNumber: '',
    letterDate: '',
    urgency: 'normal',
    confidentiality: 'normal',
    senderName: '',
    receiverName: '',
    cc: '',
    body: '',
    fileNumber: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.subject) {
      toast.error('موضوع نامه الزامی است');
      return;
    }
    onSubmit({
      ...form,
      letterDate: form.letterDate ? new Date(form.letterDate).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-accent" />
            ایجاد نامه جدید
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نوع نامه</Label>
              <Select value={form.letterType} onValueChange={(v) => setForm({ ...form, letterType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LETTER_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">فوریت</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((u) => <SelectItem key={u.key} value={u.key}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">موضوع *</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="موضوع نامه" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">شماره نامه</Label>
              <Input value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: e.target.value })} placeholder="شماره نامه" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تاریخ نامه</Label>
              <Input type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">محرمانگی</Label>
            <Select value={form.confidentiality} onValueChange={(v) => setForm({ ...form, confidentiality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONFIDENTIALITY_LEVELS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">فرستنده</Label>
              <Input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} placeholder="نام فرستنده" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">گیرنده</Label>
              <Input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} placeholder="نام گیرنده" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رونوشت</Label>
            <Input value={form.cc} onChange={(e) => setForm({ ...form, cc: e.target.value })} placeholder="رونوشت (با کاما جدا کنید)" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">متن نامه</Label>
            <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="متن کامل نامه" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">کد/شماره پرونده</Label>
              <Input value={form.fileNumber} onChange={(e) => setForm({ ...form, fileNumber: e.target.value })} placeholder="شماره پرونده" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">توضیحات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="توضیحات" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button onClick={handleSubmit}>ایجاد نامه</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReferralDialog({
  letter, users, userMap, open, onClose, onSubmit,
}: {
  letter: AnyRow;
  users: AnyRow[];
  userMap: Record<string, string>;
  open: boolean;
  onClose: () => void;
  onSubmit: (letter: AnyRow, toUserId: string, referralType: string, notes: string, deadline?: string) => void;
}) {
  const [toUserId, setToUserId] = useState('');
  const [referralType, setReferralType] = useState('review');
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = () => {
    if (!toUserId) {
      toast.error('گیرنده ارجاع را انتخاب کنید');
      return;
    }
    onSubmit(letter, toUserId, referralType, notes, deadline ? new Date(deadline).toISOString() : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-accent" />
            ارجاع نامه: {letter.subject}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">گیرنده ارجاع *</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger><SelectValue placeholder="انتخاب کاربر" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.fullName || 'کاربر'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">نوع ارجاع</Label>
            <Select value={referralType} onValueChange={setReferralType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFERRAL_TYPES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">مهلت انجام</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">توضیح ارجاع</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات ارجاع" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button onClick={handleSubmit}>ارجاع</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignDialog({
  letter, open, onClose, onSubmit,
}: {
  letter: AnyRow;
  open: boolean;
  onClose: () => void;
  onSubmit: (letter: AnyRow, status: 'approved' | 'rejected' | 'correction_requested', notes: string) => void;
}) {
  const [notes, setNotes] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-accent" />
            امضای نامه: {letter.subject}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-bold text-muted-foreground">متن نامه:</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{letter.body || '(بدون متن)'}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">توضیح / یادداشت امضا</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات مربوط به امضا" />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 tablet:flex-row">
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button variant="outline" onClick={() => onSubmit(letter, 'correction_requested', notes)} className="gap-1">
            <Undo2 className="h-4 w-4" />
            درخواست اصلاح
          </Button>
          <Button variant="destructive" onClick={() => onSubmit(letter, 'rejected', notes)} className="gap-1">
            <X className="h-4 w-4" />
            رد
          </Button>
          <Button onClick={() => onSubmit(letter, 'approved', notes)} className="gap-1">
            <Check className="h-4 w-4" />
            تأیید و امضا
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  letter, userMap, timeline, referrals, signatures, open, onClose, onReferral, onSign, canAct,
}: {
  letter: AnyRow;
  userMap: Record<string, string>;
  timeline: AnyRow[];
  referrals: AnyRow[];
  signatures: AnyRow[];
  open: boolean;
  onClose: () => void;
  onReferral: () => void;
  onSign: () => void;
  canAct: boolean;
}) {
  const si = statusInfo(letter.status);
  const ti = typeInfo(letter.letterType);
  const isImmutable = letter.isSigned;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-accent" />
            {letter.subject}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: si.color + '15', color: si.color }}>{si.label}</span>
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: ti.color + '15', color: ti.color }}>{ti.label}</span>
            {letter.letterNumber && <span className="text-xs text-muted-foreground">شماره: {letter.letterNumber}</span>}
            {letter.trackingCode && <span className="text-xs text-muted-foreground">کد رهگیری: {letter.trackingCode}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {letter.senderName && <div><span className="font-bold text-muted-foreground">فرستنده: </span><span className="text-foreground">{letter.senderName}</span></div>}
            {letter.receiverName && <div><span className="font-bold text-muted-foreground">گیرنده: </span><span className="text-foreground">{letter.receiverName}</span></div>}
            {letter.cc && <div><span className="font-bold text-muted-foreground">رونوشت: </span><span className="text-foreground">{letter.cc}</span></div>}
            {letter.fileNumber && <div><span className="font-bold text-muted-foreground">پرونده: </span><span className="text-foreground">{letter.fileNumber}</span></div>}
            {letter.registrationNumber && <div><span className="font-bold text-muted-foreground">شماره ثبت: </span><span className="text-foreground">{letter.registrationNumber}</span></div>}
            {letter.issuedNumber && <div><span className="font-bold text-muted-foreground">شماره صادره: </span><span className="text-foreground">{letter.issuedNumber}</span></div>}
            {letter.sendMethod && <div><span className="font-bold text-muted-foreground">روش ارسال: </span><span className="text-foreground">{SEND_METHODS.find((s) => s.key === letter.sendMethod)?.label || letter.sendMethod}</span></div>}
            {letter.sendTrackingCode && <div><span className="font-bold text-muted-foreground">کد رهگیری ارسال: </span><span className="text-foreground">{letter.sendTrackingCode}</span></div>}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-bold text-muted-foreground">متن نامه:</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{letter.body || '(بدون متن)'}</p>
            {isImmutable && letter.signedContent && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-[11px] font-bold text-emerald-700">
                <FileCheck className="ms-1 inline h-3 w-3" />
                این نامه امضا شده و متن آن غیرقابل ویرایش است
              </div>
            )}
          </div>

          {letter.notes && (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-1 text-xs font-bold text-muted-foreground">توضیحات:</p>
              <p className="text-sm text-foreground">{letter.notes}</p>
            </div>
          )}

          {signatures.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <PenTool className="h-4 w-4 text-accent" />
                امضاها
              </h4>
              <div className="space-y-2">
                {signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{(userMap[sig.signerId] || '?').slice(0, 2)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-bold text-foreground">{userMap[sig.signerId] || 'کاربر'}</p>
                        <p className="text-muted-foreground">{formatJalaliDateTime(sig.signedAt)}</p>
                      </div>
                    </div>
                    <Badge variant={sig.status === 'approved' ? 'default' : sig.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {sig.status === 'approved' ? 'تأیید شد' : sig.status === 'rejected' ? 'رد شد' : 'درخواست اصلاح'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
              <Send className="h-4 w-4 text-accent" />
              گردش نامه
            </h4>
            <div className="space-y-2">
              {referrals.length === 0 && <p className="text-xs text-muted-foreground">ارجاعی ثبت نشده است</p>}
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{(userMap[ref.fromUserId] || '?').slice(0, 2)}</AvatarFallback></Avatar>
                    <span className="font-bold text-foreground">{userMap[ref.fromUserId] || 'کاربر'}</span>
                    <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{(userMap[ref.toUserId] || '?').slice(0, 2)}</AvatarFallback></Avatar>
                    <span className="font-bold text-foreground">{userMap[ref.toUserId] || 'کاربر'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{REFERRAL_TYPES.find((r) => r.key === ref.referralType)?.label || ref.referralType}</span>
                    <Badge variant={ref.status === 'pending' ? 'secondary' : 'outline'} className="text-[9px]">
                      {ref.status === 'pending' ? 'در انتظار' : ref.status === 'done' ? 'انجام شد' : ref.status === 'returned' ? 'برگشت' : ref.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
              <History className="h-4 w-4 text-accent" />
              تاریخچه گردش (Timeline)
            </h4>
            <div className="space-y-3">
              {timeline.length === 0 && <p className="text-xs text-muted-foreground">رویدادی ثبت نشده است</p>}
              {timeline.map((t, idx) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-muted-foreground/30'}`} />
                    {idx < timeline.length - 1 && <div className="h-full w-0.5 bg-muted-foreground/20" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-sm font-bold text-foreground">{t.action}</p>
                    {t.details && <p className="text-xs text-muted-foreground">{t.details}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {userMap[t.actionBy] || 'کاربر'} - {formatJalaliDateTime(t.actionAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canAct && !isImmutable && letter.status !== 'ARCHIVED' && letter.status !== 'CANCELLED' && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={onReferral} className="gap-1">
                <Send className="h-4 w-4" />
                ارجاع
              </Button>
              {letter.status === 'PENDING_SIGNATURE' && (
                <Button variant="outline" size="sm" onClick={onSign} className="gap-1">
                  <PenTool className="h-4 w-4" />
                  امضا
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
