'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  ArrowRight, Calendar, Clock, MapPin, Video, UserRound, Phone,
  FileText, CheckCircle2, Loader2, Upload, Trash2,
  GripVertical, Image as ImageIcon, Users, Paperclip, X,
  Forward, Send,
} from 'lucide-react';
import { formatJalaliDateTime, formatFileSize } from '@/lib/format';

interface ResultFile {
  url: string;
  name: string;
  type: string;
  size: number;
}
import { MEETING_STATUSES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Meeting, MeetingImage, Profile, MeetingReferral } from '@/lib/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const statusInfo = (key: string) => MEETING_STATUSES.find((s) => s.key === key) || MEETING_STATUSES[0];

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [images, setImages] = useState<MeetingImage[]>([]);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [outcomeForm, setOutcomeForm] = useState({ outcome: '', minutes: '' });
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [outcomeFiles, setOutcomeFiles] = useState<ResultFile[]>([]);
  const [uploadingOutcome, setUploadingOutcome] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outcomeFileInputRef = useRef<HTMLInputElement>(null);
  const [referrals, setReferrals] = useState<MeetingReferral[]>([]);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedReferees, setSelectedReferees] = useState<Set<string>>(new Set());
  const [referralNote, setReferralNote] = useState('');
  const [referralSaving, setReferralSaving] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [mtgs, imgs, allStaff, refs] = await Promise.all([
        fetchData<Meeting>('meetings', { where: { id } }),
        fetchData<MeetingImage>('meeting_images', { where: { meetingId: id }, orderBy: { sortOrder: 'asc' } }),
        fetchData<Profile>('profiles', {
          where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin', 'owner'] }, active: true },
        }),
        fetchData<MeetingReferral>('meeting_referrals', { where: { meetingId: id }, orderBy: { createdAt: 'desc' } }),
      ]);
      if (mtgs && mtgs.length > 0) {
        const m = mtgs[0];
        setMeeting(m);
        setOutcomeForm({ outcome: m.outcome || '', minutes: m.minutes || '' });
        try {
          const imgs: ResultFile[] = Array.isArray(m.conclusionImages) ? m.conclusionImages : [];
          const docs: ResultFile[] = Array.isArray(m.conclusionAttachments) ? m.conclusionAttachments : [];
          setOutcomeFiles([...imgs, ...docs]);
        } catch { setOutcomeFiles([]); }

        if (m.meeting_participants && m.meeting_participants.length > 0) {
          const participantIds = m.meeting_participants.map((p) => p.profileId);
          const participantProfiles = (allStaff || []).filter((s) => participantIds.includes(s.id));
          setParticipants(participantProfiles);
        }
        setStaff(allStaff || []);
      }
      setImages(imgs || []);
      setReferrals(refs || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files: FileList) => {
    if (!profile || !meeting) return;
    setUploading(true);
    try {
      const currentMaxSort = images.length > 0 ? Math.max(...images.map((i) => i.sortOrder)) : -1;
      const uploadPromises = Array.from(files).map(async (file, idx) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/meeting-image', { method: 'POST', body: formData, credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'آپلود ناموفق');
        return createData<MeetingImage>('meeting_images', {
          meetingId: meeting.id,
          imageUrl: json.url,
          fileName: file.name,
          sortOrder: currentMaxSort + idx + 1,
          uploadedBy: profile.id,
        });
      });
      await Promise.all(uploadPromises);
      toast.success('تصاویر آپلود شد');
      load();
    } catch (error: any) {
      toast.error('آپلود ناموفق: ' + error.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteImage = async (imgId: string) => {
    if (!confirm('حذف این تصویر؟')) return;
    try {
      await deleteData('meeting_images', { id: imgId });
      toast.success('تصویر حذف شد');
      load();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const handleDragStart = (imgId: string) => { setDragId(imgId); };
  const handleDragOver = (e: React.DragEvent, overId: string) => { e.preventDefault(); setDragOverId(overId); };
  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const dragged = images.find((i) => i.id === dragId);
    const target = images.find((i) => i.id === targetId);
    if (!dragged || !target) { setDragId(null); setDragOverId(null); return; }

    const reordered = [...images];
    const dragIdx = reordered.findIndex((i) => i.id === dragId);
    const targetIdx = reordered.findIndex((i) => i.id === targetId);
    reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, dragged);

    const updates = reordered.map((img, idx) =>
      updateData('meeting_images', { id: img.id }, { sortOrder: idx }).catch(() => {})
    );
    await Promise.all(updates);
    setDragId(null);
    setDragOverId(null);
    load();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!meeting) return;
    try {
      await updateData('meetings', { id: meeting.id }, { status: newStatus });
      toast.success('وضعیت تغییر کرد');
      load();
    } catch (e: any) {
      toast.error('تغییر وضعیت ناموفق: ' + e.message);
    }
  };

  const handleOutcomeFileUpload = async (files: FileList) => {
    setUploadingOutcome(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/meeting-result-file', { method: 'POST', body: formData, credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'آپلود ناموفق');
        return { url: json.url, name: json.name, type: json.type, size: json.size } as ResultFile;
      });
      const uploaded = await Promise.all(uploadPromises);
      setOutcomeFiles((prev) => [...prev, ...uploaded]);
      toast.success('فایل‌ها آپلود شد');
    } catch (e: any) {
      toast.error('آپلود ناموفق: ' + e.message);
    }
    setUploadingOutcome(false);
    if (outcomeFileInputRef.current) outcomeFileInputRef.current.value = '';
  };

  const handleOutcomeSave = async () => {
    if (!meeting) return;
    setSavingOutcome(true);
    try {
      const imageFiles = outcomeFiles.filter((f) => f.type.startsWith('image/'));
      const docFiles = outcomeFiles.filter((f) => !f.type.startsWith('image/'));
      await updateData('meetings', { id: meeting.id }, {
        outcome: outcomeForm.outcome || null,
        minutes: outcomeForm.minutes || null,
        conclusionImages: imageFiles,
        conclusionAttachments: docFiles,
      });
      toast.success('نتیجه جلسه ثبت شد');
      load();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + e.message);
    }
    setSavingOutcome(false);
  };

  const openReferralDialog = () => {
    setSelectedReferees(new Set());
    setReferralNote('');
    setReferralDialogOpen(true);
  };

  const toggleReferee = (profileId: string) => {
    setSelectedReferees((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const handleReferralSubmit = async () => {
    if (!profile || !meeting) return;
    if (selectedReferees.size === 0) {
      toast.error('حداقل یک نفر را انتخاب کنید');
      return;
    }
    setReferralSaving(true);
    try {
      const myName = fullName(profile.firstName, profile.lastName, 'کاربر');
      const promises = Array.from(selectedReferees).map((refId) =>
        createData<MeetingReferral>('meeting_referrals', {
          meetingId: meeting.id,
          referredToProfileId: refId,
          referredByProfileId: profile.id,
          status: 'active',
          note: referralNote || null,
        })
      );
      await Promise.all(promises);

      try {
        const notifPromises = Array.from(selectedReferees).map((refId) =>
          createData('notifications', {
            profileId: refId,
            title: 'ارجاع جلسه به شما',
            body: `جلسه «${meeting.title}» توسط ${myName} به شما ارجاع داده شد.`,
            type: 'meeting_referral',
            priority: 'high',
            link: `/dashboard/meetings/${meeting.id}`,
          })
        );
        await Promise.all(notifPromises);
      } catch {}

      toast.success(`جلسه به ${selectedReferees.size.toLocaleString('fa-IR')} نفر ارجاع داده شد`);
      setReferralDialogOpen(false);
      load();
    } catch (error: any) {
      toast.error('ارجاع ناموفق: ' + error.message);
    }
    setReferralSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center" dir="rtl">
        <Calendar className="h-10 w-10 text-slate-300" />
        <strong className="mt-3 text-slate-700">جلسه یافت نشد</strong>
        <Link href="/dashboard/meetings" className="mt-4 text-sm text-sky-600 hover:underline">بازگشت به جلسات</Link>
      </div>
    );
  }

  const st = statusInfo(meeting.status);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6" dir="rtl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-1.5 rounded-full bg-sky-500" />
            <h1 className="text-2xl font-bold text-slate-900">{meeting.title}</h1>
          </div>
          <div className="mt-1 text-sm text-slate-400">
            داشبورد <b>←</b> جلسات <b>←</b> {meeting.title}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/meetings/${meeting.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600">
            <FileText className="h-4 w-4" />
            ویرایش
          </Link>
          <Link href="/dashboard/meetings" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Meeting Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <FileText className="h-5 w-5 text-sky-500" />
              اطلاعات جلسه
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div><span className="text-slate-400 block text-xs">تاریخ</span><span className="font-medium text-slate-700">{formatJalaliDateTime(meeting.date)}</span></div>
              </div>
              {meeting.endTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div><span className="text-slate-400 block text-xs">پایان</span><span className="font-medium text-slate-700">{formatJalaliDateTime(meeting.endTime)}</span></div>
                </div>
              )}
              {meeting.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div><span className="text-slate-400 block text-xs">مکان</span><span className="font-medium text-slate-700">{meeting.location}</span></div>
                </div>
              )}
              {meeting.onlineLink && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-slate-400" />
                  <div><span className="text-slate-400 block text-xs">لینک</span><a href={meeting.onlineLink} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-600 hover:underline">پیوستن به جلسه</a></div>
                </div>
              )}
              {meeting.staffPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div><span className="text-slate-400 block text-xs">شماره پرسنل</span><span className="font-medium text-slate-700" dir="ltr">{meeting.staffPhone}</span></div>
                </div>
              )}
              {meeting.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div><span className="text-slate-400 block text-xs">شماره مشتری</span><span className="font-medium text-slate-700" dir="ltr">{meeting.customerPhone}</span></div>
                </div>
              )}
            </div>
            {meeting.topic && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="text-slate-400 block text-xs mb-1">موضوع</span>
                <span className="text-slate-700">{meeting.topic}</span>
              </div>
            )}
            {meeting.agenda && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="text-slate-400 block text-xs mb-1">دستور جلسه</span>
                <span className="text-slate-700">{meeting.agenda}</span>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-slate-400">وضعیت:</span>
              <Select value={meeting.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[180px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: st.color }} />
                    {st.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {MEETING_STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Images Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <ImageIcon className="h-5 w-5 text-sky-500" />
                تصاویر جلسه ({images.length.toLocaleString('fa-IR')})
              </h2>
              <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                آپلود تصویر
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </div>

            {images.length === 0 ? (
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-12 transition hover:border-sky-300 hover:bg-sky-50/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-8 w-8 text-slate-300" />
                <span className="mt-2 text-sm text-slate-400">برای آپلود تصاویر جلسه اینجا کلیک کنید</span>
                <span className="text-xs text-slate-300">می‌توانید چند تصویر را همزمان انتخاب کنید</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(img.id)}
                    onDragOver={(e) => handleDragOver(e, img.id)}
                    onDrop={() => handleDrop(img.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    className={`group relative overflow-hidden rounded-lg border bg-slate-50 ${dragId === img.id ? 'opacity-50' : ''} ${dragOverId === img.id ? 'border-sky-400 border-2' : 'border-slate-200'}`}
                  >
                    <div className="absolute right-1 top-1 z-10 cursor-grab rounded bg-black/30 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <img src={img.imageUrl} alt={img.fileName || ''} className="h-32 w-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/40 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                      <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-white hover:text-sky-200">مشاهده</a>
                      <button onClick={() => handleDeleteImage(img.id)} className="text-xs text-white hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {images.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">برای تغییر ترتیب تصاویر، آن‌ها را بکشید و رها کنید.</p>
            )}
          </div>

          {/* Outcome Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              نتیجه و صورت‌جلسه
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">نتیجه جلسه</Label>
                <Textarea
                  value={outcomeForm.outcome}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
                  placeholder="نتیجه و تصمیمات جلسه را وارد کنید..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">صورت‌جلسه</Label>
                <Textarea
                  value={outcomeForm.minutes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, minutes: e.target.value })}
                  placeholder="خلاصه بحث‌ها و مباحث مطرح شده..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">فایل‌ها و تصاویر (اختیاری)</Label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-4">
                  <input
                    ref={outcomeFileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    multiple
                    className="hidden"
                    id="detail-outcome-file-input"
                    onChange={(e) => e.target.files && handleOutcomeFileUpload(e.target.files)}
                  />
                  <label htmlFor="detail-outcome-file-input" className="flex cursor-pointer flex-col items-center justify-center gap-1">
                    {uploadingOutcome ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    ) : (
                      <Upload className="h-6 w-6 text-slate-300" />
                    )}
                    <span className="text-sm text-slate-400">برای آپلود فایل یا تصویر کلیک کنید</span>
                    <span className="text-xs text-slate-300">JPG, PNG, PDF, DOC و ...</span>
                  </label>
                </div>
                {outcomeFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {outcomeFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                        {f.type.startsWith('image/') ? (
                          <img src={f.url} alt={f.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <FileText className="h-5 w-5 text-slate-400" />
                        )}
                        <span className="flex-1 truncate text-sm text-slate-700">{f.name}</span>
                        <span className="text-xs text-slate-400">{formatFileSize(f.size)}</span>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          onClick={() => setOutcomeFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleOutcomeSave} disabled={savingOutcome || uploadingOutcome}>
                {savingOutcome ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                ذخیره نتیجه
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
              <Users className="h-5 w-5 text-sky-500" />
              شرکت‌کنندگان
            </h2>
            {participants.length === 0 ? (
              <p className="text-sm text-slate-400">شرکت‌کننده‌ای ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600">
                      {(p.firstName?.[0] || '') + (p.lastName?.[0] || '')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-700">{fullName(p.firstName, p.lastName)}</div>
                      {p.position && <div className="truncate text-xs text-slate-400">{p.position}</div>}
                    </div>
                    {meeting.mainResponsibleId === p.id && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600">مسئول اصلی</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Referrals Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <Forward className="h-5 w-5 text-sky-500" />
                ارجاع‌ها ({referrals.length.toLocaleString('fa-IR')})
              </h2>
              <Button type="button" size="sm" variant="outline" onClick={openReferralDialog}>
                <Forward className="h-4 w-4" />
                ارجاع جدید
              </Button>
            </div>
            {referrals.length === 0 ? (
              <p className="text-sm text-slate-400">هنوز ارجاعی ثبت نشده است</p>
            ) : (
              <div className="space-y-2">
                {referrals.map((r) => {
                  const refProfile = staff.find((s) => s.id === r.referredToProfileId);
                  const byProfile = staff.find((s) => s.id === r.referredByProfileId);
                  return (
                    <div key={r.id} className="rounded-lg border border-slate-100 p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600">
                          {refProfile ? ((refProfile.firstName?.[0] || '') + (refProfile.lastName?.[0] || '')) : '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-700">
                            {refProfile ? fullName(refProfile.firstName, refProfile.lastName) : 'کاربر حذف شده'}
                          </div>
                          {byProfile && (
                            <div className="truncate text-xs text-slate-400">
                              ارجاع توسط: {fullName(byProfile.firstName, byProfile.lastName)}
                            </div>
                          )}
                        </div>
                      </div>
                      {r.note && (
                        <div className="mt-1.5 rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">{r.note}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div className="rounded-xl border border-red-100 bg-red-50/30 p-5">
              <h2 className="mb-3 font-bold text-slate-900">عملیات مدیریت</h2>
              <button
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white py-2 text-sm font-medium text-red-500 transition hover:bg-red-50"
                onClick={async () => {
                  if (!confirm('حذف این جلسه؟')) return;
                  try {
                    await deleteData('meetings', { id: meeting.id });
                    toast.success('جلسه حذف شد');
                    router.push('/dashboard/meetings');
                  } catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
                }}
              >
                <Trash2 className="h-4 w-4" />
                حذف جلسه
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Referral Dialog */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ارجاع جلسه</DialogTitle>
          </DialogHeader>
          {meeting && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                جلسه «{meeting.title}» به افراد انتخاب‌شده ارجاع داده می‌شود و برای هر کدام اعلان درون‌سیستمی ارسال می‌شود.
              </p>
              <div>
                <Label className="mb-2 block text-sm font-medium text-slate-700">انتخاب افراد</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {staff.length === 0 && (
                    <p className="text-xs text-slate-400">هیچ کارمندی موجود نیست</p>
                  )}
                  {staff.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-slate-50">
                      <Checkbox
                        checked={selectedReferees.has(s.id)}
                        onCheckedChange={() => toggleReferee(s.id)}
                      />
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-[10px] font-bold text-sky-600">
                        {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
                      </div>
                      <span className="text-sm text-slate-700">{fullName(s.firstName, s.lastName)}</span>
                      {s.position && <span className="text-xs text-slate-400">— {s.position}</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">یادداشت ارجاع (اختیاری)</Label>
                <Textarea value={referralNote} onChange={(e) => setReferralNote(e.target.value)} placeholder="توضیحات مربوط به این ارجاع..." rows={2} />
              </div>
              <Button type="button" onClick={handleReferralSubmit} disabled={referralSaving} className="w-full">
                {referralSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {referralSaving ? 'در حال ارجاع...' : 'ثبت ارجاع'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
