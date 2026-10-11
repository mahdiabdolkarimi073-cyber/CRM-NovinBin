'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, Plus, Clock, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/format';

export default function KnowledgePage() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData('knowledge_articles', {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
      });
      setArticles(data);
    } catch {
      setArticles([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openArticle = async (a: any) => {
    setSelectedArticle(a);
    try {
      await updateData('knowledge_articles', { id: a.id }, { views: a.views + 1 });
    } catch {
      /* ignore */
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  const filtered = search ? articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())) : articles;
  const categories = Array.from(new Set(articles.map((a) => a.category)));

  if (selectedArticle) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedArticle(null)}>→ بازگشت</Button>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">{selectedArticle.category}</Badge>
              <span className="text-xs text-slate-400">{selectedArticle.views.toLocaleString('fa-IR')} بازدید - {relativeTime(selectedArticle.createdAt)}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">{selectedArticle.title}</h1>
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedArticle.content}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="پایگاه دانش" description="دانش سازمانی و ویکی داخلی" />

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="جستجو در مقالات..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<BookOpen className="w-8 h-8" />} title="مقاله‌ای یافت نشد" description="مقالات دانش سازمانی در /dashboard/documents ایجاد کنید" /></Card>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catArticles = filtered.filter((a) => a.category === cat);
            if (catArticles.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-500" /> {cat} ({catArticles.length.toLocaleString('fa-IR')})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catArticles.map((a) => (
                    <Card key={a.id} className="hover:shadow-md transition-smooth cursor-pointer" onClick={() => openArticle(a)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
                          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{a.title}</div></div>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{a.content}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views.toLocaleString('fa-IR')}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{relativeTime(a.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
