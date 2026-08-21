'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare, Plus, Search, Calendar, GripVertical, Clock, Trash2, Edit,
  MessageSquare, Send, Forward, Inbox, BarChart3, Circle, CheckCircle2,
  XCircle, PlayCircle, Eye, LayoutGrid, Filter, Flag, Bookmark, ChevronDown,
} from 'lucide-react';
import { formatJalali, relativeTime, toLocalDateString } from '@/lib/format';
import { TASK_STATUSES, TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Task, Profile } from '@/lib/types';

const statusInfo = (key: string) => TASK_STATUSES.find((s) => s.key === key) || TASK_STATUSES[0];
const priorityInfo = (key: string) => TASK_PRIORITIES.find((p) => p.key === key) || TASK_PRIORITIES[0];

interface UserManagerRow { id: string; userId: string; managerId: string; createdAt: string; }

export default function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [allStaff, setAllStaff] = useState<Profile[]>([]);
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [referOpen, setReferOpen] = useState(false);
  const [referTargetId, setReferTargetId] = useState<string | null>(null);
  const [referTo, setReferTo] = useState('none');
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = isSuperAdmin ? {} : { OR: [{ assignedTo: profile.id }, { createdBy: profile.id }] };
      if (search) where.title = { contains: search, mode: 'insensitive' };
      if (filterPriority !== 'all') where.priority = filterPriority;
      const [taskData, staffData, allStaffData, mgrData] = await Promise.all([
        fetchData('tasks', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('profiles', { where: { role: 'personnel' } }),
        fetchData('profiles', { where: { role: { in: ['admin', 'personnel', 'owner', 'super_admin'] } } }),
        fetchData<UserManagerRow>('user_manager', {}),
      ]);
      const mMap: Record<string, string> = {};
      (mgrData as UserManagerRow[]).forEach((m) => { mMap[m.userId] = m.managerId; });
      setTasks((taskData as Task[]) || []);
      setStaff((staffData as Profile[]) || []);
      setAllStaff((allStaffData as Profile[]) || []);
      setManagerMap(mMap);
    } catch (error: any) { toast.error('بارگذاری وظایف ناموفق: ' + error.message); }
    setLoading(false);
  }, [profile, isSuperAdmin, search, filterPriority]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadComments = async (taskId: string) => {
    try { const data = await fetchData<any>('task_comments', { where: { taskId }, orderBy: { createdAt: 'asc' } }); setComments(data || []); }
    catch { setComments([]); }
  };

  const { myTasks, referredTasks } = useMemo(() => {
    if (!profile) return { myTasks: [], referredTasks: [] };
    const mine: Task[] = []; const referred: Task[] = [];
    tasks.forEach((t) => { if (t.referredDate && t.createdBy !== profile.id) referred.push(t); else mine.push(t); });
    return { myTasks: mine, referredTasks: referred };
  }, [tasks, profile]);

  const displayTasks = activeTab === 'referrals' ? referredTasks : myTasks;
  const referOptions = useMemo(() => allStaff.filter((s) => s.id !== profile?.id), [allStaff, profile]);
  const assigneeOptions = allStaff;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.title) { toast.error('عنوان وظیفه را وارد کنید'); return; }
    setCreating(true);
    try {
      await createData('tasks', { title: form.title, description: form.description || null, assignedTo: form.assignedTo || null, priority: form.priority, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null, status: 'new', createdBy: profile.id });
      if (form.assignedTo && form.assignedTo !== profile.id) {
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        try { await createData('notifications', { profileId: form.assignedTo, title: 'وظیفه جدید به شما اختصاص داده شد', body: `یک تسک «${form.title}» توسط ${myName} به شما اختصاص داده شد`, type: 'task', priority: form.priority === 'urgent' ? 'urgent' : 'normal', link: '/dashboard/tasks' }); } catch {}
      }
      toast.success('وظیفه ایجاد شد');
      setDialogOpen(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      loadData();
    } catch (error: any) { toast.error('ایجاد ناموفق: ' + error.message); }
    setCreating(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await updateData('tasks', { id: editingTask.id }, { title: form.title, description: form.description || null, assignedTo: form.assignedTo || null, priority: form.priority, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null });
      toast.success('وظیفه ویرایش شد'); setEditingTask(null); setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' }); loadData();
    } catch (error: any) { toast.error('ویرایش ناموفق: ' + error.message); }
  };

  const handleDelete = async (taskId: string) => {
    try { await deleteData('tasks', { id: taskId }); toast.success('وظیفه حذف شد'); setDetailTask(null); loadData(); }
    catch (error: any) { toast.error('حذف ناموفق: ' + error.message); }
  };

  const handleAddComment = async () => {
    if (!detailTask || !newComment.trim() || !profile) return;
    setCommentLoading(true);
    try { await createData('task_comments', { taskId: detailTask.id, profileId: profile.id, content: newComment.trim() }); setNewComment(''); loadComments(detailTask.id); }
    catch (error: any) { toast.error('ثبت نظر ناموفق: ' + error.message); }
    setCommentLoading(false);
  };

  const handleDrop = async (status: string) => {
    if (!dragId) return;
    setDragOver(null); setDragId(null);
    const task = displayTasks.find((t) => t.id === dragId);
    if (!task || task.status === status) return;
    const updates: any = { status };
    if (status === 'completed') updates.completedAt = new Date().toISOString();
    try { await updateData('tasks', { id: dragId }, updates); loadData(); }
    catch (error: any) { toast.error('تغییر وضعیت ناموفق: ' + error.message); }
  };

  const openEdit = (task: Task) => { setEditingTask(task); setForm({ title: task.title, description: task.description || '', assignedTo: task.assignedTo || '', priority: task.priority, dueDate: task.dueDate ? task.dueDate.split('T')[0] : '' }); };
  const openDetail = (task: Task) => { setDetailTask(task); loadComments(task.id); };

  const handleRefer = async () => {
    if (!referTargetId || referTo === 'none' || !profile) return;
    try {
      await updateData('tasks', { id: referTargetId }, { assignedTo: referTo, referredDate: new Date().toISOString() });
      const targetTask = tasks.find((t) => t.id === referTargetId);
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      try { await createData('notifications', { profileId: referTo, title: 'وظیفه‌ای به شما ارجاع داده شد', body: `${myName} یک وظیفه${targetTask ? ` «${targetTask.title}»` : ''} را به شما ارجاع داد`, type: 'task', priority: 'normal', link: '/dashboard/tasks' }); } catch {}
      toast.success('وظیفه ارجاع داده شد'); setReferOpen(false); setReferTargetId(null); setReferTo('none'); loadData();
    } catch (error: any) { toast.error('ارجاع ناموفق: ' + error.message); }
  };

  const openRefer = (taskId: string) => { if (referOptions.length === 0) { toast.error('شما نمی‌توانید وظیفه‌ای را ارجاع دهید'); return; } setReferTargetId(taskId); setReferTo('none'); setReferOpen(true); };

  const getStaffName = (id: string | null) => { if (!id) return null; const s = allStaff.find((p) => p.id === id); return s ? fullName(s.firstName, s.lastName) : null; };
  const canEdit = (task?: Task) => !task || task.status !== 'completed';
  const canDelete = (task?: Task) => !task || task.status !== 'completed';
  const canRefer = referOptions.length > 0;
  const taskSummary = [...TASK_STATUSES].reverse().map((stage) => ({ ...stage, count: displayTasks.filter((task) => task.status === stage.key).length }));
  const totalTasks = displayTasks.length;

  const TaskCard = ({ task }: { task: Task }) => {
    const pr = priorityInfo(task.priority);
    const assignee = getStaffName(task.assignedTo);
    const creator = getStaffName(task.createdBy || null);
    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isReferred = !!task.referredDate;
    return (
      <div draggable onDragStart={() => setDragId(task.id)} onDragEnd={() => { setDragId(null); setDragOver(null); }} onClick={() => openDetail(task)}
        className={`cursor-grab rounded-[11px] border border-[#E7ECF3] bg-white p-[14px] shadow-[0_2px_8px_rgba(20,40,80,.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(20,40,80,.08)] active:cursor-grabbing ${dragId === task.id ? 'opacity-50' : ''} ${isReferred ? 'border-amber-200 bg-amber-50/30' : ''}`}>
        <div className="mb-2 flex items-start gap-2">
          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-[#98A2B3]" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-7 text-[#1D2939]">{task.title}</div>
            {task.description && <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">{task.description}</div>}
          </div>
          {isReferred && <Badge variant="outline" className="shrink-0 border-amber-300 text-[10px] text-amber-600"><Forward className="ml-1 h-3 w-3" />ارجاعی</Badge>}
          {canEdit(task) && <button onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="text-[#98A2B3] transition-colors hover:text-[#2563EB]"><Edit className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}35`, backgroundColor: `${pr.color}10` }} className="rounded-full border px-2 py-1 text-[10px] font-semibold">{pr.label}</Badge>
          {task.dueDate && <span className={`flex items-center gap-1 text-[11px] ${overdue ? 'font-medium text-red-500' : 'text-[#8490A5]'}`}><Calendar className="h-3.5 w-3.5" />{formatJalali(task.dueDate)}</span>}
          {creator && activeTab === 'referrals' && <span className="text-[11px] text-[#98A2B3]">از: {creator}</span>}
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#EEF1F5] pt-2.5">
          {assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6"><AvatarFallback className="bg-[#EFF4FF] text-[10px] text-[#2563EB]">{assignee[0]}</AvatarFallback></Avatar>
              <span className="text-[11px] text-[#667085]">{assignee}</span>
            </div>
          ) : <span />}
          <Flag className="h-3.5 w-3.5 text-[#98A2B3]" />
        </div>
      </div>
    );
  };

  const renderForm = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleEdit : handleCreate} className="space-y-4">
      <div className="space-y-2"><Label>عنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
      <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>مسئول انجام</Label>
          <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="انتخاب..." /></SelectTrigger>
            <SelectContent><SelectItem value="none">بدون تخصیص</SelectItem>{assigneeOptions.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>اولویت</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>موعد انجام</Label><JalaliDatePicker value={form.dueDate ? new Date(form.dueDate) : null} onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })} /></div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { if (isEdit) setEditingTask(null); else setDialogOpen(false); }}>انصراف</Button>
        <Button type="submit" disabled={creating}>{isEdit ? 'ذخیره تغییرات' : creating ? 'در حال ایجاد...' : 'ایجاد'}</Button>
      </DialogFooter>
    </form>
  );

  const renderBoard = (taskList: Task[]) => (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        {[...TASK_STATUSES].reverse().map((stage) => {
          const items = taskList.filter((t) => t.status === stage.key);
          return (
            <div key={stage.key} className={`w-[240px] shrink-0 overflow-hidden rounded-[14px] border border-[#E6EBF2] bg-[#F8FAFD] transition-all ${dragOver === stage.key ? 'ring-2 ring-[#2563EB]/40' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop(stage.key)}>
              <div className="flex h-[52px] items-center justify-between border-b-[3px] bg-white px-4" style={{ borderColor: stage.color }}>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><span className="text-sm font-bold text-[#1D2939]">{stage.label}</span></div>
                <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#667085]">{items.length.toLocaleString('fa-IR')}</span>
              </div>
              <div className="min-h-[400px] space-y-2.5 p-2.5">
                {items.map((task) => <TaskCard key={task.id} task={task} />)}
                {items.length === 0 && <div className="py-8 text-center text-xs text-[#CBD5E1]">کارت اینجا رها کنید</div>}
              </div>
              <button className="flex h-[44px] w-full items-center justify-center gap-1 border-t border-[#E8EDF4] text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F1F5F9]"><Plus className="h-3.5 w-3.5" /> افزودن وظیفه</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderList = (taskList: Task[]) => (
    <Card><CardContent className="p-0">
      <div className="divide-y divide-[#F1F5F9]">
        {taskList.map((task) => {
          const st = statusInfo(task.status); const pr = priorityInfo(task.priority);
          const assignee = getStaffName(task.assignedTo); const creator = getStaffName(task.createdBy || null);
          const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
          return (
            <div key={task.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => openDetail(task)}>
              <div className="h-10 w-2 rounded-full" style={{ backgroundColor: st.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-[#1D2939]">{task.title}</div>
                <div className="mt-1 flex items-center gap-3">
                  <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}35` }} className="text-xs">{pr.label}</Badge>
                  {task.dueDate && <span className={`flex items-center gap-1 text-xs ${overdue ? 'font-medium text-red-500' : 'text-[#98A2B3]'}`}><Clock className="h-3 w-3" />{formatJalali(task.dueDate)}</span>}
                  <span className="text-xs text-[#98A2B3]">{relativeTime(task.createdAt)}</span>
                  {task.referredDate && creator && <span className="text-xs text-amber-500">ارجاع از: {creator}</span>}
                </div>
              </div>
              <Badge style={{ backgroundColor: `${st.color}15`, color: st.color }} className="rounded-full text-xs">{st.label}</Badge>
              {assignee && <div className="hidden items-center gap-1.5 sm:flex"><Avatar className="h-6 w-6"><AvatarFallback className="bg-[#EFF4FF] text-[10px] text-[#2563EB]">{assignee[0]}</AvatarFallback></Avatar><span className="text-xs text-[#667085]">{assignee}</span></div>}
              {canRefer && <button onClick={(e) => { e.stopPropagation(); openRefer(task.id); }} className="p-1 text-[#98A2B3] transition-colors hover:text-amber-500" title="ارجاع"><Forward className="h-4 w-4" /></button>}
              {canEdit(task) && <button onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="p-1 text-[#98A2B3] transition-colors hover:text-[#2563EB]" title="ویرایش"><Edit className="h-4 w-4" /></button>}
            </div>
          );
        })}
      </div>
    </CardContent></Card>
  );

  const sidebarItems = [
    { key: 'all', label: 'همه وظایف', icon: CheckSquare, count: tasks.length },
    { key: 'mine', label: 'وظایف من', icon: CheckSquare, count: myTasks.length },
    { key: 'referrals', label: 'ارجاعات من', icon: Forward, count: referredTasks.length },
    { key: 'favorites', label: 'علاقه‌مندی‌ها', icon: Bookmark, count: 0 },
    { key: 'trash', label: 'سطل زباله', icon: Trash2, count: 0 },
  ];

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">وظایف</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> وظایف</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]"><Calendar className="h-4 w-4" /> این ماه</Button>
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]"><Filter className="h-4 w-4" /> فیلتر پیشرفته</Button>
        </div>
      </header>

      {/* Action buttons */}
      <div className="mb-5 flex flex-wrap gap-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]"><Plus className="h-4 w-4" /> وظیفه جدید</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>ایجاد وظیفه جدید</DialogTitle></DialogHeader>{renderForm(false)}</DialogContent>
        </Dialog>
        <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white px-[18px] text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]"><BarChart3 className="h-4 w-4" /> گزارش سریع</Button>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
        {taskSummary.map((stage) => {
          const Icon = stage.key === 'completed' ? CheckCircle2 : stage.key === 'cancelled' ? XCircle : stage.key === 'in_progress' ? PlayCircle : stage.key === 'review' ? Eye : Circle;
          return (
            <div key={stage.key} className="flex min-h-[150px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
              <div className="flex items-center justify-between">
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full" style={{ color: stage.color, backgroundColor: `${stage.color}15` }}><Icon className="h-5 w-5" strokeWidth={2.5} /></span>
              </div>
              <div>
                <div className="text-[26px] font-bold leading-none text-[#101828]">{stage.count.toLocaleString('fa-IR')}</div>
                <div className="mt-1.5 text-[13px] font-bold text-[#344054]">{stage.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main layout: sidebar + board */}
      <div className="flex flex-col gap-4 xl:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 space-y-4 xl:w-[250px]">
          {/* Quick Access */}
          <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-3 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
            <div className="mb-3 flex items-center gap-2 px-1"><LayoutGrid className="h-4 w-4 text-[#667085]" /><span className="text-sm font-bold text-[#101828]">دسترسی سریع</span></div>
            {sidebarItems.map((item) => (
              <button key={item.key} onClick={() => setActiveTab(item.key === 'referrals' ? 'referrals' : 'tasks')}
                className={`flex h-10 w-full items-center justify-between rounded-[8px] px-2.5 text-sm transition-colors ${activeTab === 'referrals' && item.key === 'referrals' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#344054] hover:bg-[#F1F5F9]'}`}>
                <span className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#667085]">{item.count.toLocaleString('fa-IR')}</span>
              </button>
            ))}
          </div>
          {/* Filters */}
          <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-3 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
            <div className="mb-3 flex items-center gap-2 px-1"><Filter className="h-4 w-4 text-[#667085]" /><span className="text-sm font-bold text-[#101828]">فیلترها</span></div>
            {['وضعیت', 'اولویت', 'تاریخ سررسید', 'برچسب‌ها', 'کاربر مسئول'].map((label) => (
              <button key={label} className="flex h-10 w-full items-center justify-between border-b border-[#F1F5F9] px-1 text-[13px] text-[#344054] last:border-0 hover:text-[#2563EB]">{label}<ChevronDown className="h-3.5 w-3.5 text-[#98A2B3]" /></button>
            ))}
            <button className="mt-2 w-full text-center text-xs font-semibold text-[#EF4444] hover:text-[#DC2626]">پاک کردن فیلترها</button>
          </div>
          {/* Priorities */}
          <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-3 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
            <div className="mb-3 flex items-center gap-2 px-1"><Flag className="h-4 w-4 text-[#667085]" /><span className="text-sm font-bold text-[#101828]">اولویت‌ها</span></div>
            {TASK_PRIORITIES.map((p) => (
              <div key={p.key} className="mb-3 flex items-center justify-between px-1 last:mb-0">
                <span className="flex items-center gap-2 text-[13px] text-[#344054]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />{p.label}</span>
                <span className="text-xs text-[#98A2B3]">{displayTasks.filter((t) => t.priority === p.key).length.toLocaleString('fa-IR')}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main board area */}
        <div className="min-w-0 flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
                <Input placeholder="جستجوی وظیفه..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[250px]" />
              </div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-[42px] w-36 rounded-[10px] border-[#DCE3EE] bg-white text-sm"><SelectValue placeholder="مرتب‌سازی" /></SelectTrigger>
                <SelectContent><SelectItem value="all">همه اولویت‌ها</SelectItem>{TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex h-[42px] items-center rounded-[10px] border border-[#DCE3EE] bg-white p-1 shadow-sm">
              <button onClick={() => setViewMode('board')} className={`flex h-full items-center rounded-[8px] px-3 text-sm font-semibold transition-colors ${viewMode === 'board' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:text-[#344054]'}`}><LayoutGrid className="ml-1 h-4 w-4" /> برد کانبان</button>
              <button onClick={() => setViewMode('list')} className={`flex h-full items-center rounded-[8px] px-3 text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:text-[#344054]'}`}><BarChart3 className="ml-1 h-4 w-4" /> لیست</button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
          ) : tasks.length === 0 ? (
            <Card><EmptyState icon={<CheckSquare className="h-8 w-8" />} title="وظیفه‌ای یافت نشد" description="برای شروع، اولین وظیفه را ایجاد کنید" action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> افزودن وظیفه</Button>} /></Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="tasks" className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> تسک‌ها <Badge variant="secondary" className="mr-1 text-xs">{myTasks.length.toLocaleString('fa-IR')}</Badge></TabsTrigger>
                <TabsTrigger value="referrals" className="flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5" /> ارجاعات <Badge variant="secondary" className="mr-1 text-xs">{referredTasks.length.toLocaleString('fa-IR')}</Badge></TabsTrigger>
              </TabsList>
              <TabsContent value="tasks">
                {myTasks.length === 0 ? <Card><EmptyState icon={<CheckSquare className="h-8 w-8" />} title="تسکی وجود ندارد" description="تسک‌هایی که ایجاد کرده‌اید یا به شما اختصاص داده شده اینجا نمایش داده می‌شوند" /></Card>
                : viewMode === 'board' ? renderBoard(myTasks) : renderList(myTasks)}
              </TabsContent>
              <TabsContent value="referrals">
                {referredTasks.length === 0 ? <Card><EmptyState icon={<Inbox className="h-8 w-8" />} title="ارجاعی وجود ندارد" description="تسک‌هایی که دیگران به شما ارجاع داده‌اند اینجا نمایش داده می‌شوند" /></Card>
                : viewMode === 'board' ? renderBoard(referredTasks) : renderList(referredTasks)}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>ویرایش وظیفه</DialogTitle></DialogHeader>{renderForm(true)}</DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          {detailTask && (() => {
            const st = statusInfo(detailTask.status); const pr = priorityInfo(detailTask.priority);
            const assignee = getStaffName(detailTask.assignedTo); const creator = getStaffName(detailTask.createdBy || null);
            const overdue = detailTask.dueDate && new Date(detailTask.dueDate) < new Date() && detailTask.status !== 'completed';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">{detailTask.title}</DialogTitle>
                    <div className="flex items-center gap-1">
                      {canRefer && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-amber-500 hover:bg-amber-50 hover:text-amber-600" onClick={() => { setDetailTask(null); openRefer(detailTask.id); }}><Forward className="h-4 w-4" /></Button>}
                      {canDelete(detailTask) && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailTask.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${st.color}20`, color: st.color }}>{st.label}</Badge>
                    <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}40` }}>{pr.label}</Badge>
                    {detailTask.referredDate && <Badge variant="outline" className="border-amber-300 text-amber-600"><Forward className="ml-1 h-3 w-3" />ارجاعی</Badge>}
                    {detailTask.dueDate && <span className={`flex items-center gap-1 text-xs ${overdue ? 'font-medium text-red-500' : 'text-slate-400'}`}><Calendar className="h-3 w-3" />موعد: {formatJalali(detailTask.dueDate)}</span>}
                  </div>
                  {detailTask.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailTask.description}</p></div>}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {assignee && <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{assignee[0]}</AvatarFallback></Avatar><div><div className="text-xs text-slate-400">مسئول</div><div className="text-sm text-slate-700">{assignee}</div></div></div>}
                    {creator && <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{creator[0]}</AvatarFallback></Avatar><div><div className="text-xs text-slate-400">ایجادکننده</div><div className="text-sm text-slate-700">{creator}</div></div></div>}
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">نظرات و ارجاعات</h4><Badge variant="secondary" className="text-xs">{comments.length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                      {comments.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">هنوز نظری ثبت نشده است</p>
                      : comments.map((c) => { const author = getStaffName(c.profileId); return (
                        <div key={c.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2"><Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="bg-slate-200 text-[10px] text-slate-600">{author?.[0] || '؟'}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-700">{author || 'کاربر'}</span><span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span></div><p className="mt-0.5 text-sm text-slate-600">{c.content}</p></div></div>
                      ); })}
                    </div>
                    <div className="flex items-center gap-2"><Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="نظر یا ارجاع بنویسید..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} /><Button size="sm" onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}><Send className="h-3.5 w-3.5" /></Button></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canRefer && <Button variant="outline" className="flex-1" onClick={() => { setDetailTask(null); openRefer(detailTask.id); }}><Forward className="h-4 w-4" /> ارجاع وظیفه</Button>}
                    {canEdit(detailTask) && <Button variant="outline" className="flex-1" onClick={() => { setDetailTask(null); openEdit(detailTask); }}><Edit className="h-4 w-4" /> ویرایش وظیفه</Button>}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Refer dialog */}
      <Dialog open={referOpen} onOpenChange={setReferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ارجاع وظیفه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">می‌توانید این وظیفه را به هر کاربری ارجاع دهید.</p>
            <div className="space-y-2"><Label>ارجاع به</Label>
              <Select value={referTo} onValueChange={setReferTo}>
                <SelectTrigger><SelectValue placeholder="انتخاب کاربر..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">انتخاب کنید...</SelectItem>{referOptions.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}{s.role === 'admin' || s.role === 'super_admin' || s.role === 'owner' ? ` (${s.role === 'owner' ? 'مدیر سازمان' : s.role === 'super_admin' ? 'سوپرادمین' : 'مدیر'})` : ' (پرسنل)'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setReferOpen(false)}>انصراف</Button><Button onClick={handleRefer} disabled={referTo === 'none'}><Forward className="h-4 w-4" /> ارجاع</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
