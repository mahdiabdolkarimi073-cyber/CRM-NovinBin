'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, Plus, FileText, Download, Trash2, BookOpen, Search } from 'lucide-react';
import { toast } from 'sonner';
import { relativeTime, formatFileSize } from '@/lib/format';

export default function DocumentsPage() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docDialog, setDocDialog] = useState(false);
  const [articleDialog, setArticleDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [docForm, setDocForm] = useState({ name: '', folder: 'عمومی', description: '', accessLevel: 'all' });
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'عمومی' });
  const [folders, setFolders] = useState<string[]>(['عمومی']);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [dcs, arts] = await Promise.all([
        fetchData('documents', { where: {}, orderBy: { createdAt: 'desc' } }),
        fetchData('knowledge_articles', { where: { published: true }, orderBy: { createdAt: 'desc' } }),
      ]);
      setDocs(dcs);
      setArticles(arts);
      const uniqueFolders = Array.from(new Set(dcs.map((d: any) => d.folder).filter(Boolean)));
      setFolders(uniqueFolders.length > 0 ? uniqueFolders : ['عمومی']);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createDoc = async () => {
    if (!profile || !docForm.name) { toast.error('نام سند را وارد کنید'); return; }
    try {
      await createData('documents', {
        name: docForm.name,
        folder: docForm.folder,
        description: docForm.description || null,
        accessLevel: docForm.accessLevel,
        uploadedBy: profile.id,
      });
      toast.success('سند ایجاد شد'); setDocDialog(false);
      setDocForm({ name: '', folder: 'عمومی', description: '', accessLevel: 'all' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const createArticle = async () => {
    if (!profile || !articleForm.title || !articleForm.content) { toast.error('عنوان و محتوا را وارد کنید'); return; }
    try {
      await createData('knowledge_articles', {
        title: articleForm.title,
        content: articleForm.content,
        category: articleForm.category,
        authorId: profile.id,
        published: true,
      });
      toast.success('مقاله ایجاد شد'); setArticleDialog(false);
      setArticleForm({ title: '', content: '', category: 'عمومی' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('حذف این سند؟')) return;
    await deleteData('documents', { id });
    load();
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('حذف این مقاله؟')) return;
    await deleteData('knowledge_articles', { id });
    load();
  };

  const incrementViews = async (id: string, currentViews: number) => {
    await updateData('knowledge_articles', { id }, { views: currentViews + 1 });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  const filteredDocs = search ? docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) : docs;
  const filteredArticles = search ? articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())) : articles;

  return (
    <div>
      <PageHeader title="اسناد و پایگاه دانش" description="مدیریت اسناد سازمانی و دانش داخلی" />

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="جستجو در اسناد و مقالات..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
      </div>

      <Tabs defaultValue="docs">
        <TabsList>
          <TabsTrigger value="docs"><FolderOpen className="w-4 h-4 ml-1" />اسناد</TabsTrigger>
          <TabsTrigger value="knowledge"><BookOpen className="w-4 h-4 ml-1" />پایگاه دانش</TabsTrigger>
        </TabsList>

        {/* Documents */}
        <TabsContent value="docs">
          <div className="flex justify-end mb-3">
            <Dialog open={docDialog} onOpenChange={setDocDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> سند جدید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>افزودن سند</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام سند *</Label><Input value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>پوشه</Label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={docForm.folder} onChange={(e) => setDocForm({ ...docForm, folder: e.target.value })}>
                        {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                        <option value="عمومی">عمومی</option>
                        <option value="مالی">مالی</option>
                        <option value="منابع انسانی">منابع انسانی</option>
                        <option value="قراردادها">قراردادها</option>
                      </select>
                    </div>
                    <div className="space-y-2"><Label>سطح دسترسی</Label>
                      <Select value={docForm.accessLevel} onValueChange={(v) => setDocForm({ ...docForm, accessLevel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="all">همه</SelectItem><SelectItem value="managers">مدیران</SelectItem><SelectItem value="admin">مدیر سازمان</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>توضیحات</Label><Input value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setDocDialog(false)}>انصراف</Button><Button onClick={createDoc}>افزودن</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {filteredDocs.length === 0 ? (
            <Card><EmptyState icon={<FolderOpen className="w-8 h-8" />} title="سندی یافت نشد" description="اسناد سازمانی را آپلود کنید" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((d) => (
                <Card key={d.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                        <div><div className="font-semibold text-sm">{d.name}</div><div className="text-xs text-slate-400">{d.folder}</div></div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteDoc(d.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    {d.description && <div className="text-sm text-slate-500 mb-2">{d.description}</div>}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <Badge variant="outline" className="text-xs">{d.accessLevel === 'all' ? 'همه' : d.accessLevel === 'managers' ? 'مدیران' : 'مدیر'}</Badge>
                      <span className="text-xs text-slate-400">v{d.version.toLocaleString('fa-IR')} - {relativeTime(d.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge">
          <div className="flex justify-end mb-3">
            <Dialog open={articleDialog} onOpenChange={setArticleDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> مقاله جدید</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>ایجاد مقاله دانش</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>عنوان *</Label><Input value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} /></div>
                    <div className="space-y-2"><Label>دسته</Label><Input value={articleForm.category} onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>محتوا *</Label><textarea className="w-full min-h-[200px] border rounded-lg px-3 py-2 text-sm" value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setArticleDialog(false)}>انصراف</Button><Button onClick={createArticle}>انتشار</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {filteredArticles.length === 0 ? (
            <Card><EmptyState icon={<BookOpen className="w-8 h-8" />} title="مقاله‌ای یافت نشد" description="پایگاه دانش سازمان را بسازید" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArticles.map((a) => (
                <Card key={a.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
                        <div><div className="font-semibold text-sm">{a.title}</div><div className="text-xs text-slate-400">{a.category}</div></div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteArticle(a.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-3">{a.content}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">{a.views.toLocaleString('fa-IR')} بازدید - {relativeTime(a.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
