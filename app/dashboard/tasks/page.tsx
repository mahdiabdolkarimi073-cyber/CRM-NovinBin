'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
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
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  CheckSquare, Plus, Search, Calendar, Clock, Edit,
  Forward, Inbox, CheckCircle2,
  XCircle, PlayCircle, LayoutGrid, List, Flag, X, Loader2,
  AlertTriangle, ShieldCheck, ShieldAlert, Eye, Lock,
  RefreshCw, UserCheck, MessageSquare, Send, Check,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, relativeTime, toLocalDateString } from '@/lib/format';
import { TASK_STATUSES, TASK_PRIORITIES, fullName } from '@/lib/constants';
import { isTaskOverdue, getOverdueDelayInfo } from '@/lib/tasks-overdue';
import { toast } from 'sonner';
import type { Task, Profile } from '@/lib/types';

const statusInfo = (key: string) => TASK_STATUSES.find((s) => s.key === key) || TASK_STATUSES[0];
const priorityInfo = (key: string) => TASK_PRIORITIES.find((p) => p.key === key) || TASK_PRIORITIES[0];

interface UserManagerRow { id: string; userId: string; managerId: string; createdAt: string; }

export default function TasksPage() {
  const { profile } = useAuth();
  const router = useRouter();
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
  const [visibleCount, setVisibleCount] = useState(6);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [referOpen, setReferOpen] = useState(false);
  const [referTargetId, setReferTargetId] = useState<string | null>(null);
  const [referTo, setReferTo] = useState('none');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [lastSeenComments, setLastSeenComments] = useState<Record<string, number>>({});

  // SuperAdmin Overdue Management Dialog State
  const [manageOverdueOpen, setManageOverdueOpen] = useState(false);
  const [taskToManage, setTaskToManage] = useState<Task | null>(null);
  const [manageSaving, setManageSaving] = useState(false);
  const [manageForm, setManageForm] = useState({
    dueDate: '',
    dueTime: '',
    assignedTo: 'none',
    status: 'in_progress',
    priority: 'medium',
    adminNote: '',
  });

  // Regular User View Overdue Dialog State
  const [viewOverdueOpen, setViewOverdueOpen] = useState(false);
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [viewComments, setViewComments] = useState<any[]>([]);
  const [newViewComment, setNewViewComment] = useState('');
  const [viewCommentLoading, setViewCommentLoading] = useState(false);

  // Dedicated Overdue Tab Filters & Controls
  const [overdueSearch, setOverdueSearch] = useState('');
  const [overdueFilterPriority, setOverdueFilterPriority] = useState('all');
  const [overdueFilterAssignee, setOverdueFilterAssignee] = useState('all');
  const [overdueFilterDelay, setOverdueFilterDelay] = useState('all');
  const [overdueSort, setOverdueSort] = useState<'delay_desc' | 'due_asc' | 'priority_desc'>('delay_desc');
  const [overdueViewMode, setOverdueViewMode] = useState<'list' | 'board'>('list');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Trigger background sync to keep database updated
      fetch('/api/tasks/sync-overdue', { method: 'POST' }).catch(() => {});

      const where: any = isSuperAdmin ? {} : {
        OR: [
          { assignedTo: profile.id },
          { createdBy: profile.id },
          { assignees: { some: { profileId: profile.id } } },
        ],
      };
      const [taskData, staffData, allStaffData, mgrData] = await Promise.all([
        fetchData('tasks', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('profiles', { where: { role: 'personnel' } }),
        fetchData('profiles', { where: { role: { in: ['admin', 'personnel', 'super_admin', 'owner'] } } }),
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

  useEffect(() => { setVisibleCount(6); }, [search, filterPriority, filterStatus, filterAssignee, filterCreator, filterDueDate, activeTab]);

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

  const getStaffName = (id: string | null) => {
    if (!id) return null;
    const s = allStaff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : null;
  };

  // Segregate Overdue tasks from Active tasks
  const overdueTasksList = useMemo(() => {
    return tasks.filter((t) => isTaskOverdue(t));
  }, [tasks]);

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
    filteredTasks.forEach((t) => {
      // Non-overdue tasks shown in regular tabs
      if (t.referredDate && (t.assignedTo === profile.id || t.createdBy !== profile.id)) {
        referred.push(t);
      } else {
        mine.push(t);
      }
    });
    return { myTasks: mine, referredTasks: referred };
  }, [filteredTasks, profile]);

  // Dedicated filtered list for the Overdue Tab
  const filteredOverdueTasks = useMemo(() => {
    const q = overdueSearch.trim().toLowerCase();
    const now = Date.now();

    const result = overdueTasksList.filter((task) => {
      const assigneeName = getStaffName(task.assignedTo) || '';
      const creatorName = getStaffName(task.createdBy) || '';
      const priorityLabel = priorityInfo(task.priority).label;
      const delayInfo = getOverdueDelayInfo(task.dueDate);
      const text = `${task.title} ${task.description || ''} ${assigneeName} ${creatorName} ${priorityLabel}`.toLowerCase();

      const matchesQ = !q || text.includes(q);
      const matchesPr = overdueFilterPriority === 'all' || task.priority === overdueFilterPriority;
      const matchesAss = overdueFilterAssignee === 'all' || task.assignedTo === overdueFilterAssignee;

      let matchesDelay = true;
      if (overdueFilterDelay !== 'all') {
        const daysOver = delayInfo.days;
        if (overdueFilterDelay === 'week_plus') matchesDelay = daysOver >= 7;
        else if (overdueFilterDelay === 'three_to_seven') matchesDelay = daysOver >= 3 && daysOver < 7;
        else if (overdueFilterDelay === 'under_three') matchesDelay = daysOver < 3;
      }

      return matchesQ && matchesPr && matchesAss && matchesDelay;
    });

    // Sorting
    return result.sort((a, b) => {
      if (overdueSort === 'delay_desc') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return da - db; // Earlier due date means bigger delay
      }
      if (overdueSort === 'due_asc') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return db - da;
      }
      if (overdueSort === 'priority_desc') {
        const pOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return 0;
    });
  }, [overdueTasksList, overdueSearch, overdueFilterPriority, overdueFilterAssignee, overdueFilterDelay, overdueSort, allStaff]);

  const displayTasks = activeTab === 'referrals' ? referredTasks : activeTab === 'overdue' ? filteredOverdueTasks : myTasks;
  const referOptions = useMemo(() => allStaff.filter((s) => s.id !== profile?.id), [allStaff, profile]);

  const canDrag = (task: Task) => {
    // Overdue tasks cannot be dragged by non-superadmins
    if (isTaskOverdue(task) && !isSuperAdmin) return false;
    if (task.status === 'completed' && !isSuperAdmin) return false;
    return true;
  };

  const handleDrop = async (status: string) => {
    if (!dragId) return;
    setDragOver(null); setDragId(null);
    const task = tasks.find((t) => t.id === dragId);
    if (!task || task.status === status) return;

    if (isTaskOverdue(task) && !isSuperAdmin) {
      toast.error('وظیفه به تعویق افتاده است و تغییر وضعیت آن منحصراً توسط سوپرادمین امکان‌پذیر می‌باشد');
      return;
    }

    const updates: any = { status };
    if (status === 'completed') updates.completedAt = new Date().toISOString();
    try {
      await updateData('tasks', { id: dragId }, updates);
      loadData();
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + error.message);
    }
  };

  const handleRefer = async () => {
    if (!referTargetId || referTo === 'none' || !profile) return;
    try {
      await updateData('tasks', { id: referTargetId }, { assignedTo: referTo, referredDate: new Date().toISOString() });
      const targetTask = tasks.find((t) => t.id === referTargetId);
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];
      notifPromises.push(
        createData('notifications', { profileId: referTo, title: 'وظیفه‌ای به شما ارجاع داده شد', body: `${myName} یک وظیفه${targetTask ? ` «${targetTask.title}»` : ''} را به شما ارجاع داد`, type: 'task', priority: 'normal', link: '/dashboard/tasks' }).catch(() => {})
      );
      allStaff.filter((s) => s.role === 'super_admin' && s.id !== profile.id && s.id !== referTo).forEach((admin) => {
        notifPromises.push(
          createData('notifications', { profileId: admin.id, title: 'وظیفه‌ای ارجاع داده شد', body: `${myName} یک وظیفه${targetTask ? ` «${targetTask.title}»` : ''} را به ${fullName(allStaff.find((s) => s.id === referTo)?.firstName, allStaff.find((s) => s.id === referTo)?.lastName) || 'فردی'} ارجاع داد`, type: 'task', priority: 'normal', link: '/dashboard/tasks' }).catch(() => {})
        );
      });
      await Promise.all(notifPromises);
      toast.success('وظیفه ارجاع داده شد'); setReferOpen(false); setReferTargetId(null); setReferTo('none'); loadData();
    } catch (error: any) { toast.error('ارجاع ناموفق: ' + error.message); }
  };

  const openRefer = (taskId: string) => {
    if (referOptions.length === 0) { toast.error('شما نمی‌توانید وظیفه‌ای را ارجاع دهید'); return; }
    setReferTargetId(taskId); setReferTo('none'); setReferOpen(true);
  };

  const navigateToEdit = (taskId: string) => {
    router.push(`/dashboard/tasks/${taskId}/edit`);
  };

  // SuperAdmin Open Overdue Management Dialog
  const openManageOverdue = (task: Task) => {
    setTaskToManage(task);
    let datePart = '';
    let timePart = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      if (!isNaN(d.getTime())) {
        datePart = toLocalDateString(d);
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        if (hrs !== '00' || mins !== '00') {
          timePart = `${hrs}:${mins}`;
        }
      }
    }
    setManageForm({
      dueDate: datePart,
      dueTime: timePart,
      assignedTo: task.assignedTo || 'none',
      status: task.status,
      priority: task.priority || 'medium',
      adminNote: '',
    });
    setManageOverdueOpen(true);
  };

  // Quick Extension Handler (+1 day, +3 days, +1 week)
  const handleQuickExtend = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setManageForm((prev) => ({
      ...prev,
      dueDate: toLocalDateString(d),
      dueTime: '18:00',
      status: 'in_progress', // Auto reset to in_progress to exit overdue!
    }));
    toast.info(`موعد به ${daysToAdd} روز آینده تنظیم و وضعیت به «در حال انجام» تغییر یافت`);
  };

  // Save SuperAdmin Management Action
  const handleSaveOverdueManagement = async (overrideStatus?: string) => {
    if (!taskToManage) return;
    setManageSaving(true);
    try {
      const finalStatus = overrideStatus || manageForm.status;
      let finalDueIso: string | null = null;
      if (manageForm.dueDate) {
        if (manageForm.dueTime) {
          finalDueIso = new Date(`${manageForm.dueDate}T${manageForm.dueTime}:00`).toISOString();
        } else {
          finalDueIso = new Date(`${manageForm.dueDate}T23:59:59`).toISOString();
        }
      }

      const res = await fetch(`/api/tasks/${taskToManage.id}/manage-overdue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: finalDueIso,
          assignedTo: manageForm.assignedTo === 'none' ? null : manageForm.assignedTo,
          status: finalStatus,
          priority: manageForm.priority,
          adminNote: manageForm.adminNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در مدیریت وظیفه معوق');
      }

      toast.success(data.message || 'تغییرات مدیریتی با موفقیت ذخیره شد');
      setManageOverdueOpen(false);
      setTaskToManage(null);
      loadData();
    } catch (err: any) {
      toast.error('مدیریت وظیفه ناموفق: ' + err.message);
    } finally {
      setManageSaving(false);
    }
  };

  // Regular user view overdue task dialog
  const openViewOverdue = async (task: Task) => {
    setTaskToView(task);
    setViewOverdueOpen(true);
    setViewComments([]);
    try {
      const data = await fetchData<any>('task_comments', { where: { taskId: task.id }, orderBy: { createdAt: 'desc' } });
      setViewComments(data || []);
    } catch {}
  };

  const handleAddViewComment = async () => {
    if (!taskToView || !newViewComment.trim() || !profile) return;
    setViewCommentLoading(true);
    try {
      await createData('task_comments', {
        taskId: taskToView.id,
        profileId: profile.id,
        content: newViewComment.trim(),
      });
      setNewViewComment('');
      const data = await fetchData<any>('task_comments', { where: { taskId: taskToView.id }, orderBy: { createdAt: 'desc' } });
      setViewComments(data || []);
      toast.success('نظر با موفقیت ثبت شد');
    } catch (e: any) {
      toast.error('ثبت نظر ناموفق: ' + e.message);
    } finally {
      setViewCommentLoading(false);
    }
  };

  const stats = useMemo(() => [
    {
      label: 'کل وظایف', value: tasks.length, icon: CheckSquare,
      tab: 'tasks',
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'در حال انجام', value: tasks.filter((t) => t.status === 'in_progress' && !isTaskOverdue(t)).length, icon: PlayCircle,
      tab: 'tasks',
      filter: 'in_progress',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'به تعویق افتاده', value: overdueTasksList.length, icon: AlertTriangle,
      tab: 'overdue',
      filter: 'postponed',
      gradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
      glow: 'rgba(220,38,38,0.35)',
      isDanger: overdueTasksList.length > 0,
    },
    {
      label: 'انجام شده', value: tasks.filter((t) => t.status === 'completed').length, icon: CheckCircle2,
      tab: 'tasks',
      filter: 'completed',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'لغو شده', value: tasks.filter((t) => t.status === 'cancelled').length, icon: XCircle,
      tab: 'tasks',
      filter: 'cancelled',
      gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
      glow: 'rgba(100,116,139,0.25)',
    },
  ], [tasks, overdueTasksList]);

  const handleStatClick = (stat: any) => {
    if (stat.tab === 'overdue') {
      setActiveTab('overdue');
    } else {
      setActiveTab('tasks');
      setFilterStatus(filterStatus === stat.filter ? 'all' : stat.filter);
    }
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
    const overdue = isTaskOverdue(task);
    const delayInfo = getOverdueDelayInfo(task.dueDate);
    const isReferred = !!task.referredDate;
    const cCount = commentCounts[task.id] || 0;
    const unread = hasUnreadComments(task.id);
    const stColor = overdue ? '#DC2626' : statusInfo(task.status).color;

    return (
      <div
        draggable={canDrag(task)}
        onDragStart={() => canDrag(task) && setDragId(task.id)}
        onDragEnd={() => { setDragId(null); setDragOver(null); }}
        onClick={() => {
          if (overdue) {
            if (isSuperAdmin) openManageOverdue(task);
            else openViewOverdue(task);
          } else {
            navigateToEdit(task.id);
          }
        }}
        className={`nb-card cursor-pointer ${canDrag(task) ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === task.id ? 'opacity-50' : ''} ${isReferred ? 'border-amber-200' : ''} ${unread ? 'ring-2 ring-sky-400/50' : ''} ${overdue ? 'border-rose-300 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/10' : ''}`}
        style={{ borderBottomColor: stColor, borderBottomWidth: 3 }}
      >
        <div className="nb-card-top">
          <div className="nb-card-tags flex flex-wrap gap-1">
            <span className="nb-card-tag" style={{ background: `${pr.color}15`, color: pr.color }}>
              {pr.label}
            </span>
            {overdue && (
              <span className="nb-card-tag flex items-center gap-1 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
                <AlertTriangle className="h-2.5 w-2.5" /> معوق
              </span>
            )}
            {isReferred && <span className="nb-card-tag" style={{ background: 'rgba(245,158,11,.12)', color: '#f59e0b' }}><Forward className="h-2.5 w-2.5" /> ارجاعی</span>}
          </div>
          {cCount > 0 && (
            <span className={`flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${unread ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`} title={unread ? 'نظرات جدید' : 'نظرات'}>
              {cCount.toLocaleString('fa-IR')}
            </span>
          )}
        </div>
        <h3 className="nb-card-title">{task.title}</h3>
        {task.description && <p className="nb-card-excerpt">{task.description}</p>}
        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {task.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className={overdue ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                موعد: {formatJalali(task.dueDate)}
              </span>
            </div>
          )}
          {overdue && delayInfo.isOverdue && (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <Clock className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span>{delayInfo.delayText}</span>
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
          <div className="nb-card-quick flex items-center gap-1.5">
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{assignee[0]}</AvatarFallback></Avatar>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{assignee}</span>
              </div>
            ) : unread ? <span className="flex items-center gap-1 text-[10px] font-medium text-sky-600"><span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />نظر جدید</span> : <Flag className="h-3.5 w-3.5 text-slate-400" />}

            {overdue ? (
              isSuperAdmin ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openManageOverdue(task); }}
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-sm"
                  title="مدیریت سوپرادمین"
                >
                  <ShieldCheck className="h-3 w-3" />
                  مدیریت
                </button>
              ) : (
                <span className="rounded bg-slate-100 p-1 text-slate-400 dark:bg-slate-800" title="مدیریت فقط سوپرادمین">
                  <Lock className="h-3 w-3" />
                </span>
              )
            ) : (
              referOptions.length > 0 && <button onClick={(e) => { e.stopPropagation(); openRefer(task.id); }} className="text-slate-400 transition-colors hover:text-amber-500" title="ارجاع"><Forward className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBoard = (taskList: Task[]) => (
    <div className="w-full overflow-hidden pb-4">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                const st = statusInfo(task.status);
                const pr = priorityInfo(task.priority);
                const assignee = getStaffName(task.assignedTo);
                const overdue = isTaskOverdue(task);
                const delayInfo = getOverdueDelayInfo(task.dueDate);
                const cCount = commentCounts[task.id] || 0;
                const unread = hasUnreadComments(task.id);
                return (
                  <tr
                    key={task.id}
                    className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${unread ? 'bg-sky-50/40' : ''} ${overdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}
                    onClick={() => {
                      if (overdue) {
                        if (isSuperAdmin) openManageOverdue(task);
                        else openViewOverdue(task);
                      } else {
                        navigateToEdit(task.id);
                      }
                    }}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {unread && <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-sky-500" title="نظر جدید" />}
                        {overdue && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" title="وظیفه به تعویق افتاده" />}
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{task.title}</div>
                          {task.description && <div className="text-xs text-slate-400 truncate max-w-xs">{task.description}</div>}
                          {cCount > 0 && <span className={`inline-flex mt-0.5 h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${unread ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{cCount.toLocaleString('fa-IR')}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}35` }} className="text-xs">{pr.label}</Badge></td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                      {task.dueDate ? (
                        <div className="space-y-0.5">
                          <span className={`flex items-center gap-1 ${overdue ? 'font-bold text-rose-600 dark:text-rose-400' : ''}`}>
                            <Clock className="h-3 w-3" />{formatJalali(task.dueDate)}
                          </span>
                          {overdue && delayInfo.isOverdue && (
                            <span className="text-[11px] font-semibold text-rose-500">
                              {delayInfo.delayText}
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <Badge style={{ backgroundColor: overdue ? 'rgba(220,38,38,0.12)' : `${st.color}15`, color: overdue ? '#DC2626' : st.color }} className="rounded-full text-xs font-semibold">
                        {overdue ? 'به تعویق افتاده' : st.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {assignee ? <div className="flex items-center gap-1.5"><Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{assignee[0]}</AvatarFallback></Avatar><span className="text-xs text-slate-500 dark:text-slate-400">{assignee}</span></div> : '—'}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {overdue ? (
                          isSuperAdmin ? (
                            <Button
                              size="sm"
                              onClick={() => openManageOverdue(task)}
                              className="h-8 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs px-2.5 rounded-lg"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              مدیریت
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openViewOverdue(task)}
                              className="h-8 gap-1 text-xs px-2.5 rounded-lg"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              مشاهده
                            </Button>
                          )
                        ) : (
                          <>
                            {referOptions.length > 0 && <button onClick={() => openRefer(task.id)} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-500" title="ارجاع"><Forward className="h-4 w-4" /></button>}
                            <Link href={`/dashboard/tasks/${task.id}/edit`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش"><Edit className="h-4 w-4" /></Link>
                          </>
                        )}
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
    );
  };

  // Dedicated Overdue Table Rendering (Aligned with /dashboard/meetings standards)
  const renderOverdueTable = () => {
    return (
      <div className="space-y-4">
        {/* Overdue Banner & Authority Indicator */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 ${
          isSuperAdmin
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
            : 'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isSuperAdmin ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="font-bold text-sm">
                {isSuperAdmin
                  ? 'مرکز مدیریت انحصاری سوپرادمین: وظایف به تعویق افتاده'
                  : 'فهرست وظایف به تعویق افتاده (حالت فقط خواندنی)'}
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                {isSuperAdmin
                  ? 'تنها شما به عنوان سوپرادمین سامانه مجوز ویرایش، تغییر مسئول، تمدید موعد یا تغییر وضعیت وظایف معوق را دارید.'
                  : 'طبق ضوابط امنیتی، مدیریت و تمدید وظایف به تعویق افتاده منحصراً توسط سوپرادمین انجام می‌شود.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="rounded-full bg-white/80 dark:bg-slate-900/60 px-3 py-1 text-xs font-bold shadow-sm">
              {filteredOverdueTasks.length.toLocaleString('fa-IR')} وظیفه معوق
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadData()}
              className="h-8 gap-1 text-xs bg-white/80 dark:bg-slate-900/60 hover:bg-white"
            >
              <RefreshCw className="h-3 w-3" />
              بروزرسانی
            </Button>
          </div>
        </div>

        {/* Dedicated Filters Toolbar for Overdue Table */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
            <div className="nb-search-box flex-1 min-w-[180px]">
              <Search className="h-4 w-4" />
              <input
                value={overdueSearch}
                onChange={(e) => setOverdueSearch(e.target.value)}
                placeholder="جستجو در تسک‌های معوق، مسئول یا ایجادکننده..."
              />
              {overdueSearch && <button onClick={() => setOverdueSearch('')}><X className="h-3.5 w-3.5" /></button>}
            </div>

            <Select value={overdueFilterPriority} onValueChange={setOverdueFilterPriority}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="اولویت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه اولویت‌ها</SelectItem>
                {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={overdueFilterDelay} onValueChange={setOverdueFilterDelay}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="میزان تأخیر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه تأخیرها</SelectItem>
                <SelectItem value="week_plus">بیش از ۱ هفته تأخیر</SelectItem>
                <SelectItem value="three_to_seven">بین ۳ تا ۷ روز تأخیر</SelectItem>
                <SelectItem value="under_three">کمتر از ۳ روز تأخیر</SelectItem>
              </SelectContent>
            </Select>

            <Select value={overdueFilterAssignee} onValueChange={setOverdueFilterAssignee}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="مسئول انجام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مسئولین</SelectItem>
                {allStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select value={overdueSort} onValueChange={(v: any) => setOverdueSort(v)}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delay_desc">بیشترین تأخیر</SelectItem>
                <SelectItem value="due_asc">نزدیک‌ترین موعد</SelectItem>
                <SelectItem value="priority_desc">بالاترین اولویت</SelectItem>
              </SelectContent>
            </Select>

            <div className="nb-view-toggle">
              <button
                className={overdueViewMode === 'list' ? 'is-active' : ''}
                onClick={() => setOverdueViewMode('list')}
                title="نمای جدولی"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className={overdueViewMode === 'board' ? 'is-active' : ''}
                onClick={() => setOverdueViewMode('board')}
                title="نمای کارتی"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Overdue Content: Table or Cards */}
        {filteredOverdueTasks.length === 0 ? (
          <div className="nb-empty py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              هیچ وظیفه به تعویق افتاده‌ای وجود ندارد
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              عالی است! تمامی وظایف در موعد مقرر تکمیل شده‌اند یا هنوز موعد سررسید آن‌ها فرانرسیده است.
            </p>
          </div>
        ) : overdueViewMode === 'list' ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm min-w-[850px]">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="p-3.5">عنوان و شرح وظیفه</th>
                    <th className="p-3.5">اولویت</th>
                    <th className="p-3.5">موعد مقرر</th>
                    <th className="p-3.5">میزان تأخیر</th>
                    <th className="p-3.5">مسئول انجام</th>
                    <th className="p-3.5">ایجادکننده</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOverdueTasks.map((task) => {
                    const pr = priorityInfo(task.priority);
                    const assignee = getStaffName(task.assignedTo);
                    const creator = getStaffName(task.createdBy);
                    const delayInfo = getOverdueDelayInfo(task.dueDate);
                    const cCount = commentCounts[task.id] || 0;

                    return (
                      <tr
                        key={task.id}
                        className="transition hover:bg-rose-50/40 dark:hover:bg-rose-950/20 cursor-pointer"
                        onClick={() => {
                          if (isSuperAdmin) openManageOverdue(task);
                          else openViewOverdue(task);
                        }}
                      >
                        <td className="p-3.5">
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 mt-0.5">
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>{task.title}</span>
                                {cCount > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.2">
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    {cCount}
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}40` }} className="text-xs font-medium">
                            {pr.label}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{formatJalaliDateTime(task.dueDate)}</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                            <Clock className="h-3 w-3" />
                            {delayInfo.delayText}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                  {assignee[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{assignee}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">بدون مسئول</span>
                          )}
                        </td>
                        <td className="p-3.5 text-xs text-slate-500">
                          {creator || 'سیستم'}
                        </td>
                        <td className="p-3.5">
                          <Badge className="bg-rose-600/15 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-xs border border-rose-200 dark:border-rose-800">
                            به تعویق افتاده
                          </Badge>
                        </td>
                        <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {isSuperAdmin ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => openManageOverdue(task)}
                                className="h-8 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 rounded-lg shadow-sm font-medium"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                مدیریت
                              </Button>
                              <Link
                                href={`/dashboard/tasks/${task.id}/edit`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800"
                                title="ویرایش کامل"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openViewOverdue(task)}
                              className="h-8 gap-1.5 text-xs rounded-lg text-slate-600"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              مشاهده
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOverdueTasks.map((task) => {
              const pr = priorityInfo(task.priority);
              const assignee = getStaffName(task.assignedTo);
              const delayInfo = getOverdueDelayInfo(task.dueDate);

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    if (isSuperAdmin) openManageOverdue(task);
                    else openViewOverdue(task);
                  }}
                  className="rounded-2xl border-2 border-rose-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-rose-950/60 dark:bg-slate-900 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        <AlertTriangle className="h-3 w-3" />
                        {delayInfo.delayText}
                      </span>
                      <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}40` }} className="text-xs">
                        {pr.label}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
                    )}

                    <div className="space-y-1 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>موعد: {task.dueDate ? formatJalaliDateTime(task.dueDate) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>مسئول: {assignee || 'تخصیص‌نیافته'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400">
                      ثبت: {relativeTime(task.createdAt)}
                    </span>
                    {isSuperAdmin ? (
                      <Button
                        size="sm"
                        onClick={() => openManageOverdue(task)}
                        className="h-8 gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 rounded-lg"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        مدیریت سوپرادمین
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewOverdue(task)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        مشاهده جزئیات
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
              <h1>وظایف و پیگیری‌ها</h1>
            </div>
            <p>مدیریت وظایف سازمانی، ارجاعات و کنترل هوشمند وظایف به تعویق افتاده</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/tasks/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            وظیفه جدید
          </Link>
        </div>
      </header>

      {/* Stats Cards Section */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${(activeTab === stat.tab && (stat.tab === 'overdue' || filterStatus === stat.filter)) ? 'is-active' : ''} ${stat.isDanger ? 'ring-2 ring-rose-500/30' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat)}
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

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <TabsList className="h-11 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm font-medium">
              <CheckSquare className="w-4 h-4" />
              <span>تسک‌های فعال</span>
              <Badge variant="secondary" className="mr-1 text-[11px] px-1.5 py-0">
                {myTasks.length.toLocaleString('fa-IR')}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="referrals" className="gap-1.5 text-xs sm:text-sm font-medium">
              <Inbox className="w-4 h-4" />
              <span>ارجاعات</span>
              <Badge variant="secondary" className="mr-1 text-[11px] px-1.5 py-0">
                {referredTasks.length.toLocaleString('fa-IR')}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="overdue"
              className={`gap-1.5 text-xs sm:text-sm font-medium ${
                overdueTasksList.length > 0
                  ? 'text-rose-600 data-[state=active]:text-rose-700 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 font-bold'
                  : ''
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>به تعویق افتاده</span>
              <span className={`mr-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                overdueTasksList.length > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
              }`}>
                {overdueTasksList.length.toLocaleString('fa-IR')}
              </span>
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'overdue' && (
            <div className="flex items-center gap-2">
              <div className="nb-view-toggle">
                <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Regular Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>تسک‌های فعال</h2>
              <span className="nb-count-badge">{myTasks.length.toLocaleString('fa-IR')} مورد</span>
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
            </div>
          </div>

          {myTasks.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><CheckSquare className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>تسکی وجود ندارد</h3>
              <p>تسک‌هایی که ایجاد کرده‌اید یا به شما اختصاص داده شده اینجا نمایش داده می‌شوند</p>
              <Link href="/dashboard/tasks/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن وظیفه</Link>
            </div>
          ) : viewMode === 'board' ? renderBoard(myTasks) : renderList(myTasks)}
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4">
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>وظایف ارجاع‌داده‌شده</h2>
              <span className="nb-count-badge">{referredTasks.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجوی ارجاع..."
                />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          </div>

          {referredTasks.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Inbox className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>ارجاعی وجود ندارد</h3>
              <p>تسک‌هایی که دیگران به شما ارجاع داده‌اند اینجا نمایش داده می‌شوند</p>
            </div>
          ) : viewMode === 'board' ? renderBoard(referredTasks) : renderList(referredTasks)}
        </TabsContent>

        {/* Independent Overdue Tab */}
        <TabsContent value="overdue">
          {renderOverdueTable()}
        </TabsContent>
      </Tabs>

      <Link href="/dashboard/tasks/new" className="nb-fab" aria-label="وظیفه جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* Refer Task Dialog */}
      <Dialog open={referOpen} onOpenChange={setReferOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ارجاع وظیفه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">می‌توانید این وظیفه را به همکاران ارجاع دهید.</p>
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

      {/* EXCLUSIVE SUPERADMIN OVERDUE MANAGEMENT DIALOG */}
      <Dialog open={manageOverdueOpen} onOpenChange={setManageOverdueOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>مدیریت وظیفه به تعویق افتاده (دسترسی انحصاری سوپرادمین)</span>
            </DialogTitle>
          </DialogHeader>

          {taskToManage && (
            <div className="space-y-5 py-2">
              {/* Task Details Card */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">مشخصات فعلی وظیفه معوق:</span>
                  <span className="rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-[11px] font-bold">
                    {getOverdueDelayInfo(taskToManage.dueDate).delayText}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{taskToManage.title}</h4>
                {taskToManage.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{taskToManage.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-rose-200/60">
                  <div>موعد قبلی: <b>{taskToManage.dueDate ? formatJalaliDateTime(taskToManage.dueDate) : 'تعیین‌نشده'}</b></div>
                  <div>مسئول فعلی: <b>{getStaffName(taskToManage.assignedTo) || 'تخصیص‌نیافته'}</b></div>
                </div>
              </div>

              {/* Quick Extend Buttons */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  تمدید سریع موعد (انتقال خودکار به جریان عادی):
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickExtend(1)}
                    className="text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    + ۱ روز آینده (فردا ساعت ۱۸)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickExtend(3)}
                    className="text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    + ۳ روز آینده
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickExtend(7)}
                    className="text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    + ۱ هفته آینده
                  </Button>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">تاریخ موعد جدید</Label>
                  <JalaliDatePicker
                    value={manageForm.dueDate ? new Date(manageForm.dueDate) : null}
                    onChange={(d) => setManageForm({ ...manageForm, dueDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ جدید..."
                    className="h-10 w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">ساعت موعد جدید</Label>
                  <input
                    type="time"
                    dir="ltr"
                    value={manageForm.dueTime}
                    onChange={(e) => setManageForm({ ...manageForm, dueTime: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Reassign & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">تغییر مسئول انجام</Label>
                  <Select
                    value={manageForm.assignedTo}
                    onValueChange={(v) => setManageForm({ ...manageForm, assignedTo: v })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="انتخاب مسئول جدید..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تخصیص</SelectItem>
                      {allStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {fullName(s.firstName, s.lastName)}
                          {s.role === 'super_admin' ? ' (سوپرادمین)' : s.role === 'admin' ? ' (مدیر)' : ' (پرسنل)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">وضعیت وظیفه</Label>
                  <Select
                    value={manageForm.status}
                    onValueChange={(v) => setManageForm({ ...manageForm, status: v })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">در حال انجام (خروج از معوق)</SelectItem>
                      <SelectItem value="completed">انجام شده (تکمیل قطعی)</SelectItem>
                      <SelectItem value="cancelled">لغو شده</SelectItem>
                      <SelectItem value="postponed">به تعویق افتاده (معوق)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">تغییر اولویت</Label>
                <Select
                  value={manageForm.priority}
                  onValueChange={(v) => setManageForm({ ...manageForm, priority: v })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Administrative Note */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  دستور و یادداشت مدیریتی سوپرادمین
                </Label>
                <textarea
                  value={manageForm.adminNote}
                  onChange={(e) => setManageForm({ ...manageForm, adminNote: e.target.value })}
                  placeholder="علت تمدید، تغییر مسئول، دستورات اجرایی یا توضیحات سوپرادمین..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed outline-none focus:border-rose-500 dark:border-slate-800 dark:bg-slate-900"
                  rows={3}
                />
                <p className="text-[11px] text-slate-400">
                  این دستور در لاگ سیستمی و همچنین در بخش نظرات وظیفه ثبت و به مسئول وظیفه ابلاغ می‌شود.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveOverdueManagement('completed')}
                      disabled={manageSaving}
                      className="text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    >
                      <Check className="h-3.5 w-3.5 ml-1" />
                      تکمیل وظیفه
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveOverdueManagement('cancelled')}
                      disabled={manageSaving}
                      className="text-xs border-rose-300 text-rose-600 hover:bg-rose-50"
                    >
                      <XCircle className="h-3.5 w-3.5 ml-1" />
                      لغو وظیفه
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManageOverdueOpen(false)}
                      disabled={manageSaving}
                    >
                      انصراف
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveOverdueManagement()}
                      disabled={manageSaving}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                    >
                      {manageSaving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <ShieldCheck className="h-4 w-4 ml-1" />}
                      ذخیره و اعمال تغییرات
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REGULAR USER VIEW OVERDUE TASK DIALOG (READ ONLY) */}
      <Dialog open={viewOverdueOpen} onOpenChange={setViewOverdueOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span>مشاهده وظیفه به تعویق افتاده</span>
            </DialogTitle>
          </DialogHeader>

          {taskToView && (
            <div className="space-y-4 py-2">
              {/* Notice Banner */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 leading-relaxed">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Lock className="h-4 w-4 text-rose-600" />
                  <span>دسترسی فقط خواندنی</span>
                </div>
                این وظیفه به علت سپری شدن موعد مقرر در وضعیت «به تعویق افتاده» قرار گرفته است. طبق قوانین امنیتی سامانه، تغییر مسئول، تمدید موعد یا تغییر وضعیت آن منحصراً در اختیار سوپرادمین می‌باشد.
              </div>

              {/* Task Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{taskToView.title}</h4>
                  <Badge variant="outline" style={{ color: priorityInfo(taskToView.priority).color }}>
                    {priorityInfo(taskToView.priority).label}
                  </Badge>
                </div>

                {taskToView.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {taskToView.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block">موعد مقرر:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {taskToView.dueDate ? formatJalaliDateTime(taskToView.dueDate) : 'تعیین‌نشده'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">میزان تأخیر:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {getOverdueDelayInfo(taskToView.dueDate).delayText}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">مسئول انجام:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {getStaffName(taskToView.assignedTo) || 'تخصیص‌نیافته'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ایجادکننده:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {getStaffName(taskToView.createdBy) || 'سیستم'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Comments & Reporting */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <span>نظرات و پیام‌های پیگیری ({viewComments.length.toLocaleString('fa-IR')})</span>
                  </h5>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {viewComments.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-400">نظری برای این وظیفه ثبت نشده است</p>
                  ) : (
                    viewComments.map((c) => {
                      const author = getStaffName(c.profileId);
                      const isManagerial = c.content.includes('[دستور مدیریتی سوپرادمین]');
                      return (
                        <div
                          key={c.id}
                          className={`rounded-lg p-2.5 text-xs space-y-1 ${
                            isManagerial
                              ? 'border border-amber-300 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                              : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1">
                              {isManagerial && <ShieldCheck className="h-3 w-3 text-amber-600" />}
                              {author || 'کاربر'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">{relativeTime(c.createdAt)}</span>
                          </div>
                          <p className="leading-relaxed">{c.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Comment Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    value={newViewComment}
                    onChange={(e) => setNewViewComment(e.target.value)}
                    placeholder="ثبت گزارش یا نظر درباره این وظیفه..."
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddViewComment(); }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddViewComment}
                    disabled={viewCommentLoading || !newViewComment.trim()}
                    className="h-8 px-3 text-xs gap-1"
                  >
                    {viewCommentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    ارسال
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setViewOverdueOpen(false)}>
                  بستن
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
