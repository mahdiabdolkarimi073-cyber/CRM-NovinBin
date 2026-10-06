'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare, Plus, Search, Calendar, Clock, Trash2, Edit,
  MessageSquare, Send, Forward, Inbox, CheckCircle2,
  XCircle, PlayCircle, LayoutGrid, List, Flag, X, Loader2,
} from 'lucide-react';
import { formatJalali, relativeTime, toLocalDateString } from '@/lib/format';
import { TASK_STATUSES, TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Task, Profile } from '@/lib/types';

// اگر این کامپوننت را دارید، مسیر import را درست کنید:
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';

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
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterCreator, setFilterCreator] = useState('all');
  const [filterDueDate, setFilterDueDate] = useState('all');
  const [visibleCount, setVisibleCount] = useState(5);
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
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [lastSeenComments, setLastSeenComments] = useState<Record<string, number>>({});

  const isSuperAdmin = profile?.role === 'super_admin';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = isSuperAdmin ? {} : { OR: [{ assignedTo: profile.id }, { createdBy: profile.id }] };
      const [taskData, staffData, allStaffData, mgrData] = await Promise.all([
        fetchData('tasks', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('profiles', { where: { role: 'personnel' } }),
        fetchData('profiles', { where: { role: { in: ['admin', 'personnel', 'super_admin'] } } }),
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
  }, [profile, isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setVisibleCount(5); }, [search, filterPriority, filterStatus, filterAssignee, filterCreator, filterDueDate, activeTab]);

  useEffect(() => {
    try { const stored = localStorage.getItem('task_comment_last_seen'); if (stored) setLastSeenComments(JSON.parse(stored)); } catch {}
  }, []);

  useEffect(() => {
    if (!profile || tasks.length === 0) return;
    const taskIds = tasks.map((t) => t.id);
    fetchData<any>('task_comments', { where: { taskId: { in: taskIds } }, orderBy: { createdAt: 'asc' } })
      .then((data) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((c) => { counts[c.taskId] = (counts[c.taskId] || 0) + 1; });
        setCommentCounts(counts);
      })
      .catch(() => {});
  }, [profile, tasks]);

  const loadComments = async (taskId: string) => {
    try {
      const data = await fetchData<any>('task_comments', { where: { taskId }, orderBy: { createdAt: 'asc' } });
      setComments(data || []);
      const newLastSeen = { ...lastSeenComments, [taskId]: data ? data.length : 0 };
      setLastSeenComments(newLastSeen);
      try { localStorage.setItem('task_comment_last_seen', JSON.stringify(newLastSeen)); } catch {}
    } catch { setComments([]); }
  };

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const staffName = (id: string | null) => {
      if (!id) return '';
      const s = allStaff.find((p) => p.id === id);
      return s ? fullName(s.firstName, s.lastName).toLocaleLowerCase() : '';
    };
    return tasks.filter((task) => {
      const assignee = staffName(task.assignedTo);
      const creator = staffName(task.createdBy);
      const priority = priorityInfo(task.priority).label.toLocaleLowerCase();
      const status = statusInfo(task.status).label.toLocaleLowerCase();
      const searchable = [task.title, task.description || '', assignee, creator, priority, status].join(' ').toLocaleLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesAssignee = filterAssignee === 'all' || task.assignedTo === filterAssignee;
      const matchesCreator = filterCreator === 'all' || task.createdBy === filterCreator;
      const due = task.dueDate ? new Date(task.dueDate) : null;
      const matchesDueDate = filterDueDate === 'all'
        || (filterDueDate === 'no_due' && !due)
        || (filterDueDate === 'overdue' && due && due < today && task.status !== 'completed')
        || (filterDueDate === 'upcoming' && due && due >= today && task.status !== 'completed');
      return matchesQuery && matchesPriority && matchesStatus && matchesAssignee && matchesCreator && matchesDueDate;
    });
  }, [tasks, search, filterPriority, filterStatus, filterAssignee, filterCreator, filterDueDate, allStaff]);

  const { myTasks, referredTasks } = useMemo(() => {
    if (!profile) return { myTasks: [], referredTasks: [] };
    const mine: Task[] = []; const referred: Task[] = [];
    filteredTasks.forEach((t) => { if (t.referredDate && t.createdBy !== profile.id) referred.push(t); else mine.push(t); });
    return { myTasks: mine, referredTasks: referred };
  }, [filteredTasks, profile]);

  const displayTasks = activeTab === 'referrals' ? referredTasks : myTasks;
  const referOptions = useMemo(() => allStaff.filter((s) => s.id !== profile?.id), [allStaff, profile]);
 = async (taskId: string) => {
    try { await deleteData('tasks', { id: taskId }); toast.success('وظیفه حذف شد'); setDetailTask(null); loadData(); }
    catch (error: any) { toast.error('حذف ناموفق: ' + error.message); }
  };

  const handleAddComment = async () => {
    if (!detailTask || !newComment.trim() || !profile) return;
    setCommentLoading(true);
    try {
      await createData('task_comments', { taskId: detailTask.id, profileId: profile.id, content: newComment.trim() });
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];
      const recipients = new Set<string>();
      if (detailTask.assignedTo && detailTask.assignedTo !== profile.id) recipients.add(detailTask.assignedTo);
      if (detailTask.createdBy && detailTask.createdBy !== profile.id) recipients.add(detailTask.createdBy);
      allStaff.filter((s) => s.role === 'super_admin').forEach((a) => { if (a.id !== profile.id) recipients.add(a.id); });
      recipients.forEach((rid) => {
        notifPromises.push(
          createData('notifications', {
            profileId: rid,
            title: 'نظر جدید روی وظیفه',
            body: `${myName} روی وظیفه «${detailTask.title}» نظر جدیدی ثبت کرد: ${newComment.trim().slice(0, 80)}`,
            type: 'task',
            priority: 'normal',
            link: '/dashboard/tasks',
          }).catch(() => {})
        );
      });
      await Promise.all(notifPromises);
      setNewComment(''); loadComments(detailTask.id);
    }
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

  const openDetail = (task: Task) => { setDetailTask(task); loadComments(task.id); };

  const handleRefer = async () => {
    if (!referTargetId || referTo === 'none' || !profile) return;
    try {
      await updateData('tasks', { id: referTargetId }, { assignedTo: referTo, referredDate: new Date().toISOString() });
      const targetTask = tasks.find((t) => t.id === referTargetId);
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [
        createData('notifications', { profileId: referTo, title: 'وظیفه‌ای به شما ارجاع داده شد', body: `${myName} یک وظیفه${targetTask ? ` «${targetTask.title}»` : ''} را به شما ارجاع داد`, type: 'task', priority: 'normal', link: '/dashboard/tasks' }).catch(() => {}),
      ];
      allStaff.filter((s) => s.role === 'super_admin' && s.id !== profile.id && s.id !== referTo).forEach((admin) => {
        notifPromises.push(
          createData('notifications', { profileId: admin.id, title: 'وظیفه‌ای ارجاع داده شد', body: `${myName} یک وظیفه${targetTask ? ` «${targetTask.title}»` : ''} را به ${fullName(allStaff.find((s) => s.id === referTo)?.firstName, allStaff.find((s) => s.id === referTo)?.lastName) || 'فردی'} ارجاع داد`, type: 'task', priority: 'normal', link: '/dashboard/tasks' }).catch(() => {})
        );
      });
      await Promise.all(notifPromises);
      toast.success('وظیفه ارجاع داده شد'); setReferOpen(false); setReferTargetId(null); setReferTo('none'); loadData();
    } catch (error: any) { toast.error('ارجاع ناموفق: ' + error.message); }
  };

  const openRefer = (taskId: string) => { if (referOptions.length === 0) { toast.error('شما نمی‌توانید وظیفه‌ای را ارجاع دهید'); return; } setReferTargetId(taskId); setReferTo('none'); setReferOpen(true); };

  const getStaffName = (id: string | null) => { if (!id) return null; const s = allStaff.find((p) => p.id === id); return s ? fullName(s.firstName, s.lastName) : null; };
  const canEdit = (task?: Task) => isSuperAdmin && (!task || task.status !== 'completed');
  const canDelete = (task?: Task) => isSuperAdmin && (!task || task.status !== 'completed');
  const canDrag = (task: Task) => {
    if (task.status === 'completed' && !isSuperAdmin) return false;
    return true;
  };
  const canRefer = referOptions.length > 0;

  const stats = useMemo(() => [
    {
      label: 'کل وظایف', value: tasks.length, icon: CheckSquare,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'در حال انجام', value: tasks.filter((t) => t.status === 'in_progress').length, icon: PlayCircle,
      filter: 'in_progress',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'تکمیل شده', value: tasks.filter((t) => t.status === 'completed').length, icon: CheckCircle2,
      filter: 'completed',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'لغو شده', value: tasks.filter((t) => t.status === 'cancelled').length, icon: XCircle,
      filter: 'cancelled',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ], [tasks]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const hasUnreadComments = (taskId: string) => {
    const count = commentCounts[taskId] || 0;
    const lastSeen = lastSeenComments[taskId] || 0;
    return count > lastSeen;
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const pr = priorityInfo(task.priority);
    const assignee = getStaffName(task.assignedTo);
    const creator = getStaffName(task.createdBy || null);
    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isReferred = !!task.referredDate;
    const cCount = commentCounts[task.id] || 0;
    const unread = hasUnreadComments(task.id);
    const stColor = statusInfo(task.status).color;
    return (
      <div draggable={canDrag(task)} onDragStart={() => canDrag(task) && setDragId(task.id)} onDragEnd={() => { setDragId(null); setDragOver(null); }} onClick={() => openDetail(task)}
        className={`nb-card cursor-grab active:cursor-grabbing ${dragId === task.id ? 'opacity-50' : ''} ${isReferred ? 'border-amber-200' : ''} ${unread ? 'ring-2 ring-sky-400/50' : ''}`}
        style={{ borderBottomColor: stColor, borderBottomWidth: 3 }}>
        <div className="nb-card-top">
          <div className="nb-card-tags">
            <span className="nb-card-tag" style={{ background: `${pr.color}15`, color: pr.color }}>
              {pr.label}
            </span>
            {isReferred && <span className="nb-card-tag" style={{ background: 'rgba(245,158,11,.12)', color: '#f59e0b' }}><Forward className="h-2.5 w-2.5" /> ارجاعی</span>}
          </div>
          {cCount > 0 && (
            <span className={`flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${unread ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`} title={unread ? 'نظرات جدید' : 'نظرات'}>
              <MessageSquare className="h-2.5 w-2.5" />{cCount.toLocaleString('fa-IR')}
            </span>
          )}
        </div>
        <h3 className="nb-card-title">{task.title}</h3>
        {task.description && <p className="nb-card-excerpt">{task.description}</p>}
        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {task.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className={overdue ? 'font-medium text-red-500' : ''}>موعد: {formatJalali(task.dueDate)}</span>
            </div>
          )}
          {creator && activeTab === 'referrals' && (
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-slate-400">از:</span>
              <span>{creator}</span>
            </div>
          )}
        </div>
        <div className="nb-card-footer">
          <div className="nb-card-date">
            <Clock className="h-3 w-3" />
            {relativeTime(task.createdAt)}
          </div>
          <div className="nb-card-quick">
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{assignee[0]}</AvatarFallback></Avatar>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{assignee}</span>
              </div>
            ) : unread ? <span className="flex items-center gap-1 text-[10px] font-medium text-sky-600"><span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />نظر جدید</span> : <Flag className="h-3.5 w-3.5 text-slate-400" />}
            {canEdit(task) && <Link href={`/dashboard/tasks/${task.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-slate-400 transition-colors hover:text-blue-600" title="ویرایش"><Edit className="h-3.5 w-3.5" /></Link>}
          </div>
        </div>
      </div>
    );
  };

  const renderBoard = (taskList: Task[]) => (
    <div className="w-full overflow-hidden pb-4">
      <div className="grid w-full grid-cols-1 gap-3 mobile:grid-cols-2 tablet:grid-cols-4 tablet:gap-4">
        {[...TASK_STATUSES].reverse().map((stage) => {
          const items = taskList.filter((t) => t.status === stage.key);
          const visibleItems = items.slice(0, visibleCount);
          return (
            <div key={stage.key} className={`min-w-0 w-full overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50 transition-all dark:border-slate-700 dark:bg-slate-800/50 ${dragOver === stage.key ? 'ring-2 ring-blue-500/40' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop(stage.key)}>
              <div className="flex h-[52px] items-center justify-between border-b-[3px] bg-white px-4 dark:bg-slate-800" style={{ borderColor: stage.color }}>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><span className="text-sm font-bold text-slate-800 dark:text-slate-200">{stage.label}</span></div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">{items.length.toLocaleString('fa-IR')}</span>
              </div>
              <div className="min-h-[400px] space-y-2.5 p-2.5">
                {[...visibleItems].sort((a, b) => (hasUnreadComments(b.id) ? 1 : 0) - (hasUnreadComments(a.id) ? 1 : 0)).map((task) => <TaskCard key={task.id} task={task} />)}
                {items.length === 0 && <div className="py-8 text-center text-xs text-slate-300 dark:text-slate-600">کارت اینجا رها کنید</div>}
                {items.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 5)} className="w-full rounded-lg py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">نمایش ۵ مورد دیگر</button>}
              </div>
              <Link href="/dashboard/tasks/new" className="flex h-[44px] w-full items-center justify-center gap-1 border-t border-slate-200 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700/50"><Plus className="h-3.5 w-3.5" /> افزودن وظیفه</Link>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderList = (taskList: Task[]) => {
    const sorted = [...taskList].sort((a, b) => {
      const au = hasUnreadComments(a.id) ? 1 : 0;
      const bu = hasUnreadComments(b.id) ? 1 : 0;
      if (au !== bu) return bu - au;
      return 0;
    });
    const visibleItems = sorted.slice(0, visibleCount);
    return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
            <tr>
              <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عنوان</th>
              <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">اولویت</th>
              <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">موعد</th>
              <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
              <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مسئول</th>
              <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {visibleItems.map((task) => {
              const st = statusInfo(task.status); const pr = priorityInfo(task.priority);
              const assignee = getStaffName(task.assignedTo);
              const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
              const cCount = commentCounts[task.id] || 0;
              const unread = hasUnreadComments(task.id);
              return (
                <tr key={task.id} className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${unread ? 'bg-sky-50/40' : ''}`} onClick={() => openDetail(task)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {unread && <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-sky-500" title="نظر جدید" />}
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-100">{task.title}</div>
                        {cCount > 0 && <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${unread ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}><MessageSquare className="h-2 w-2" />{cCount.toLocaleString('fa-IR')}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}35` }} className="text-xs">{pr.label}</Badge></td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                    {task.dueDate ? <span className={`flex items-center gap-1 ${overdue ? 'font-medium text-red-500' : ''}`}><Clock className="h-3 w-3" />{formatJalali(task.dueDate)}</span> : '—'}
                  </td>
                  <td className="p-3"><Badge style={{ backgroundColor: `${st.color}15`, color: st.color }} className="rounded-full text-xs">{st.label}</Badge></td>
                  <td className="p-3">
                    {assignee ? <div className="flex items-center gap-1.5"><Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{assignee[0]}</AvatarFallback></Avatar><span className="text-xs text-slate-500 dark:text-slate-400">{assignee}</span></div> : '—'}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {canRefer && <button onClick={() => openRefer(task.id)} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-500" title="ارجاع"><Forward className="h-4 w-4" /></button>}
                      {canEdit(task) && <Link href={`/dashboard/tasks/${task.id}/edit`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش"><Edit className="h-4 w-4" /></Link>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > visibleCount && <button type="button" onClick={() => setVisibleCount((c) => c + 5)} className="w-full py-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">نمایش ۵ مورد دیگر</button>}
    </div>
  );}

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری وظایف...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>وظایف</h1>
            </div>
            <p>مدیریت وظایف، ارجاعات و نظرات</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/tasks/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            وظیفه جدید
          </Link>
        </div>
      </header>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="nb-toolbar">
          <div className="nb-toolbar-left">
            <h2>همه وظایف</h2>
            <span className="nb-count-badge">{displayTasks.length.toLocaleString('fa-IR')} مورد</span>
          </div>
          <div className="nb-toolbar-right">
            <div className="nb-search-box">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی وظیفه..."
              />
              {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="nb-select-filter h-10 w-[140px]">
                <SelectValue placeholder="اولویت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه اولویت‌ها</SelectItem>
                {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
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

        <TabsList className="mb-4">
          <TabsTrigger value="tasks"><CheckSquare className="w-4 h-4 ml-1" />تسک‌ها <Badge variant="secondary" className="mr-1 text-xs">{myTasks.length.toLocaleString('fa-IR')}</Badge></TabsTrigger>
          <TabsTrigger value="referrals"><Inbox className="w-4 h-4 ml-1" />ارجاعات <Badge variant="secondary" className="mr-1 text-xs">{referredTasks.length.toLocaleString('fa-IR')}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          {myTasks.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><CheckSquare className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>تسکی وجود ندارد</h3>
              <p>تسک‌هایی که ایجاد کرده‌اید یا به شما اختصاص داده شده اینجا نمایش داده می‌شوند</p>
              <Link href="/dashboard/tasks/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن وظیفه</Link>
            </div>
          ) : viewMode === 'board' ? renderBoard(myTasks) : renderList(myTasks)}
        </TabsContent>
        <TabsContent value="referrals">
          {referredTasks.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Inbox className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>ارجاعی وجود ندارد</h3>
              <p>تسک‌هایی که دیگران به شما ارجاع داده‌اند اینجا نمایش داده می‌شوند</p>
            </div>
          ) : viewMode === 'board' ? renderBoard(referredTasks) : renderList(referredTasks)}
        </TabsContent>
      </Tabs>

      <Link href="/dashboard/tasks/new" className="nb-fab" aria-label="وظیفه جدید">
        <Plus className="h-6 w-6" />
      </Link>

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
                  {detailTask.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detailTask.description}</p></div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {assignee && <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{assignee[0]}</AvatarFallback></Avatar><div><div className="text-xs text-slate-400">مسئول</div><div className="text-sm text-slate-700 dark:text-slate-200">{assignee}</div></div></div>}
                    {creator && <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-slate-100 text-[10px] text-slate-600">{creator[0]}</AvatarFallback></Avatar><div><div className="text-xs text-slate-400">ایجادکننده</div><div className="text-sm text-slate-700 dark:text-slate-200">{creator}</div></div></div>}
                  </div>
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">نظرات و ارجاعات</h4><Badge variant="secondary" className="text-xs">{comments.length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                      {comments.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">هنوز نظری ثبت نشده است</p>
                      : comments.map((c) => { const author = getStaffName(c.profileId); return (
                        <div key={c.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="bg-slate-200 text-[10px] text-slate-600">{author?.[0] || '؟'}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-700 dark:text-slate-200">{author || 'کاربر'}</span><span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span></div><p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{c.content}</p></div></div>
                      ); })}
                    </div>
                    <div className="flex items-center gap-2"><Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="نظر یا ارجاع بنویسید..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} /><Button size="sm" onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}><Send className="h-3.5 w-3.5" /></Button></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canRefer && <Button variant="outline" className="flex-1" onClick={() => { setDetailTask(null); openRefer(detailTask.id); }}><Forward className="h-4 w-4" /> ارجاع وظیفه</Button>}
                    {canEdit(detailTask) && <Link href={`/dashboard/tasks/${detailTask.id}/edit`} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 flex-1"><Edit className="h-4 w-4" /> ویرایش وظیفه</Link>}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={referOpen} onOpenChange={setReferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ارجاع وظیفه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">می‌توانید این وظیفه را به هر کاربری ارجاع دهید.</p>
            <div className="space-y-2"><Label>ارجاع به</Label>
              <Select value={referTo} onValueChange={setReferTo}>
                <SelectTrigger><SelectValue placeholder="انتخاب کاربر..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">انتخاب کنید...</SelectItem>{referOptions.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}{s.role === 'admin' || s.role === 'super_admin' ? ` (${s.role === 'super_admin' ? 'سوپرادمین' : 'مدیر'})` : ' (پرسنل)'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setReferOpen(false)}>انصراف</Button><Button onClick={handleRefer} disabled={referTo === 'none'}><Forward className="h-4 w-4" /> ارجاع</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}