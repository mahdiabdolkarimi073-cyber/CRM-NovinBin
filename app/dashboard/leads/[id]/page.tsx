'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, deleteData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, TrendingUp, Phone, Mail, MapPin, Building2, Clock,
  Save, Trash2, Archive, Forward, Calendar, UserCheck, Loader2,
  CheckCircle2, FileText, AlertTriangle, Send,
} from 'lucide-react';
import { formatJalaliDateTime, relativeTime } from '@/lib/format';
import { LEAD_STATUSES, LEAD_SOURCES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead, Profile, LeadReferral } from '@/lib/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpResult, setFollowUpResult] = useState('');
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [referrals, setReferrals] = useState<LeadReferral[]>([]);
  const [referralProfiles, setReferralProfiles] = useState<Record<string, Profile>>({});
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [selectedReferees, setSelectedReferees] = useState<Set<string>>(new Set());
  const [referralNote, setReferralNote] = useState('');
  const [referralSaving, setReferralSaving] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    contact_name: '', assigned_to: 'none', date: '', time: '', topic: '', location: '', online_link: '', agenda: '',
  });
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const leads = await fetchData<Lead>('leads', { where: { id } });
      if (leads && leads.length > 0) {
        const l = leads[0];
        setLead(l);
        setFollowUpResult(l.followUpResult || '');
        const refs = await fetchData<LeadReferral>('lead_referrals', { where: { leadId: id }, orderBy: { createdAt: 'desc' } });
        setReferrals(refs || []);
        const profileIds = (refs || []).map((r) => r.referredToProfileId).filter(Boolean) as string[];
        if (profileIds.length > 0) {
          const profs = await fetchData<Profile>('profiles', { where: { id: { in: profileIds } } });
          const map: Record<string, Profile> = {};
          (profs || []).forEach((p) => { map[p.id] = p; });
          setReferralProfiles(map);
        }
      }
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    try {
      await updateData('leads', { id: lead.id }, { status: newStatus, nextFollowUp: new Date().toISOString() });
      toast.success('وضعیت تغییر کرد');
      load();
    } catch (e: any) {
      toast.error('تغییر وضعیت ناموفق: ' + e.message);
    }
  };

  const saveFollowUpResult = async () => {
    if (!lead) return;
    setFollowUpSaving(true);
    try {
      await updateData('leads', { id: lead.id }, {
        followUpResult: followUpResult || null,
        nextFollowUp: new Date().toISOString(),
      });
      toast.success('نتیجه پیگیری ثبت شد');
      load();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + e.message);
    }
    setFollowUpSaving(false);
  };

  const handleArchive = async () => {
    if (!lead || !confirm(`آرشیو کردن سرنخ «${lead.name}»؟`)) return;
    try {
      await updateData('leads', { id: lead.id }, { isArchived: true, archivedAt: new Date().toISOString() });
      toast.success('سرنخ به آرشیو منتقل شد');
      router.push('/dashboard/leads');
    } catch (e: any) {
      toast.error('آرشیو ناموفق: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!lead || !confirm(`حذف سرنخ «${lead.name}»؟ این عمل قابل بازگشت نیست.`)) return;
    try {
      await deleteData('leads', { id: lead.id });
      toast.success('سرنخ حذف شد');
      router.push('/dashboard/leads');
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const convertToCustomer = async () => {
    if (!lead || !isSuperAdmin) return;
    setConverting(true);
    try {
      const customer = await createData('customers', {
        type: 'individual',
        firstName: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        level: 'bronze',
        createdBy: profile?.id,
      });
      await updateData('leads', { id: lead.id }, { status: 'converted', customerId: customer.id });
      toast.success('سرنخ به مشتری تبدیل شد');
      load();
    } catch (e: any) {
      toast.error('تبدیل ناموفق: ' + e.message);
    }
    setConverting(false);
  };

  const openReferral = async () => {
    setSelectedReferees(new Set());
    setReferralNote('');
    setReferralDialogOpen(true);
    try {
      const s = await fetchData<Profile>('profiles', {
        where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin', 'owner'] }, active: true },
        orderBy: { firstName: 'asc' },
      });
      setStaff(s || []);
    } catch { setStaff([]); }
  };

  const toggleReferee = (pid: string) => {
    setSelectedReferees((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleReferralSubmit = async () => {
    if (!lead || !profile || selectedReferees.size === 0) return;
    setReferralSaving(true);
    try {
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      for (const targetId of selectedReferees) {
        await createData('lead_referrals', {
          leadId: lead.id,
          referredToProfileId: targetId,
          referredByProfileId: profile.id,
          status: 'pending',
          note: referralNote || null,
        });
        if (targetId !== profile.id) {
          await createData('notifications', {
            profileId: targetId,
            title: 'سرنخی به شما ارجاع داده شد',
            body: `${myName} یک سرنخ «${lead.name}» را به شما ارجاع داد`,
            type: 'referral',
            priority: 'high',
            link: '/dashboard/leads',
          }).catch(() => {});
        }
      }
      toast.success('سرنخ ارجاع داده شد');
      setReferralDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error('ارجاع ناموفق: ' + e.message);
    }
    setReferralSaving(false);
  };

  const openScheduleMeeting = () => {
    if (!lead) return;
    setMeetingForm({
      contact_name: lead.name,
      assigned_to: 'none',
      date: '', time: '', topic: '', location: '', online_link: '', agenda: '',
    });
    setMeetingDialogOpen(true);
  };

  const handleScheduleMeeting = async () => {
    if (!lead || !profile) return;
    if (!meetingForm.contact_name || meetingForm.assigned_to === 'none' || !meetingForm.date || !meetingForm.time) {
      toast.error('لطفاً نام، مسئول، تاریخ و ساعت را وارد کنید');
      return;
    }
    setMeetingSaving(true);
    try {
      const meetingDateTime = new Date(`${meetingForm.date}T${meetingForm.time}`);
      const meeting = await createData('meetings', {
        title: meetingForm.contact_name,
        topic: meetingForm.topic || null,
        date: meetingDateTime.toISOString(),
        location: meetingForm.location || null,
        onlineLink: meetingForm.online_link || null,
        agenda: meetingForm.agenda || null,
        mainResponsibleId: meetingForm.assigned_to,
        status: 'scheduled',
        createdBy: profile.id,
      });
      await createData('meeting_assignments', {
        meetingId: meeting.id,
        assignedTo: meetingForm.assigned_to,
        contactName: meetingForm.contact_name,
        createdBy: profile.id,
      });
      toast.success('جلسه برنامه‌ریزی شد');
      setMeetingDialogOpen(false);
    } catch (e: any) {
      toast.error('برنامه‌ریزی جلسه ناموفق: ' + e.message);
    }
    setMeetingSaving(false);
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری سرنخ...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="nb-empty" dir="rtl" style={{ minHeight: '60vh' }}>
        <div className="sb-empty-icon">
          <TrendingUp className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <h3>سرنخ یافت نشد</h3>
        <Link href="/dashboard/leads" className="nb-editor-back" style={{ marginTop: 12 }}>بازگشت به سرنخ‌ها</Link>
      </div>
    );
  }

  const st = statusInfo(lead.status);

  return (
    <div className="nb-editor-page" dir="rtl" style={{ maxWidth: 1100 }}>
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/leads" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به سرنخ‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> سرنخ‌های فروش <b>←</b> {lead.name}</span>
        </div>
        <div className="nb-editor-topbar-right">
          <Link href={`/dashboard/leads/${lead.id}/edit`} className="nb-editor-quick-btn">
            <FileText className="h-4 w-4" />
            ویرایش
          </Link>
          <button type="button" className="nb-editor-discard nb-editor-danger" onClick={handleArchive}>
            <Archive className="h-4 w-4" />
            آرشیو
          </button>
          {isSuperAdmin && (
            <button type="button" className="nb-editor-discard nb-editor-danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              حذف
            </button>
          )}
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="nb-editor-canvas">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                <TrendingUp className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 24 }}>{lead.name}</h1>
                {lead.company && <p className="text-sm text-slate-400">{lead.company}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${st.color}18`, color: st.color }}>
                {st.label}
              </span>
              {lead.source && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 dark:bg-sky-900/20">
                  {lead.source}
                </span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="nb-editor-meta-row">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              ایجاد: {formatJalaliDateTime(lead.createdAt)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              به‌روزرسانی: {relativeTime(lead.updatedAt)}
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            {lead.phone && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Phone className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">تلفن</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100" dir="ltr">{isSuperAdmin ? lead.phone : '۰۹** *** ****'}</p>
                </div>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Mail className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">ایمیل</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100" dir="ltr">{lead.email}</p>
                </div>
              </div>
            )}
            {lead.city && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <MapPin className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">شهر</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.city}</p>
                </div>
              </div>
            )}
            {lead.industry && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Building2 className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">حوزه فعالیت</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{lead.industry}</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional phones */}
          {lead.additionalPhones && lead.additionalPhones.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">شماره‌های اضافی</p>
              <div className="flex flex-wrap gap-2">
                {lead.additionalPhones.map((p, i) => (
                  <span key={i} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300" dir="ltr">{isSuperAdmin ? p : '۰۹** *** ****'}</span>
                ))}
              </div>
            </div>
          )}

          {/* Service types */}
          {lead.serviceTypes && lead.serviceTypes.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">خدمات درخواستی</p>
              <div className="flex flex-wrap gap-2">
                {lead.serviceTypes.map((s, i) => (
                  <span key={i} className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="mb-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">یادداشت</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-6 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Status switcher */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">تغییر وضعیت</p>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStatusChange(s.key)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: lead.status === s.key ? `${s.color}20` : 'transparent',
                    color: lead.status === s.key ? s.color : '#94A3B8',
                    border: `1px solid ${lead.status === s.key ? s.color + '40' : '#E2E8F0'}`,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up result */}
          <div className="mb-6">
            <Label className="nb-editor-label mb-2 block">نتیجه پیگیری</Label>
            <Textarea
              value={followUpResult}
              onChange={(e) => setFollowUpResult(e.target.value)}
              placeholder="نتیجه پیگیری از این سرنخ را وارد کنید..."
              className="min-h-[80px]"
            />
            <Button type="button" size="sm" onClick={saveFollowUpResult} disabled={followUpSaving} className="mt-2">
              {followUpSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ثبت نتیجه پیگیری
            </Button>
          </div>

          {/* Referrals */}
          {referrals.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">ارجاع‌ها ({referrals.length.toLocaleString('fa-IR')})</p>
              <div className="space-y-2">
                {referrals.map((r) => {
                  const p = referralProfiles[r.referredToProfileId || ''];
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/30">
                        {(p?.firstName?.[0] || '') + (p?.lastName?.[0] || '')}
                      </div>
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                        {p ? fullName(p.firstName, p.lastName) : 'کاربر ناشناس'}
                      </span>
                      {r.note && <span className="text-xs text-slate-400">{r.note}</span>}
                      <span className="text-xs text-slate-400">{relativeTime(r.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <Button type="button" variant="outline" size="sm" onClick={openReferral}>
              <Forward className="h-4 w-4" /> ارجاع به پرسنل
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openScheduleMeeting}>
              <Calendar className="h-4 w-4" /> برنامه‌ریزی جلسه
            </Button>
            {isSuperAdmin && lead.status !== 'converted' && (
              <Button type="button" variant="outline" size="sm" onClick={convertToCustomer} disabled={converting}>
                {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                تبدیل به مشتری
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Referral Dialog */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ارجاع سرنخ</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">سرنخ را به پرسنل انتخاب‌شده ارجاع دهید.</p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              {staff.map((s) => {
                const checked = selectedReferees.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleReferee(s.id)}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-right transition ${checked ? 'bg-sky-50 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/30">
                      {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
                    </div>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{fullName(s.firstName, s.lastName)}</span>
                    {checked && <CheckCircle2 className="h-4 w-4 text-sky-500" />}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label>یادداشت (اختیاری)</Label>
              <Textarea value={referralNote} onChange={(e) => setReferralNote(e.target.value)} placeholder="یادداشت ارجاع..." className="min-h-[60px]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReferralDialogOpen(false)}>انصراف</Button>
              <Button onClick={handleReferralSubmit} disabled={referralSaving || selectedReferees.size === 0}>
                {referralSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                ارجاع
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>برنامه‌ریزی جلسه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نام تماس <span className="text-red-500">*</span></Label>
              <input value={meetingForm.contact_name} onChange={(e) => setMeetingForm({ ...meetingForm, contact_name: e.target.value })} className="nb-input" style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }} />
            </div>
            <div className="space-y-2">
              <Label>مسئول <span className="text-red-500">*</span></Label>
              <Select value={meetingForm.assigned_to} onValueChange={(v) => setMeetingForm({ ...meetingForm, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب مسئول" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاریخ <span className="text-red-500">*</span></Label>
                <input type="date" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} className="nb-input" style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }} />
              </div>
              <div className="space-y-2">
                <Label>ساعت <span className="text-red-500">*</span></Label>
                <input type="time" dir="ltr" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} className="nb-input" style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>موضوع</Label>
              <input value={meetingForm.topic} onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })} className="nb-input" style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }} />
            </div>
            <div className="space-y-2">
              <Label>مکان</Label>
              <input value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} className="nb-input" style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }} />
            </div>
            <div className="space-y-2">
              <Label>لینک آنلاین</Label>
              <input value={meetingForm.online_link} onChange={(e) => setMeetingForm({ ...meetingForm, online_link: e.target.value })} dir="ltr" className="nb-input" style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }} />
            </div>
            <div className="space-y-2">
              <Label>دستور جلسه</Label>
              <Textarea value={meetingForm.agenda} onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })} className="min-h-[80px]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMeetingDialogOpen(false)}>انصراف</Button>
              <Button onClick={handleScheduleMeeting} disabled={meetingSaving}>
                {meetingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                برنامه‌ریزی
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
