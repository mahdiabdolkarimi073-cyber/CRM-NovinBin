'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  TrendingUp, Plus, Phone, Mail, MapPin, FileText, Search, Eye, Trash2, BarChart3,
  Filter, Zap, FileBarChart, ChevronLeft, ChevronRight, UserCheck,
  Clock, AlertTriangle, Bell, X, Calendar, Video, Loader2, Users,
  Save, Send, ClipboardList, Archive, ArchiveRestore, Forward,
  LayoutGrid, List, CheckCircle2, FileSpreadsheet, Sparkles,
} from 'lucide-react';
import { relativeTime, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { LEAD_STATUSES, LEAD_SOURCES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead, Profile, LeadReferral } from '@/lib/types';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

const CITIES = ['تهران', 'مشهد', 'اصهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'کرمان'];

const PAGE_SIZE = 12;

const ALARM_INTERVALS: Record<string, number> = {
  serious: 2 * 24 * 60 * 60 * 1000,
  contacted: 3 * 24 * 60 * 60 * 1000,
  new: 4 * 24 * 60 * 60 * 1000,
};

interface AlarmLead { lead: Lead; daysOverdue: number; interval: number }

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
  const [dismissedAlarms, setDismissedAlarms] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', city: '', source: '', notes: '' });
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
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadLeads = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: Record<string, any> = { isArchived: false };
      if (filterStatus !== 'all') where.status = filterStatus;
      if (filterSource !== 'all') where.source = filterSource;
      if (search.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { company: { contains: search.trim(), mode: 'insensitive' } },
          { phone: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }
      const data = await fetchData<Lead>('leads', { where, orderBy: { createdAt: 'desc' } });
      setLeads(data || []);
    } catch (error: any) {
      toast.error('بارگذاری سرنخ‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, filterStatus, filterSource, search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { setPage(1); }, [filterStatus, filterSource, filterCity, filterAssignee, filterTime, search]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissedLeadAlarms');
      if (stored) setDismissedAlarms(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const filteredLeads = useMemo(() => {
    const now = Date.now();
    return leads.filter((l) => {
      if (filterCity !== 'all' && l.city !== filterCity) return false;
      if (filterTime !== 'all') {
        const days = parseInt(filterTime.replace('d', ''));
        const limit = now - days * 24 * 60 * 60 * 1000;
        if (new Date(l.createdAt).getTime() < limit) return false;
      }
      return true;
    });
  }, [leads, filterCity, filterTime]);

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const pagedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const alarmLeads = useMemo<AlarmLead[]>(() => {
    const now = Date.now();
    const result: AlarmLead[] = [];
    for (const lead of leads) {
      if (lead.status === 'converted' || lead.status === 'lost') continue;
      if (dismissedAlarms.has(lead.id)) continue;
      const interval = ALARM_INTERVALS[lead.status];
      if (!interval) continue;
      const lastActivity = lead.nextFollowUp || lead.createdAt;
      const elapsed = now - new Date(lastActivity).getTime();
      if (elapsed > interval) {
        result.push({ lead, daysOverdue: Math.floor(elapsed / (24 * 60 * 60 * 1000)), interval });
      }
    }
    return result.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [leads, dismissedAlarms]);

  const dismissAlarm = (leadId: string) => {
    const updated = new Set(dismissedAlarms);
    updated.add(leadId);
    setDismissedAlarms(updated);
    localStorage.setItem('dismissedLeadAlarms', JSON.stringify([...updated]));
  };

  const dismissAllAlarms = () => {
    const updated = new Set(dismissedAlarms);
    alarmLeads.forEach((a) => updated.add(a.lead.id));
    setDismissedAlarms(updated);
    localStorage.setItem('dismissedLeadAlarms', JSON.stringify([...updated]));
  };

  const stats = useMemo(() => [
    {
      label: 'کل سرنخ‌ها', value: leads.length, icon: TrendingUp,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'جدید', value: leads.filter((l) => l.status === 'new').length, icon: Sparkles,
      filter: 'new',
      gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
      glow: 'rgba(100,116,139,0.25)',
    },
    {
      label: 'در حال پیگیری', value: leads.filter((l) => l.status === 'contacted').length, icon: Clock,
      filter: 'contacted',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'تبدیل شده', value: leads.filter((l) => l.status === 'converted').length, icon: CheckCircle2,
      filter: 'converted',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
  ], [leads]);

  const hasActiveFilters = filterStatus !== 'all' || filterSource !== 'all' || filterCity !== 'all' || filterAssignee !== 'all' || filterTime !== 'all';

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterSource('all');
    setFilterCity('all');
    setFilterAssignee('all');
    setFilterTime('all');
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      source: lead.source || '',
      notes: lead.notes || '',
    });
    setEditDialogOpen(true);
  };

  const openView = async (lead: Lead) => {
    setViewLead(lead);
    setFollowUpResult(lead.followUpResult || '');
    setViewDialogOpen(true);
    try {
      const referrals = await fetchData<LeadReferral>('lead_referrals', { where: { leadId: lead.id }, orderBy: { createdAt: 'desc' } });
      setViewReferrals(referrals || []);
      const profileIds = (referrals || []).map((r) => r.referredToProfileId).filter(Boolean) as string[];
      if (profileIds.length > 0) {
        const profs = await fetchData<Profile>('profiles', { where: { id: { in: profileIds } } });
        const map: Record<string, Profile> = {};
        (profs || []).forEach((p) => { map[p.id] = p; });
        setViewReferralProfiles(map);
      } else {
        setViewReferralProfiles({});
      }
    } catch {
      setViewReferrals([]);
      setViewReferralProfiles({});
    }
  };

  const handleEditSave = async () => {
    if (!editingLead) return;
    setSaving(true);
    try {
      await updateData('leads', { id: editingLead.id }, {
        name: form.name,
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        source: form.source || null,
        notes: form.notes || null,
      });
      toast.success('سرنخ ویرایش شد');
      setEditDialogOpen(false);
      setEditingLead(null);
      loadLeads();
    } catch (e: any) {
      toast.error('ویرایش ناموفق: ' + e.message);
    }
    setSaving(false);
  };

  const handleArchive = async (lead: Lead) => {
    if (!confirm(`آرشیو کردن سرنخ «${lead.name}»؟`)) return;
    try {
      await updateData('leads', { id: lead.id }, { isArchived: true, archivedAt: new Date().toISOString() });
      toast.success('سرنخ به آرشیو منتقل شد');
      loadLeads();
    } catch (e: any) {
      toast.error('آرشیو ناموفق: ' + e.message);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`حذف سرنخ «${lead.name}»؟ این عمل قابل بازگشت نیست.`)) return;
    try {
      await deleteData('leads', { id: lead.id });
      toast.success('سرنخ حذف شد');
      loadLeads();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const convertToCustomer = async (lead: Lead) => {
    if (!isSuperAdmin) return;
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
      loadLeads();
    } catch (e: any) {
      toast.error('تبدیل ناموفق: ' + e.message);
    }
    setConverting(false);
  };

  const updateStatus = async (lead: Lead, newStatus: string) => {
    try {
      await updateData('leads', { id: lead.id }, { status: newStatus, nextFollowUp: new Date().toISOString() });
      const updated = new Set(dismissedAlarms);
      updated.delete(lead.id);
      setDismissedAlarms(updated);
      toast.success('وضعیت سرنخ به‌روزرسانی شد');
      loadLeads();
    } catch (e: any) {
      toast.error('تغییر وضعیت ناموفق: ' + e.message);
    }
  };

  const openScheduleMeeting = async (lead: Lead) => {
    setMeetingLead(lead);
    setMeetingForm({
      contact_name: lead.name,
      assigned_to: 'none',
      date: '',
      time: '',
      topic: '',
      location: '',
      online_link: '',
      agenda: '',
    });
    setMeetingDialogOpen(true);
    try {
      const staff = await fetchData<Profile>('profiles', {
        where: {
          userType: 'staff',
          role: { in: ['personnel', 'admin', 'super_admin', 'owner'] },
          active: true,
        },
        orderBy: { firstName: 'asc' },
      });
      setMeetingStaff(staff || []);
    } catch {
      setMeetingStaff([]);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingLead || !profile) return;
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
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      if (meetingForm.assigned_to !== profile.id) {
        await createData('notifications', {
          profileId: meetingForm.assigned_to,
          title: 'جلسه جدید به شما تخصیص داده شد',
          body: `${myName} یک جلسه برای سرنخ «${meetingForm.contact_name}» ایجاد کرد`,
          type: 'meeting',
          priority: 'normal',
          link: '/dashboard/meetings',
        }).catch(() => {});
      }
      toast.success('جلسه با موفقیت برنامه‌ریزی شد');
      setMeetingDialogOpen(false);
      setMeetingLead(null);
    } catch (e: any) {
      toast.error('برنامه‌ریزی جلسه ناموفق: ' + e.message);
    }
    setMeetingSaving(false);
  };

  const openReferral = async (lead: Lead) => {
    setReferralLead(lead);
    setSelectedReferees(new Set());
    setReferralNote('');
    setReferralDialogOpen(true);
    try {
      const staff = await fetchData<Profile>('profiles', {
        where: {
          userType: 'staff',
          role: { in: ['personnel', 'admin', 'super_admin', 'owner'] },
          active: true,
        },
        orderBy: { firstName: 'asc' },
      });
      setReferralStaff(staff || []);
    } catch {
      setReferralStaff([]);
    }
  };

  const toggleReferee = (id: string) => {
    setSelectedReferees((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  };

  const handleReferralSubmit = async () => {
    if (!referralLead || !profile || selectedReferees.size === 0) return;
    setReferralSaving(true);
    try {
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      for (const targetId of selectedReferees) {
        await createData('lead_referrals', {
          leadId: referralLead.id,
          referredToProfileId: targetId,
          referredByProfileId: profile.id,
          status: 'pending',
          note: referralNote || null,
        });
        if (targetId !== profile.id) {
          await createData('notifications', {
            profileId: targetId,
            title: 'سرنخی به شما ارجاع داده شد',
            body: `${myName} یک سرنخ «${referralLead.name}» را به شما ارجاع داد`,
            type: 'referral',
            priority: 'high',
            link: '/dashboard/leads',
          }).catch(() => {});
        }
      }
      toast.success('سرنخ ارجاع داده شد');
      setReferralDialogOpen(false);
      setReferralLead(null);
    } catch (e: any) {
      toast.error('ارجاع ناموفق: ' + e.message);
    }
    setReferralSaving(false);
  };

  const saveFollowUpResult = async () => {
    if (!viewLead) return;
    setFollowUpSaving(true);
    try {
      await updateData('leads', { id: viewLead.id }, {
        followUpResult: followUpResult || null,
        nextFollowUp: new Date().toISOString(),
      });
      toast.success('نتیجه پیگیری ثبت شد');
      setViewLead({ ...viewLead, followUpResult });
      loadLeads();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + e.message);
    }
    setFollowUpSaving(false);
  };

  const exportExcel = () => {
    const headers = ['نام', 'شرکت', 'تلفن', 'ایمیل', 'شهر', 'منبع', 'وضعیت', 'تاریخ ایجاد'];
    const rows = filteredLeads.map((l) => [
      l.name, l.company || '', l.phone || '', l.email || '', l.city || '', l.source || '',
      statusInfo(l.status).label, formatJalaliDateTime(l.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatClick = (filter: string) => {
    setFilterStatus(filterStatus === filter ? 'all' : filter);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری سرنخ‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#F97316,#EA580C)', boxShadow: '0 0 12px rgba(249,115,22,.25)' }} />
              <h1>سرنخ‌های فروش</h1>
            </div>
            <p>مدیریت و پیگیری سرنخ‌های فروش</p>
          </div>
        </div>
        <div className="nb-hero-right">
          {isSuperAdmin && (
            <Link href="/dashboard/leads/archive" className="nb-editor-quick-btn">
              <Archive className="h-4 w-4" />
              آرشیو
            </Link>
          )}
          <Link href="/dashboard/leads/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            سرنخ جدید
          </Link>
        </div>
      </header>

      {/* Alarm Banner */}
      {alarmLeads.length > 0 && (
        <div className="nb-alarm-banner" style={{
          marginBottom: 20, borderRadius: 14, border: '1px solid rgba(239,68,68,.2)',
          background: 'rgba(239,68,68,.04)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(239,68,68,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                سرنخ‌های نیازمند پیگیری ({alarmLeads.length.toLocaleString('fa-IR')})
              </span>
            </div>
            <button onClick={dismissAllAlarms} style={{ fontSize: 12, color: '#94A3B8', background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit' }}>
              رد کردن همه
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
            {alarmLeads.map(({ lead, daysOverdue }) => {
              const st = statusInfo(lead.status);
              const urgent = daysOverdue >= 3;
              return (
                <div key={lead.id} style={{
                  flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', borderRadius: 10,
                  background: urgent ? 'rgba(239,68,68,.08)' : 'rgba(245,158,11,.08)',
                  border: `1px solid ${urgent ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.15)'}`,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: urgent ? '#EF4444' : '#F59E0B',
                    animation: 'nbPulse 2s ease infinite',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{lead.name}</span>
                  <span style={{ fontSize: 11, color: urgent ? '#DC2626' : '#D97706' }}>
                    {daysOverdue.toLocaleString('fa-IR')} روز تأخیر
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 11, background: `${st.color}15`, color: st.color }}>
                    {st.label}
                  </span>
                  <button onClick={() => openView(lead)} style={{
                    fontSize: 11, color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 600,
                  }}>پیگیری</button>
                  <button onClick={() => dismissAlarm(lead.id)} style={{
                    color: '#94A3B8', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex',
                  }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      {/* Toolbar */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه سرنخ‌ها</h2>
          <span className="nb-count-badge">{filteredLeads.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در سرنخ‌ها..."
            />
            {search && (
              <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <Filter className="ml-1 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="nb-select-filter h-10 w-[140px]">
              <SelectValue placeholder="منبع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه منابع</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredLeads.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>سرنخی یافت نشد</h3>
          <p>اولین سرنخ فروش را ایجاد کنید</p>
          <Link href="/dashboard/leads/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" />
            ایجاد سرنخ
          </Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="nb-grid nb-grid-grid">
          {pagedLeads.map((lead) => {
            const st = statusInfo(lead.status);
            const hasAlarm = alarmLeads.some((a) => a.lead.id === lead.id);
            return (
              <article
                key={lead.id}
                className="nb-card"
                onClick={() => openView(lead)}
                style={{ borderBottomColor: st.color, borderBottomWidth: 3 }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                    {lead.source && (
                      <span className="nb-card-tag" style={{ background: 'rgba(37,99,235,.08)', color: '#2563EB' }}>
                        {lead.source}
                      </span>
                    )}
                    {hasAlarm && (
                      <span className="nb-card-tag" style={{ background: 'rgba(239,68,68,.12)', color: '#EF4444' }}>
                        <AlertTriangle className="h-2.5 w-2.5" /> نیازمند پیگیری
                      </span>
                    )}
                  </div>
                  <div className="nb-card-actions">
                    <button className="nb-card-more" onClick={(e) => { e.stopPropagation(); openView(lead); }}>
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="nb-card-title">{lead.name}</h3>
                {lead.company && <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{lead.company}</p>}

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {lead.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span dir="ltr">{isSuperAdmin ? lead.phone : '۰۹** *** ****'}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span dir="ltr" className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{lead.city}</span>
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <div className="mt-2 rounded-lg bg-slate-50/50 p-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400" onClick={(e) => e.stopPropagation()}>
                    <p className="line-clamp-2">{lead.notes}</p>
                  </div>
                )}

                {/* Status switcher chips */}
                <div className="mt-2 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  {LEAD_STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => updateStatus(lead, s.key)}
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all"
                      style={{
                        background: lead.status === s.key ? `${s.color}20` : 'transparent',
                        color: lead.status === s.key ? s.color : '#94A3B8',
                        border: `1px solid ${lead.status === s.key ? s.color + '30' : '#E2E8F0'}`,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="nb-card-footer">
                  <div className="nb-card-date">
                    <Clock className="h-3 w-3" />
                    {relativeTime(lead.createdAt)}
                  </div>
                  <div className="nb-card-quick">
                    <button onClick={(e) => { e.stopPropagation(); openView(lead); }} title="مشاهده">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <Link href={`/dashboard/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="جزئیات">
                      <FileText className="h-3.5 w-3.5" />
                    </Link>
                    <Link href={`/dashboard/leads/${lead.id}/edit`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش">
                      <ClipboardList className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={(e) => { e.stopPropagation(); openReferral(lead); }} title="ارجاع">
                      <Forward className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); openScheduleMeeting(lead); }} title="جلسه">
                      <Calendar className="h-3.5 w-3.5" />
                    </button>
                    {isSuperAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleArchive(lead); }} title="آرشیو">
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(lead); }} title="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isSuperAdmin && lead.status !== 'converted' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); convertToCustomer(lead); }}
                    disabled={converting}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    تبدیل به مشتری
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شرکت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تلفن</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شهر</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">منبع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pagedLeads.map((lead) => {
                  const st = statusInfo(lead.status);
                  return (
                    <tr key={lead.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => openView(lead)}>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{lead.name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{lead.company || '—'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300" dir="ltr">{isSuperAdmin ? lead.phone || '—' : '۰۹** *** ****'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{lead.city || '—'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{lead.source || '—'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${st.color}15`, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" onClick={() => openView(lead)}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link href={`/dashboard/leads/${lead.id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                            <FileText className="h-4 w-4" />
                          </Link>
                          <button className="rounded p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600" onClick={() => openReferral(lead)} title="ارجاع">
                            <Forward className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && (
                            <button className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(lead)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">
            صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sidebar filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">فیلترها</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-sky-600 hover:underline">پاک کردن</button>
            )}
          </div>
          <div className="space-y-3">
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="شهر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه شهرها</SelectItem>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTime} onValueChange={setFilterTime}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="بازه زمانی" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه زمان‌ها</SelectItem>
                <SelectItem value="7d">۷ روز اخیر</SelectItem>
                <SelectItem value="30d">۳۰ روز اخیر</SelectItem>
                <SelectItem value="90d">۹۰ روز اخیر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">اقدامات سریع</span>
          </div>
          <div className="space-y-2">
            <Link href="/dashboard/leads/new" className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400">
              <Plus className="h-4 w-4" /> سرنخ جدید
            </Link>
            <button onClick={exportExcel} className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" /> خروجی Excel
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">آمار سریع</span>
          </div>
          <div className="space-y-2 text-sm">
            {LEAD_STATUSES.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {leads.filter((l) => l.status === s.key).length.toLocaleString('fa-IR')}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">گزارش</span>
          </div>
          <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <p>کل سرنخ‌ها: <strong className="text-slate-900 dark:text-slate-100">{leads.length.toLocaleString('fa-IR')}</strong></p>
            <p>سرنخ‌های فعال: <strong className="text-slate-900 dark:text-slate-100">{leads.filter((l) => l.status !== 'converted' && l.status !== 'lost').length.toLocaleString('fa-IR')}</strong></p>
            <p>نیازمند پیگیری: <strong className="text-red-500">{alarmLeads.length.toLocaleString('fa-IR')}</strong></p>
          </div>
        </div>
      </div>

      <Link href="/dashboard/leads/new" className="nb-fab" aria-label="سرنخ جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مشاهده سرنخ</DialogTitle></DialogHeader>
          {viewLead && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{viewLead.name}</div>
                  {viewLead.company && <div className="text-xs text-slate-400">{viewLead.company}</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {viewLead.phone && <div><span className="text-slate-400">تلفن:</span> <span className="font-medium" dir="ltr">{isSuperAdmin ? viewLead.phone : '۰۹** *** ****'}</span></div>}
                {viewLead.email && <div><span className="text-slate-400">ایمیل:</span> <span className="font-medium" dir="ltr">{viewLead.email}</span></div>}
                {viewLead.city && <div><span className="text-slate-400">شهر:</span> <span className="font-medium">{viewLead.city}</span></div>}
                {viewLead.source && <div><span className="text-slate-400">منبع:</span> <span className="font-medium">{viewLead.source}</span></div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">وضعیت:</span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `${statusInfo(viewLead.status).color}15`, color: statusInfo(viewLead.status).color }}>
                  {statusInfo(viewLead.status).label}
                </span>
              </div>
              {viewLead.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="mb-1 block text-slate-400">یادداشت:</span>
                  {viewLead.notes}
                </div>
              )}
              {viewLead.additionalPhones && viewLead.additionalPhones.length > 0 && (
                <div>
                  <span className="mb-1 block text-sm text-slate-400">شماره‌های اضافی:</span>
                  <div className="flex flex-wrap gap-2">
                    {viewLead.additionalPhones.map((p, i) => (
                      <span key={i} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300" dir="ltr">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewLead.serviceTypes && viewLead.serviceTypes.length > 0 && (
                <div>
                  <span className="mb-1 block text-sm text-slate-400">خدمات درخواستی:</span>
                  <div className="flex flex-wrap gap-2">
                    {viewLead.serviceTypes.map((s, i) => (
                      <span key={i} className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Follow-up result */}
              <div className="space-y-2">
                <Label>نتیجه پیگیری</Label>
                <Textarea
                  value={followUpResult}
                  onChange={(e) => setFollowUpResult(e.target.value)}
                  placeholder="نتیجه پیگیری از این سرنخ را وارد کنید..."
                  className="min-h-[80px]"
                />
                <Button type="button" size="sm" onClick={saveFollowUpResult} disabled={followUpSaving}>
                  {followUpSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  ثبت نتیجه پیگیری
                </Button>
              </div>
              {/* Referrals */}
              {viewReferrals.length > 0 && (
                <div>
                  <span className="mb-2 block text-sm text-slate-400">ارجاع‌ها ({viewReferrals.length.toLocaleString('fa-IR')}):</span>
                  <div className="space-y-2">
                    {viewReferrals.map((r) => {
                      const p = viewReferralProfiles[r.referredToProfileId || ''];
                      return (
                        <div key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/30">
                            {(p?.firstName?.[0] || '') + (p?.lastName?.[0] || '')}
                          </div>
                          <span className="flex-1 text-slate-700 dark:text-slate-300">
                            {p ? fullName(p.firstName, p.lastName) : 'کاربر ناشناس'}
                          </span>
                          <span className="text-xs text-slate-400">{relativeTime(r.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-400">
                ایجاد: {formatJalaliDateTime(viewLead.createdAt)} · به‌روزرسانی: {relativeTime(viewLead.updatedAt)}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href={`/dashboard/leads/${viewLead.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-sky-100">
                  <Eye className="h-3.5 w-3.5" /> جزئیات کامل
                </Link>
                <Link href={`/dashboard/leads/${viewLead.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <ClipboardList className="h-3.5 w-3.5" /> ویرایش
                </Link>
                <Button type="button" variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); openReferral(viewLead); }}>
                  <Forward className="h-4 w-4" /> ارجاع
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); openScheduleMeeting(viewLead); }}>
                  <Calendar className="h-4 w-4" /> جلسه
                </Button>
                {isSuperAdmin && viewLead.status !== 'converted' && (
                  <Button type="button" variant="outline" size="sm" onClick={() => convertToCustomer(viewLead)} disabled={converting}>
                    <UserCheck className="h-4 w-4" /> تبدیل به مشتری
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ویرایش سرنخ</DialogTitle></DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>شرکت</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>شهر</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>منبع جذب</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="منبع را انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>یادداشت</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[80px]" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleEditSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  ذخیره
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ارجاع سرنخ</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">سرنخ را به پرسنل انتخاب‌شده ارجاع دهید. برای هر کدام اعلان درون‌سیستمی ارسال می‌شود.</p>
            {referralLead && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                سرنخ: <span className="font-bold text-slate-900 dark:text-slate-100">{referralLead.name}</span>
              </div>
            )}
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              {referralStaff.map((s) => {
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
          {meetingLead && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                سرنخ: <span className="font-bold text-slate-900 dark:text-slate-100">{meetingLead.name}</span>
              </div>
              <div className="space-y-2">
                <Label>نام تماس <span className="text-red-500">*</span></Label>
                <Input value={meetingForm.contact_name} onChange={(e) => setMeetingForm({ ...meetingForm, contact_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>مسئول <span className="text-red-500">*</span></Label>
                <Select value={meetingForm.assigned_to} onValueChange={(v) => setMeetingForm({ ...meetingForm, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب مسئول" /></SelectTrigger>
                  <SelectContent>
                    {meetingStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاریخ <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={meetingForm.date ? new Date(meetingForm.date) : null}
                    onChange={(d) => setMeetingForm({ ...meetingForm, date: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ساعت <span className="text-red-500">*</span></Label>
                  <input type="time" dir="ltr" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>موضوع</Label>
                <Input value={meetingForm.topic} onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>مکان</Label>
                <Input value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>لینک آنلاین</Label>
                <Input value={meetingForm.online_link} onChange={(e) => setMeetingForm({ ...meetingForm, online_link: e.target.value })} dir="ltr" />
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
