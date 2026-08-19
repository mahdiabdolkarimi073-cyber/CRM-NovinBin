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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  GripVertical,
  Clock,
  Trash2,
  Edit,
  MessageSquare,
  Send,
  Forward,
  Inbox,
  BarChart3,
  Circle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Eye,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, relativeTime, toLocalDateString } from '@/lib/format';
import { TASK_STATUSES, TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Task, Profile } from '@/lib/types';

const statusInfo = (key: string) => TASK_STATUSES.find((s) => s.key === key) || TASK_STATUSES[0];
const priorityInfo = (key: string) => TASK_PRIORITIES.find((p) => p.key === key) || TASK_PRIORITIES[0];

interface UserManagerRow {
  id: string;
  userId: string;
  managerId: string;
  createdAt: string;
}

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
  const [referOpen, setReferOpen] = useState(false);
  const [referTargetId, setReferTargetId] = useState<string | null>(null);
  const [referTo, setReferTo] = useState('none');
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isPersonnel = !isAdmin;

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = isSuperAdmin ? {} : { OR: [{ assignedTo: profile.id }, { createdBy: profile.id }] };
      if (search) where.title = { contains: search, mode: 'insensitive' };
      if (filterPriority !== 'all') where.priority = filterPriority;

      const staffWhere: any = isSuperAdmin ? { role: 'personnel' } : { role: 'personnel' };
      const adminWhere: any = isSuperAdmin
        ? { role: { in: ['admin', 'personnel', 'owner', 'super_admin'] } }
        : { role: { in: ['admin', 'personnel', 'owner', 'super_admin'] } };

      const [taskData, staffData, allStaffData, mgrData] = await Promise.all([
        fetchData('tasks', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('profiles', { where: staffWhere }),
        fetchData('profiles', { where: adminWhere }),
        fetchData<UserManagerRow>('user_manager', { where: isSuperAdmin ? {} : {} }),
      ]);

      const mMap: Record<string, string> = {};
      (mgrData as UserManagerRow[]).forEach((m) => {
        mMap[m.userId] = m.managerId;
      });

      setTasks((taskData as Task[]) || []);
      setStaff((staffData as Profile[]) || []);
      setAllStaff((allStaffData as Profile[]) || []);
      setManagerMap(mMap);
    } catch (error: any) {
      toast.error('بارگذاری وظایف ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, search, filterPriority]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadComments = async (taskId: string) => {
    try {
      const data = await fetchData<any>('task_comments', {
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      });
      setComments(data || []);
    } catch {
      setComments([]);
    }
  };

  // Personnel under the same admin (including self if personnel)
  const sameAdminPersonnel = useMemo(() => {
    if (!profile) return [];
    if (isSuperAdmin) return allStaff;
    if (isAdmin) {
      // Admin's own personnel
      return allStaff.filter((s) => s.role === 'personnel' && managerMap[s.id] === profile.id);
    }
    // Personnel: find others under the same admin
    const myAdmin = managerMap[profile.id];
    if (!myAdmin) return [];
    return allStaff.filter(
      (s) => s.role === 'personnel' && managerMap[s.id] === myAdmin
    );
  }, [allStaff, managerMap, profile, isAdmin, isSuperAdmin]);

  // Admins that an admin can refer to (other admins/super_admins)
  const otherAdmins = useMemo(() => {
    if (!profile) return [];
    return allStaff.filter(
      (s) =>
        (s.role === 'admin' || s.role === 'super_admin' || s.role === 'owner') &&
        s.id !== profile.id
    );
  }, [allStaff, profile]);

  // Assignee options: all staff can assign to any staff member
  const assigneeOptions = useMemo(() => {
    if (!profile) return [];
    return allStaff;
  }, [allStaff, profile]);

  // Referral options: all staff can refer to any other staff member
  const referOptions = useMemo(() => {
    if (!profile) return [];
    return allStaff.filter((s) => s.id !== profile.id);
  }, [allStaff, profile]);

  // Split tasks into "my tasks" and "referrals"
  // Referrals = tasks where referredDate is set AND createdBy !== current user
  // My tasks = tasks created by me OR assigned to me
  const { myTasks, referredTasks } = useMemo(() => {
    if (!profile) return { myTasks: [], referredTasks: [] };
    const mine: Task[] = [];
    const referred: Task[] = [];
    tasks.forEach((t) => {
      // A task is a "referral" if it has a referredDate and was created by someone else
      if (t.referredDate && t.createdBy !== profile.id) {
        referred.push(t);
      } else {
        mine.push(t);
      }
    });
    return { myTasks: mine, referredTasks: referred };
  }, [tasks, profile]);

  const displayTasks = activeTab === 'referrals' ? referredTasks : myTasks;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.title) {
      toast.error('عنوان وظیفه را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      await createData('tasks', {
        title: form.title,
        description: form.description || null,
        assignedTo: form.assignedTo || null,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        status: 'new',
        createdBy: profile.id,
      });

      // Send notification to assigned user
      if (form.assignedTo && form.assignedTo !== profile.id) {
        const assignee = allStaff.find((s) => s.id === form.assignedTo);
        const assigneeName = assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() : '';
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        try {
          await createData('notifications', {
            profileId: form.assignedTo,
            title: 'وظیفه جدید به شما اختصاص داده شد',
            body: `یک تسک «${form.title}» توسط ${myName} به شما اختصاص داده شد`,
            type: 'task',
            priority: form.priority === 'urgent' ? 'urgent' : 'normal',
            link: '/dashboard/tasks',
          });
        } catch {}
      }
      toast.success('وظیفه ایجاد شد');
      setDialogOpen(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      loadData();
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await updateData(
        'tasks',
        { id: editingTask.id },
        {
          title: form.title,
          description: form.description || null,
          assignedTo: form.assignedTo || null,
          priority: form.priority,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        }
      );
      toast.success('وظیفه ویرایش شد');
      setEditingTask(null);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      loadData();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteData('tasks', { id: taskId });
      toast.success('وظیفه حذف شد');
      setDetailTask(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleAddComment = async () => {
    if (!detailTask || !newComment.trim() || !profile) return;
    setCommentLoading(true);
    try {
      await createData('task_comments', {
        taskId: detailTask.id,
        profileId: profile.id,
        content: newComment.trim(),
      });
      setNewComment('');
      loadComments(detailTask.id);
    } catch (error: any) {
      toast.error('ثبت نظر ناموفق: ' + error.message);
    }
    setCommentLoading(false);
  };

  const handleDrop = async (status: string) => {
    if (!dragId) return;
    setDragOver(null);
    setDragId(null);
    const task = displayTasks.find((t) => t.id === dragId);
    if (!task || task.status === status) return;
    const updates: any = { status };
    if (status === 'completed') updates.completedAt = new Date().toISOString();
    try {
      await updateData('tasks', { id: dragId }, updates);
      loadData();
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + error.message);
    }
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
  };

  const openDetail = (task: Task) => {
    setDetailTask(task);
    loadComments(task.id);
  };

  const handleRefer = async () => {
    if (!referTargetId || referTo === 'none' || !profile) return;
    try {
      await updateData('tasks', { id: referTargetId }, {
        assignedTo: referTo,
        referredDate: new Date().toISOString(),
      });

      // Send notification to referred user
      if (referTo !== 'none') {
        const targetTask = tasks.find((t) => t.id === referTargetId);
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        try {
          await createData('notifications', {
            profileId: referTo,
            title: 'وظیفه‌ای به شما ارجاع داده شد',
            body: `${myName} یک وظیفه${targetTask ? ` «${targetTask.title}»` : ''} را به شما ارجاع داد`,
            type: 'task',
            priority: 'normal',
            link: '/dashboard/tasks',
          });
        } catch {}
      }
      toast.success('وظیفه ارجاع داده شد');
      setReferOpen(false);
      setReferTargetId(null);
      setReferTo('none');
      loadData();
    } catch (error: any) {
      toast.error('ارجاع ناموفق: ' + error.message);
    }
  };

  const openRefer = (taskId: string) => {
    if (referOptions.length === 0) {
      toast.error('شما نمی‌توانید وظیفه‌ای را ارجاع دهید');
      return;
    }
    setReferTargetId(taskId);
    setReferTo('none');
    setReferOpen(true);
  };

  const tasksByStatus = (status: string) => displayTasks.filter((t) => t.status === status);
  const getStaffName = (id: string | null) => {
    if (!id) return null;
    const s = allStaff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : null;
  };

  const canEdit = (task?: Task) => !task || task.status !== 'completed';
  const canDelete = (task?: Task) => !task || task.status !== 'completed';
  const canRefer = referOptions.length > 0;
  const taskSummary = [...TASK_STATUSES].reverse().map((stage) => ({
    ...stage,
    count: displayTasks.filter((task) => task.status === stage.key).length,
  }));
  const totalTasks = displayTasks.length;

  const TaskCard = ({ task }: { task: Task }) => {
    const pr = priorityInfo(task.priority);
    const assignee = getStaffName(task.assignedTo);
    const creator = getStaffName(task.createdBy || null);
    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isReferred = !!task.referredDate;
    return (
      <div
        draggable
        onDragStart={() => setDragId(task.id)}
        onDragEnd={() => {
          setDragId(null);
          setDragOver(null);
        }}
        onClick={() => openDetail(task)}
        className={`p-3 rounded-lg bg-white border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-sky-200 transition-smooth ${dragId === task.id ? 'opacity-50' : ''} ${isReferred ? 'border-amber-200 bg-amber-50/30' : ''}`}
      >
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-800">{task.title}</div>
            {task.description && (
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</div>
            )}
          </div>
          {isReferred && (
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 shrink-0">
              <Forward className="w-3 h-3 ml-1" />
              ارجاعی
            </Badge>
          )}
          {canEdit(task) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(task);
              }}
              className="text-slate-300 hover:text-sky-500 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" style={{ color: pr.color, borderColor: pr.color + '40' }} className="text-xs">
            {pr.label}
          </Badge>
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
              <Calendar className="w-3 h-3" />
              {formatJalali(task.dueDate)}
            </span>
          )}
          {creator && activeTab === 'referrals' && (
            <span className="text-xs text-slate-400">از: {creator}</span>
          )}
        </div>
        {assignee && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">{assignee[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-500">{assignee}</span>
          </div>
        )}
      </div>
    );
  };

  const renderForm = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleEdit : handleCreate} className="space-y-4">
      <div className="space-y-2">
        <Label>عنوان *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>توضیحات</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>مسئول انجام</Label>
          <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v === 'none' ? '' : v })}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون تخصیص</SelectItem>
              {assigneeOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {fullName(s.firstName, s.lastName)}
                  {s.id === profile?.id ? ' (خودم)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>اولویت</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>موعد انجام</Label>
        <JalaliDatePicker value={form.dueDate ? new Date(form.dueDate) : null} onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { if (isEdit) setEditingTask(null); else setDialogOpen(false); }}>
          انصراف
        </Button>
        <Button type="submit" disabled={creating}>
          {isEdit ? 'ذخیره تغییرات' : creating ? 'در حال ایجاد...' : 'ایجاد'}
        </Button>
      </DialogFooter>
    </form>
  );

  const renderBoard = (taskList: Task[]) => (
    <div className="task-board-scroll overflow-x-auto pb-4">
      <div className="task-board-grid flex min-w-max gap-4">
        {[...TASK_STATUSES].reverse().map((stage) => {
          const items = taskList.filter((t) => t.status === stage.key);
          return (
            <div
              key={stage.key}
              className={`task-column w-[260px] shrink-0 rounded-[14px] transition-smooth ${dragOver === stage.key ? 'bg-sky-50 ring-2 ring-sky-300' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className="task-column-header rounded-t-[14px] border-b-2 bg-white px-4 py-3" style={{ borderColor: stage.color }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="font-semibold text-sm text-slate-700">{stage.label}</span>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {items.length.toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>
              <div className="task-column-body min-h-[300px] space-y-2 rounded-b-[14px] bg-slate-50/70 p-2">
                {items.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-300 text-xs">کارت اینجا رها کنید</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderList = (taskList: Task[]) => (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {taskList.map((task) => {
            const st = statusInfo(task.status);
            const pr = priorityInfo(task.priority);
            const assignee = getStaffName(task.assignedTo);
            const creator = getStaffName(task.createdBy || null);
            const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-smooth cursor-pointer"
                onClick={() => openDetail(task)}
              >
                <div className="w-2 h-10 rounded-full" style={{ backgroundColor: st.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{task.title}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" style={{ color: pr.color, borderColor: pr.color + '40' }} className="text-xs">
                      {pr.label}
                    </Badge>
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" />
                        {formatJalali(task.dueDate)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{relativeTime(task.createdAt)}</span>
                    {task.referredDate && creator && (
                      <span className="text-xs text-amber-500">ارجاع از: {creator}</span>
                    )}
                  </div>
                </div>
                <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                {assignee && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">{assignee[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-slate-500">{assignee}</span>
                  </div>
                )}
                {canRefer && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openRefer(task.id); }}
                    className="text-slate-300 hover:text-amber-500 transition-colors p-1"
                    title="ارجاع"
                  >
                    <Forward className="w-4 h-4" />
                  </button>
                )}
                {canEdit(task) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                    className="text-slate-300 hover:text-sky-500 transition-colors p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="task-page" dir="rtl">
      <section className="task-hero mb-4 overflow-hidden rounded-[14px] px-6 py-5 sm:px-8">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-orange-500" />
              <h1 className="text-2xl font-black text-white sm:text-3xl">وظایف</h1>
            </div>
            <p className="text-xs font-medium text-white/80 sm:text-sm">
              مدیریت وظایف و ارجاعات — همه کاربران می‌توانند وظیفه‌ای را به همکاران خود ارجاع دهند
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <BarChart3 className="h-4 w-4" /> گزارش سریع
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 text-white shadow-lg hover:bg-blue-500"><Plus className="h-4 w-4" /> وظیفه جدید</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>ایجاد وظیفه جدید</DialogTitle></DialogHeader>
                {renderForm(false)}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 w-36 rounded-lg border-blue-100 bg-white text-xs font-bold shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه اولویت‌ها</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="جستجوی وظیفه..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56 rounded-lg border-blue-100 bg-white pr-9 text-xs shadow-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="rounded-lg bg-white px-3 py-2 shadow-sm">تعداد کل: <strong className="text-blue-600">{totalTasks.toLocaleString('fa-IR')}</strong></span>
          <span className="rounded-lg bg-white px-3 py-2 shadow-sm">آخرین بروزرسانی</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {taskSummary.map((stage) => {
          const Icon = stage.key === 'completed' ? CheckCircle2 : stage.key === 'cancelled' ? XCircle : stage.key === 'in_progress' ? PlayCircle : stage.key === 'review' ? Eye : Circle;
          const pct = Math.round((stage.count / Math.max(totalTasks, 1)) * 100);
          return (
            <div key={stage.key} className="task-summary-card">
              <div className="flex items-center justify-between">
                <span className="task-summary-icon" style={{ color: stage.color, backgroundColor: `${stage.color}18` }}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </span>
                <span className="task-summary-pct" style={{ color: stage.color, backgroundColor: `${stage.color}10` }}>{pct.toLocaleString('fa-IR')}٪</span>
              </div>
              <div className="mt-2.5 text-[26px] font-black leading-none text-slate-800">{stage.count.toLocaleString('fa-IR')}</div>
              <div className="mt-1.5 text-xs font-bold text-slate-500">{stage.label}</div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckSquare className="w-8 h-8" />}
            title="وظیفه‌ای یافت نشد"
            description="برای شروع، اولین وظیفه را ایجاد کنید"
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" /> افزودن وظیفه
              </Button>
            }
          />
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="tasks" className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              تسک‌ها
              <Badge variant="secondary" className="text-xs mr-1">
                {myTasks.length.toLocaleString('fa-IR')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              ارجاعات
              <Badge variant="secondary" className="text-xs mr-1">
                {referredTasks.length.toLocaleString('fa-IR')}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            {myTasks.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<CheckSquare className="w-8 h-8" />}
                  title="تسکی وجود ندارد"
                  description="تسک‌هایی که ایجاد کرده‌اید یا به شما اختصاص داده شده اینجا نمایش داده می‌شوند"
                />
              </Card>
            ) : (
              <Tabs defaultValue="board">
                <TabsList>
                  <TabsTrigger value="board">تابلو کانبان</TabsTrigger>
                  <TabsTrigger value="list">لیست</TabsTrigger>
                </TabsList>
                <TabsContent value="board">{renderBoard(myTasks)}</TabsContent>
                <TabsContent value="list">{renderList(myTasks)}</TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            {referredTasks.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Inbox className="w-8 h-8" />}
                  title="ارجاعی وجود ندارد"
                  description="تسک‌هایی که دیگران به شما ارجاع داده‌اند اینجا نمایش داده می‌شوند"
                />
              </Card>
            ) : (
              <Tabs defaultValue="board">
                <TabsList>
                  <TabsTrigger value="board">تابلو کانبان</TabsTrigger>
                  <TabsTrigger value="list">لیست</TabsTrigger>
                </TabsList>
                <TabsContent value="board">{renderBoard(referredTasks)}</TabsContent>
                <TabsContent value="list">{renderList(referredTasks)}</TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ویرایش وظیفه</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {detailTask &&
            (() => {
              const st = statusInfo(detailTask.status);
              const pr = priorityInfo(detailTask.priority);
              const assignee = getStaffName(detailTask.assignedTo);
              const creator = getStaffName(detailTask.createdBy || null);
              const overdue = detailTask.dueDate && new Date(detailTask.dueDate) < new Date() && detailTask.status !== 'completed';
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-3">
                      <DialogTitle className="text-lg">{detailTask.title}</DialogTitle>
                      <div className="flex items-center gap-1">
                        {canRefer && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 h-8 shrink-0"
                            onClick={() => {
                              setDetailTask(null);
                              openRefer(detailTask.id);
                            }}
                          >
                            <Forward className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete(detailTask) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 shrink-0"
                            onClick={() => handleDelete(detailTask.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                      <Badge variant="outline" style={{ color: pr.color, borderColor: pr.color + '40' }}>
                        {pr.label}
                      </Badge>
                      {detailTask.referredDate && (
                        <Badge variant="outline" className="border-amber-300 text-amber-600">
                          <Forward className="w-3 h-3 ml-1" />
                          ارجاعی
                        </Badge>
                      )}
                      {detailTask.dueDate && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          <Calendar className="w-3 h-3" />
                          موعد: {formatJalali(detailTask.dueDate)}
                        </span>
                      )}
                    </div>

                    {detailTask.description && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{detailTask.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {assignee && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">{assignee[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-xs text-slate-400">مسئول</div>
                            <div className="text-sm text-slate-700">{assignee}</div>
                          </div>
                        </div>
                      )}
                      {creator && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">{creator[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-xs text-slate-400">ایجادکننده</div>
                            <div className="text-sm text-slate-700">{creator}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Comments section */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-700">نظرات و ارجاعات</h4>
                        <Badge variant="secondary" className="text-xs">
                          {comments.length.toLocaleString('fa-IR')}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                        {comments.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">هنوز نظری ثبت نشده است</p>
                        ) : (
                          comments.map((c) => {
                            const author = getStaffName(c.profileId);
                            return (
                              <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                                <Avatar className="w-6 h-6 shrink-0">
                                  <AvatarFallback className="text-[10px] bg-slate-200 text-slate-600">
                                    {author?.[0] || '؟'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-700">{author || 'کاربر'}</span>
                                    <span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mt-0.5">{c.content}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="نظر یا ارجاع بنویسید..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment();
                            }
                          }}
                        />
                        <Button size="sm" onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}>
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canRefer && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setDetailTask(null);
                            openRefer(detailTask.id);
                          }}
                        >
                          <Forward className="w-4 h-4" />
                          ارجاع وظیفه
                        </Button>
                      )}
                      {canEdit(detailTask) && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setDetailTask(null);
                            openEdit(detailTask);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          ویرایش وظیفه
                        </Button>
                      )}
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
          <DialogHeader>
            <DialogTitle>ارجاع وظیفه</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              می‌توانید این وظیفه را به هر کاربری ارجاع دهید.
            </p>
            <div className="space-y-2">
              <Label>ارجاع به</Label>
              <Select value={referTo} onValueChange={setReferTo}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کاربر..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">انتخاب کنید...</SelectItem>
                  {referOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {fullName(s.firstName, s.lastName)}
                      {s.role === 'admin' || s.role === 'super_admin' || s.role === 'owner'
                        ? ` (${s.role === 'owner' ? 'مدیر سازمان' : s.role === 'super_admin' ? 'سوپرادمین' : 'مدیر'})`
                        : ' (پرسنل)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReferOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleRefer} disabled={referTo === 'none'}>
              <Forward className="w-4 h-4" />
              ارجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
