'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, Plus, Phone, Mail, Search, Eye, Pencil, Trash2,
  BarChart3, Filter, Zap, FileBarChart, FileSpreadsheet, ChevronLeft, ChevronRight,
  UserCheck, Clock, AlertTriangle, Bell, X, Calendar, Video, Loader2,
  Users, Save, Send, ClipboardList,
} from 'lucide-react';
import { relativeTime, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { LEAD_STATUSES, LEAD_SOURCES, fullName } from '@/lib/constants';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { toast } from 'sonner';
import type { Lead, Profile, LeadReferral } from '@/lib/types';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

const CITIES = ['تهران', 'مشهد', 'اصفهان', 'شهراز', 'تبریز', 'کرج', 'اهواز', 'کرمان'];

const PAGE_SIZE = 12;

const ALARM_INTERVALS: Record<string, number> = {
  serious: 2 * 24 * 60 * 60 * 1000,
  contacted: 3 * 24 * 60 * 60 * 1000,
  new: 4 * 24 * 60 * 60 * 1000,
};

interface AlarmLead {
  lead: Lead;
  daysOverdue: number;
  interval: number;
}

export default function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [statusMenuLeadId, setStatusMenuLeadId] = useState<string | null>(null);
  const [dismissedAlarms, setDismissedAlarms] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', city: '', source: '', notes: '',
  });
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingLead, setMeetingLead] = useState<Lead | null>(null);
  const [meetingStaff, setMeetingStaff] = useState<Profile[]>([]);
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    contact_name: '', assigned_to: 'none', date: '', time: '', topic: '', location: '', online_link: '', agenda: '',
  });
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralLead, setReferralLead] = useState<Lead | null>(null);
  const [referralStaff, setReferralStaff] = useState<Profile[]>([]);
  const [selectedReferees, setSelectedReferees] = useState<Set<string>>(new Set());
  const [referralNote, setReferralNote] = useState('');
  const [referralSaving, setReferralSaving] = useState(false);
  const [viewReferrals, setViewReferrals] = useState<LeadReferral[]>([]);
  const [viewReferralProfiles, setViewReferralProfiles] = useState<Record<string, Profile>>({});
  const [followUpResult, setFollowUpResult] = useState('');
  const [followUpSaving, setFollowUpSaving] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadLeads = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (filterStatus !== 'all') where.status = filterStatus;
      if (filterSource !== 'all') where.source = filterSource;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('leads', { where, orderBy: { createdAt: 'desc' } });
      setLeads((data as Lead[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری سرنخ‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, filterStatus, filterSource, search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterSource, filterCity, filterAssignee, filterTime]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lead_dismissed_alarms');
      if (stored) setDismissedAlarms(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterCity !== 'all') result = result.filter((l) => (l as any).city === filterCity);
    if (filterAssignee !== 'all') result = result.filter((l) => l.assignedTo === filterAssignee);
    if (filterTime !== 'all') {
      const now = new Date();
      const days = filterTime === '7d' ? 7 : filterTime === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      result = result.filter((l) => new Date(l.createdAt) >= cutoff);
    }
    return result;
  }, [leads, filterCity, filterAssignee, filterTime]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const alarmLeads = useMemo<AlarmLead[]>(() => {
    const now = Date.now();
    const result: AlarmLead[] = [];
    leads.forEach((lead) => {
      const interval = ALARM_INTERVALS[lead.status];
      if (!interval) return;
      const lastUpdate = lead.nextFollowUp ? new Date(lead.nextFollowUp).getTime() : new Date(lead.createdAt).getTime();
      const elapsed = now - lastUpdate;
      if (elapsed >= interval) {
        result.push({ lead, daysOverdue: Math.floor(elapsed / (24 * 60 * 60 * 1000)), interval });
      }
    });
    return result.filter((a) => !dismissedAlarms.has(a.lead.id));
  }, [leads, dismissedAlarms]);

  const dismissAlarm = (leadId: string) => {
    const updated = new Set(dismissedAlarms);
    updated.add(leadId);
    setDismissedAlarms(updated);
    try { localStorage.setItem('lead_dismissed_alarms', JSON.stringify(Array.from(updated))); } catch {}
  };

  const dismissAllAlarms = () => {
    const updated = new Set(dismissedAlarms);
    alarmLeads.forEach((a) => updated.add(a.lead.id));
    setDismissedAlarms(updated);
    try { localStorage.setItem('lead_dismissed_alarms', JSON.stringify(Array.from(updated))); } catch {}
  };

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    LEAD_STATUSES.forEach((s) => { counts[s.key] = 0; });
    leads.forEach((l) => { if (counts[l.status] !== undefined) counts[l.status]++; });
    return [
      { key: 'new', label: 'جدید', count: counts['new'] || 0, color: '#1F2937' },
      { key: 'contacted', label: 'در حال پیگیری', count: counts['contacted'] || 0, color: '#F59E0B' },
      { key: 'serious', label: 'پیگیری جدی', count: counts['serious'] || 0, color: '#EF4444' },
      { key: 'converted', label: 'تبدیل به مشتری', count: counts['converted'] || 0, color: '#16A34A' },
      { key: 'lost', label: 'مشتری نشد', count: counts['lost'] || 0, color: '#94A3B8' },
    ];
  }, [leads]);

  const hasActiveFilters = filterStatus !== 'all' || filterSource !== 'all' || filterCity !== 'all' || filterAssignee !== 'all' || filterTime !== 'all';

  const clearFilters = () => {
    setFilterStatus('all'); setFilterSource('all'); setFilterCity('all'); setFilterAssignee('all'); setFilterTime('all');
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '', company: lead.company || '', phone: lead.phone || '',
      email: lead.email || '', city: (lead as any).city || '', source: lead.source || '', notes: lead.notes || '',
    });
    setEditDialogOpen(true);
  };

  const openView = async (lead: Lead) => {
    setViewLead(lead);
    setViewDialogOpen(true);
    setFollowUpResult(lead.followUpResult || '');
    try {
      const refs = await fetchData<LeadReferral>('lead_referrals', { where: { leadId: lead.id }, orderBy: { createdAt: 'desc' } });
      setViewReferrals(refs || []);
      const profileIds = Array.from(new Set((refs || []).map(r => r.referredToProfileId).filter(Boolean) as string[]));
      if (profileIds.length > 0) {
        const profiles = await fetchData<Profile>('profiles', { where: { id: { in: profileIds } } });
        const map: Record<string, Profile> = {};
        (profiles || []).forEach(p => { map[p.id] = p; });
        setViewReferralProfiles(map);
      } else {
        setViewReferralProfiles({});
      }
    } catch {
      setViewReferrals([]);
      setViewReferralProfiles({});
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !form.name) return;
    setSaving(true);
    try {
      await updateData('leads', { id: editingLead.id }, {
        name: form.name, company: form.company || null, phone: form.phone || null,
        email: form.email || null, source: form.source || null, notes: form.notes || null,
      });
      toast.success('سرنخ ویرایش شد');
      setEditDialogOpen(false); setEditingLead(null); loadLeads();
    } catch (error: any) { toast.error('ویرایش ناموفق: ' + error.message); }
    setSaving(false);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`حذف سرنخ «${lead.name}»؟`)) return;
    try { await deleteData('leads', { id: lead.id }); toast.success('سرنخ حذف شد'); loadLeads(); }
    catch (error: any) { toast.error('حذف ناموفق: ' + error.message); }
  };

  const convertToCustomer = async (lead: Lead) => {
    if (!profile) return;
    if (!isSuperAdmin) { toast.error('فقط سوپرادمین می‌تواند سرنخ را به مشتری تبدیل کند'); return; }
    setConverting(true);
    try {
      const cust = await createData('customers', {
        type: 'individual', firstName: lead.name, companyName: lead.company,
        phone: lead.phone, email: lead.email, source: lead.source, level: 'bronze', createdBy: profile.id,
      });
      await updateData('leads', { id: lead.id }, { status: 'converted', customerId: cust.id });
      toast.success('سرنخ به مشتری تبدیل شد');
      setEditDialogOpen(false); setEditingLead(null); loadLeads();
    } catch (error: any) { toast.error('تبدیل ناموفق: ' + error.message); }
    setConverting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setStatusMenuLeadId(null);
    try {
      await updateData('leads', { id }, { status, nextFollowUp: new Date().toISOString() });
      const updated = new Set(dismissedAlarms);
      updated.delete(id);
      setDismissedAlarms(updated);
      try { localStorage.setItem('lead_dismissed_alarms', JSON.stringify(Array.from(updated))); } catch {}
      loadLeads();
      toast.success('وضعیت سرنخ تغییر کرد');
    } catch (error: any) { toast.error('تغییر وضعیت ناموفق: ' + error.message); }
  };

  const openScheduleMeeting = async (lead: Lead) => {
    setMeetingLead(lead);
    const contactName = lead.company ? `${lead.name} - ${lead.company}` : lead.name;
    setMeetingForm({
      contact_name: contactName, assigned_to: 'none', date: '', time: '',
      topic: '', location: '', online_link: '', agenda: '',
    });
    setMeetingDialogOpen(true);
    if (meetingStaff.length === 0) {
      try {
        const data = await fetchData<Profile>('profiles', {
          where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin', 'owner'] }, active: true },
          orderBy: { firstName: 'asc' },
        });
        setMeetingStaff(data || []);
      } catch { setMeetingStaff([]); }
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !meetingLead) return;
    if (!meetingForm.contact_name.trim()) { toast.error('نام هدف الزامی است'); return; }
    if (meetingForm.assigned_to === 'none') { toast.error('تخصیص به پرسنل الزامی است'); return; }
    if (!meetingForm.date) { toast.error('تاریخ جلسه الزامی است'); return; }
    if (!meetingForm.time) { toast.error('زمان جلسه الزامی است'); return; }
    setMeetingSaving(true);
    try {
      const meetingDateTime = new Date(`${meetingForm.date}T${meetingForm.time}`);
      const meetingData = await createData('meetings', {
        title: meetingForm.contact_name.trim(),
        topic: meetingForm.topic || null,
        agenda: meetingForm.agenda || null,
        date: meetingDateTime.toISOString(),
        location: meetingForm.location || null,
        onlineLink: meetingForm.online_link || null,
        createdBy: profile.id,
      });
      await createData('meeting_assignments', {
        meetingId: meetingData.id,
        assignedTo: meetingForm.assigned_to,
        contactName: meetingForm.contact_name.trim(),
        createdBy: profile.id,
      });
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];
      if (meetingForm.assigned_to !== profile.id) {
        notifPromises.push(createData('notifications', {
          profileId: meetingForm.assigned_to,
          title: 'جلسه جدید به شما تخصیص داده شد',
          body: `جلسه با ${meetingForm.contact_name} در ${formatJalaliDateTime(meetingDateTime)} توسط ${myName}`,
          type: 'meeting', priority: 'normal', link: '/dashboard/meetings',
        }).catch(() => {}));
      }
      meetingStaff.filter((s) => (s.role === 'super_admin' || s.role === 'owner') && s.id !== profile.id && s.id !== meetingForm.assigned_to).forEach((admin) => {
        notifPromises.push(createData('notifications', {
          profileId: admin.id, title: 'جلسه جدید ایجاد شد',
          body: `${myName} یک جلسه با ${meetingForm.contact_name} ایجاد کرد`,
          type: 'meeting', priority: 'normal', link: '/dashboard/meetings',
        }).catch(() => {}));
      });
      await Promise.all(notifPromises);
      toast.success('جلسه ایجاد و در بخش جلسات ثبت شد');
      setMeetingDialogOpen(false); setMeetingLead(null);
    } catch (error: any) { toast.error('ایجاد جلسه ناموفق: ' + error.message); }
    setMeetingSaving(false);
  };

  const openReferral = async (lead: Lead) => {
    setReferralLead(lead);
    setSelectedReferees(new Set());
    setReferralNote('');
    setReferralDialogOpen(true);
    if (referralStaff.length === 0) {
      try {
        const data = await fetchData<Profile>('profiles', {
          where: { userType: 'staff', role: { in: ['super_admin', 'admin', 'personnel', 'owner'] }, active: true },
          orderBy: { firstName: 'asc' },
        });
        setReferralStaff(data || []);
      } catch { setReferralStaff([]); }
    }
  };

  const toggleReferee = (id: string) => {
    const updated = new Set(selectedReferees);
    if (updated.has(id)) updated.delete(id); else updated.add(id);
    setSelectedReferees(updated);
  };

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !referralLead) return;
    if (selectedReferees.size === 0) { toast.error('حداقل یک فرد انتخاب کنید'); return; }
    setReferralSaving(true);
    try {
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const promises: Promise<any>[] = [];
      for (const targetId of Array.from(selectedReferees)) {
        promises.push(createData('lead_referrals', {
          leadId: referralLead.id,
          referredToProfileId: targetId,
          referredByProfileId: profile.id,
          status: 'active',
          note: referralNote || null,
        }).catch(() => {}));
        if (targetId !== profile.id) {
          promises.push(createData('notifications', {
            profileId: targetId,
            title: 'ارجاع سرنخ فروش به شما',
            body: `سرنخ «${referralLead.name}» توسط ${myName} به شما ارجاع داده شد.`,
            type: 'lead_referral', priority: 'high', link: '/dashboard/leads',
          }).catch(() => {}));
        }
      }
      await Promise.all(promises);
      toast.success(`سرنخ به ${selectedReferees.size.toLocaleString('fa-IR')} نفر ارجاع داده شد`);
      setReferralDialogOpen(false); setReferralLead(null);
      loadLeads();
    } catch (error: any) { toast.error('ارجاع ناموفق: ' + error.message); }
    setReferralSaving(false);
  };

  const saveFollowUpResult = async () => {
    if (!viewLead) return;
    setFollowUpSaving(true);
    try {
      await updateData('leads', { id: viewLead.id }, { followUpResult: followUpResult || null });
      toast.success('نتیجه پیگیری ذخیره شد');
      loadLeads();
    } catch (error: any) { toast.error('ذخیره ناموفق: ' + error.message); }
    setFollowUpSaving(false);
  };

  const exportExcel = () => {
    const headers = ['نام', 'شرکت', 'تلفن', 'ایمیل', 'منبع', 'وضعیت', 'تاریخ ایجاد'];
    const rows = filteredLeads.map((l) => [
      l.name, l.company || '', l.phone || '', l.email || '', l.source || '', statusInfo(l.status).label, l.createdAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('خروجی Excel آماده شد');
  };

  return (
    <div className="leads-page">
      <header className="leads-header">
        <div className="leads-heading">
          <div className="leads-title-row">
            <span className="leads-title-accent" />
            <h1>سرنخ‌های فروش</h1>
          </div>
          <p>مدیریت سرنخ‌ها و دنبال‌کردن مشتریان</p>
        </div>
        <Link href="/dashboard/leads/new" className="leads-new-button">
          <Plus className="h-4 w-4" />
          سرنخ جدید
        </Link>
      </header>

      {/* Alarm Banner */}
      {alarmLeads.length > 0 && (
        <div className="leads-alarm-container">
          <div className="leads-alarm-header">
            <div className="leads-alarm-title">
              <AlertTriangle className="h-5 w-5" />
              <span>هشدار پیگیری سرنخ‌ها ({alarmLeads.length.toLocaleString('fa-IR')})</span>
            </div>
            <button className="leads-alarm-dismiss-all" onClick={dismissAllAlarms}>
              <X className="h-4 w-4" />
              بستن همه
            </button>
          </div>
          <div className="leads-alarm-list">
            {alarmLeads.map(({ lead, daysOverdue }) => {
              const isSerious = lead.status === 'serious';
              return (
                <div key={lead.id} className={`leads-alarm-item ${isSerious ? 'leads-alarm-serious' : 'leads-alarm-contacted'}`}>
                  <div className="leads-alarm-item-icon">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="leads-alarm-item-body">
                    <strong>{lead.name}</strong>
                    <span>
                      {isSerious
                        ? `این سرنخ جدی ${daysOverdue.toLocaleString('fa-IR')} روز است که پیگیری نشده است (هر ۲ روز)`
                        : `این سرنخ ${daysOverdue.toLocaleString('fa-IR')} روز است که پیگیری نشده است (هر ۷ روز)`}
                    </span>
                  </div>
                  <div className="leads-alarm-item-actions">
                    <button className="leads-alarm-follow" onClick={() => updateStatus(lead.id, lead.status)}>
                      پیگیری کردم
                    </button>
                    <button className="leads-alarm-dismiss" onClick={() => dismissAlarm(lead.id)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="leads-toolbar">
        <div className="leads-search-wrap">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="جستجوی سرنخ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="leads-filter-dropdown">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="leads-select-trigger">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="leads-layout">
        <main className="leads-content">
          {loading ? (
            <div className="leads-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="lead-skeleton">
                  <div className="lead-skeleton-avatar" />
                  <div className="lead-skeleton-line w-60" />
                  <div className="lead-skeleton-line w-40" />
                  <div className="lead-skeleton-line w-full" />
                  <div className="lead-skeleton-line w-full" />
                  <div className="lead-skeleton-line w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="leads-empty">
              <TrendingUp className="h-10 w-10" />
              <strong>سرنخی یافت نشد</strong>
              <span>سرنخ‌های فروش جدید را ثبت کنید</span>
              <Link href="/dashboard/leads/new" className="leads-empty-button">
                <Plus className="h-4 w-4" /> ایجاد سرنخ
              </Link>
            </div>
          ) : (
            <>
              <div className="leads-grid">
                {pagedLeads.map((lead) => {
                  const st = statusInfo(lead.status);
                  const stageIndex = LEAD_STATUSES.findIndex((s) => s.key === lead.status);
                  const progress = Math.round(((stageIndex + 1) / LEAD_STATUSES.length) * 100);
                  const isAlarm = alarmLeads.some((a) => a.lead.id === lead.id);
                  return (
                    <article key={lead.id} className={`lead-card ${isAlarm ? 'lead-card-alarm' : ''}`}>
                      <div className="lead-card-top-bar" style={{ backgroundColor: st.color }} />
                      <div className="lead-card-header">
                        <div className="lead-card-avatar-lg" style={{ backgroundColor: st.color + '20', color: st.color, borderColor: st.color + '40' }}>
                          {lead.name?.[0] || '؟'}
                        </div>
                        <div className="lead-card-name-wrap">
                          <h3>{lead.name}</h3>
                          <span>{lead.company || 'مشتری بالقوه'}</span>
                        </div>
                        {isAlarm && (
                          <span className="lead-card-alarm-dot" title="پیگیری نشده">
                            <Bell className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <div className="lead-card-status-row">
                        <Badge className="lead-status-badge" style={{ backgroundColor: st.color + '18', color: st.color }}>
                          {st.label}
                        </Badge>
                        <span className="lead-card-source">{lead.source || '—'}</span>
                      </div>

                      <div className="lead-card-contacts">
                        {lead.phone && isSuperAdmin && (
                          <a href={`tel:${lead.phone.replace(/[\s-]/g, '')}`} className="lead-contact-row" style={{ textDecoration: 'none', cursor: 'pointer' }} title="تماس با این شماره">
                            <Phone className="h-4 w-4" />
                            <span dir="ltr">{lead.phone}</span>
                          </a>
                        )}
                        {lead.phone && !isSuperAdmin && (
                          <div className="lead-contact-row">
                            <Phone className="h-4 w-4" />
                            <span dir="ltr" className="tracking-widest">••••••••</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="lead-contact-row">
                            <Mail className="h-4 w-4" />
                            <span dir="ltr" className="truncate">{lead.email}</span>
                          </div>
                        )}
                      </div>

                      {lead.notes && (
                        <div className="lead-card-notes">
                          <span className="lead-card-notes-label">یادداشت:</span>
                          <p className="lead-card-notes-text">{lead.notes}</p>
                        </div>
                      )}

                      <div className="lead-progress-wrap">
                        <div className="lead-progress-track">
                          <div className="lead-progress-fill" style={{ width: `${progress}%`, backgroundColor: st.color }} />
                        </div>
                        <span className="lead-progress-time">{relativeTime(lead.createdAt)}</span>
                      </div>

                      <div className="lead-status-switcher">
                        {LEAD_STATUSES.map((s) => (
                          <button
                            key={s.key}
                            className={`lead-status-chip ${lead.status === s.key ? 'lead-status-chip-active' : ''}`}
                            style={lead.status === s.key
                              ? { backgroundColor: s.color + '20', color: s.color, borderColor: s.color }
                              : { color: '#98A2B3' }
                            }
                            onClick={() => updateStatus(lead.id, s.key)}
                            title={s.label}
                          >
                            <span className="lead-status-chip-dot" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </button>
                        ))}
                      </div>

                      <div className="lead-card-actions">
                        <button className="lead-action-btn lead-action-view" onClick={() => openView(lead)} title="مشاهده">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="lead-action-btn lead-action-edit" onClick={() => openEdit(lead)} title="ویرایش">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="lead-action-btn lead-action-referral" onClick={() => openReferral(lead)} title="ارجاع">
                          <Users className="h-4 w-4" />
                        </button>
                        <button className="lead-action-btn lead-action-meeting" onClick={() => openScheduleMeeting(lead)} title="جلسه">
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button className="lead-action-btn lead-action-delete" onClick={() => handleDelete(lead)} title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {isSuperAdmin && lead.status !== 'converted' && (
                        <button
                          className="lead-convert-btn"
                          onClick={() => convertToCustomer(lead)}
                          disabled={converting}
                        >
                          <UserCheck className="h-4 w-4" />
                          {converting ? 'در حال تبدیل...' : 'تبدیل به مشتری'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="leads-pagination">
                  <div className="leads-page-size">
                    <span>نمایش</span>
                    <Select value={String(PAGE_SIZE)} onValueChange={() => {}}>
                      <SelectTrigger className="leads-page-size-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">۱۲</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>سرنخ</span>
                  </div>
                  <div className="leads-page-buttons">
                    <button className="leads-page-btn" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        className={`leads-page-btn ${currentPage === i + 1 ? 'leads-page-btn-active' : ''}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {(i + 1).toLocaleString('fa-IR')}
                      </button>
                    ))}
                    <button className="leads-page-btn" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <aside className="leads-sidebar">
          <section className="leads-sidebar-section">
            <h2 className="leads-sidebar-title">
              <BarChart3 className="h-4 w-4" />
              آمار سرنخ‌ها
            </h2>
            <div className="leads-stats-grid">
              <button
                className={`lead-mini-stat ${filterStatus === 'all' ? 'lead-mini-stat-active' : ''}`}
                onClick={() => setFilterStatus('all')}
                style={filterStatus === 'all' ? { borderColor: '#10B981', background: '#10B98112' } : undefined}
              >
                <strong style={{ color: '#10B981' }}>{leads.length.toLocaleString('fa-IR')}</strong>
                <span>همه</span>
              </button>
              {stats.map((s) => {
                const isActive = filterStatus === s.key;
                return (
                  <button
                    key={s.key}
                    className={`lead-mini-stat ${isActive ? 'lead-mini-stat-active' : ''}`}
                    onClick={() => setFilterStatus(isActive ? 'all' : s.key)}
                    style={isActive ? { borderColor: s.color, background: s.color + '12' } : undefined}
                  >
                    <strong style={{ color: s.color }}>{s.count.toLocaleString('fa-IR')}</strong>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="leads-sidebar-section">
            <h2 className="leads-sidebar-title">
              <Filter className="h-4 w-4" />
              فیلترها
            </h2>
            <div className="leads-filter-list">
              <div className="leads-filter-field">
                <label>وضعیت سرنخ</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>منبع سرنخ</label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {LEAD_SOURCES.map((src) => <SelectItem key={src} value={src}>{src}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>بازه زمانی</label>
                <Select value={filterTime} onValueChange={setFilterTime}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="7d">۷ روز اخیر</SelectItem>
                    <SelectItem value="30d">۳۰ روز اخیر</SelectItem>
                    <SelectItem value="90d">۹۰ روز اخیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>شهر</label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>مسئول پیگیری</label>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              className={`leads-clear-filters ${!hasActiveFilters ? 'leads-clear-filters-disabled' : ''}`}
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <Trash2 className="h-3.5 w-3.5" />
              پاک کردن فیلترها
            </button>
          </section>

          <section className="leads-sidebar-section">
            <h2 className="leads-sidebar-title">
              <Zap className="h-4 w-4" />
              عملیات سریع
            </h2>
            <div className="leads-quick-actions">
              <Link href="/dashboard/leads/new" className="leads-quick-btn leads-quick-blue">
                <Plus className="h-5 w-5" />
                <span>سرنخ جدید</span>
              </Link>
              <button className="leads-quick-btn leads-quick-purple">
                <FileBarChart className="h-5 w-5" />
                <span>گزارش سرنخ‌ها</span>
              </button>
              <button className="leads-quick-btn leads-quick-teal" onClick={exportExcel}>
                <FileSpreadsheet className="h-5 w-5" />
                <span>خروجی Excel</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده سرنخ</DialogTitle></DialogHeader>
          {viewLead && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg" style={{ backgroundColor: statusInfo(viewLead.status).color }}>
                  {viewLead.name?.[0] || '؟'}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{viewLead.name}</div>
                  <Badge style={{ backgroundColor: statusInfo(viewLead.status).color + '20', color: statusInfo(viewLead.status).color }}>{statusInfo(viewLead.status).label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {viewLead.company && <div><span className="text-slate-400">شرکت:</span> <span className="font-medium">{viewLead.company}</span></div>}
                {viewLead.source && <div><span className="text-slate-400">منبع:</span> <span className="font-medium">{viewLead.source}</span></div>}
                {viewLead.phone && isSuperAdmin && <div><span className="text-slate-400">تلفن:</span> <a href={`tel:${viewLead.phone.replace(/[\s-]/g, '')}`} className="font-medium text-[#2563EB]" dir="ltr" style={{ textDecoration: 'underline' }}>{viewLead.phone}</a></div>}
                {viewLead.phone && !isSuperAdmin && <div><span className="text-slate-400">تلفن:</span> <span className="font-medium tracking-widest" dir="ltr">••••••••</span></div>}
                {viewLead.email && <div><span className="text-slate-400">ایمیل:</span> <span className="font-medium" dir="ltr">{viewLead.email}</span></div>}
              </div>
              {viewLead.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">یادداشت:</span>
                  {viewLead.notes}
                </div>
              )}

              {/* Follow-up Result Section */}
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-sm font-bold text-slate-700">نتیجه پیگیری</span>
                </div>
                <Textarea
                  value={followUpResult}
                  onChange={(e) => setFollowUpResult(e.target.value)}
                  placeholder="نتیجه پیگیری این سرنخ را وارد کنید..."
                  rows={3}
                  className="text-sm"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={saveFollowUpResult} disabled={followUpSaving}>
                    {followUpSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {followUpSaving ? 'در حال ذخیره...' : 'ذخیره نتیجه'}
                  </Button>
                </div>
              </div>

              {/* Referrals Section */}
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#16B981]" />
                    <span className="text-sm font-bold text-slate-700">ارجاع‌ها</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setViewDialogOpen(false); if (viewLead) openReferral(viewLead); }}>
                    <Send className="h-3.5 w-3.5" />
                    ارجاع جدید
                  </Button>
                </div>
                {viewReferrals.length === 0 ? (
                  <p className="text-xs text-slate-400">هنوز ارجاعی ثبت نشده است</p>
                ) : (
                  <div className="space-y-2">
                    {viewReferrals.map((ref) => {
                      const p = ref.referredToProfileId ? viewReferralProfiles[ref.referredToProfileId] : null;
                      const name = p ? fullName(p.firstName, p.lastName) : 'کاربر حذف شده';
                      const roleLabel = p?.role === 'super_admin' || p?.role === 'owner' ? 'سوپرادمین' : p?.role === 'admin' ? 'مدیر' : 'پرسنل';
                      return (
                        <div key={ref.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#16B981]/15 text-[#16B981] flex items-center justify-center font-bold">
                              {name?.[0] || '؟'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-700">{name}</div>
                              <div className="text-[10px] text-slate-400">{roleLabel} • {relativeTime(ref.createdAt)}</div>
                            </div>
                          </div>
                          <Badge className={ref.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                            {ref.status === 'active' ? 'فعال' : 'بسته شده'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ایجاد شده: {relativeTime(viewLead.createdAt)}
                {viewLead.updatedAt && <span className="mr-2">• آخرین به‌روزرسانی: {relativeTime(viewLead.updatedAt)}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ویرایش سرنخ</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نام *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>شرکت</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>منبع جذب</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="منبع جذب را انتخاب کنید" /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((src) => <SelectItem key={src} value={src}>{src}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>یادداشت</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              </div>
              {isSuperAdmin && editingLead && editingLead.status !== 'converted' && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                  disabled={converting}
                  onClick={() => convertToCustomer(editingLead)}
                >
                  <UserCheck className="w-4 h-4" />
                  {converting ? 'در حال تبدیل...' : 'تبدیل به مشتری واقعی'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ارجاع سرنخ</DialogTitle></DialogHeader>
          {referralLead && (
            <form onSubmit={handleReferralSubmit} className="space-y-4">
              <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
                سرنخ «{referralLead.name}» به افراد انتخاب‌شده ارجاع داده می‌شود و برای هر کدام اعلان درون‌سیستمی ارسال می‌شود.
              </div>
              <div className="space-y-2">
                <Label>انتخاب افراد (می‌توانید چند نفر انتخاب کنید) *</Label>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1">
                  {referralStaff.length === 0 && (
                    <p className="text-xs text-slate-400 p-2">کاربری یافت نشد</p>
                  )}
                  {referralStaff.map((s) => {
                    const checked = selectedReferees.has(s.id);
                    const roleLabel = s.role === 'super_admin' || s.role === 'owner' ? 'سوپرادمین' : s.role === 'admin' ? 'مدیر' : 'پرسنل';
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${checked ? 'bg-[#2DD4BF]/10' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleReferee(s.id)}
                          className="h-4 w-4 rounded accent-[#2DD4BF]"
                        />
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                          {(s.firstName?.[0] || 'ن').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-700">{fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}</div>
                          <div className="text-[10px] text-slate-400">{roleLabel}{s.position ? ` • ${s.position}` : ''}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedReferees.size > 0 && (
                  <p className="text-xs text-[#2DD4BF] font-medium">{selectedReferees.size.toLocaleString('fa-IR')} نفر انتخاب شده</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>یادداشت ارجاع (اختیاری)</Label>
                <Textarea value={referralNote} onChange={(e) => setReferralNote(e.target.value)} placeholder="توضیحات مربوط به این ارجاع..." rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReferralDialogOpen(false)}>انصراف</Button>
                <Button type="submit" disabled={referralSaving}>
                  {referralSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {referralSaving ? 'در حال ارجاع...' : 'ثبت ارجاع'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تنظیم جلسه برای سرنخ</DialogTitle></DialogHeader>
          {meetingLead && (
            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
                جلسه به‌طور خودکار با سرنخ «{meetingLead.name}» مرتبط می‌شود.
              </div>
              <div className="space-y-2">
                <Label>نام هدف/مشتری/شرکت *</Label>
                <Input value={meetingForm.contact_name} onChange={(e) => setMeetingForm({ ...meetingForm, contact_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>تخصیص به پرسنل *</Label>
                <Select value={meetingForm.assigned_to} onValueChange={(v) => setMeetingForm({ ...meetingForm, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب فرد مسئول..." /></SelectTrigger>
                  <SelectContent>
                    {meetingStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>تاریخ *</Label>
                  <JalaliDatePicker value={meetingForm.date ? new Date(meetingForm.date) : null} onChange={(d) => setMeetingForm({ ...meetingForm, date: d ? toLocalDateString(d) : '' })} placeholder="انتخاب تاریخ" />
                </div>
                <div className="space-y-2">
                  <Label>زمان *</Label>
                  <Input type="time" dir="ltr" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>موضوع</Label>
                <Input value={meetingForm.topic} onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })} placeholder="موضوع جلسه" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>مکان</Label>
                  <Input value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="محل برگزاری" />
                </div>
                <div className="space-y-2">
                  <Label>لینک آنلاین</Label>
                  <Input dir="ltr" value={meetingForm.online_link} onChange={(e) => setMeetingForm({ ...meetingForm, online_link: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>دستور جلسه</Label>
                <Textarea value={meetingForm.agenda} onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })} placeholder="دستور جلسه را بنویسید..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMeetingDialogOpen(false)}>انصراف</Button>
                <Button type="submit" disabled={meetingSaving}>
                  {meetingSaving ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد جلسه'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
