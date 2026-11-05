'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, FileSignature, Search, Calendar, Save, Loader2, Eye, Printer, Download,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, UserCheck, FileText, UploadCloud,
} from 'lucide-react';
import { formatJalaliDateTime, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';
import { SignaturePad } from '@/components/ui/signature-pad';
import { ContractPrintView } from '@/components/contracts/contract-print-view';

interface CustomerOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
}

export default function CustomerContractsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create contract dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Signing dialog state
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [contractToSign, setContractToSign] = useState<any | null>(null);
  const [savingSign, setSavingSign] = useState(false);

  // Print/Preview dialog state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [activeContractForPrint, setActiveContractForPrint] = useState<any | null>(null);

  // PDF Preview modal
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');

  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    profile?.role === 'owner' ||
    profile?.role === 'admin' ||
    (profile?.userType === 'staff' && (profile?.role === 'manager' || profile?.assignedPages?.includes('/dashboard/customer-contracts')));

  const loadContracts = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customer-contracts');
      const json = await res.json();
      if (res.ok) {
        setContracts(json.data || []);
      } else {
        toast.error(json.error || 'خطا در دریافت قراردادها');
      }
    } catch (err: any) {
      toast.error('خطای ارتباط با سرور: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await fetchData<CustomerOption>('customers', {
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      loadContracts();
      loadCustomers();
    }
  }, [profile, loadContracts, loadCustomers]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('لطفاً مشتری را انتخاب کنید');
      return;
    }
    if (!title.trim()) {
      toast.error('عنوان قرارداد الزامی است');
      return;
    }
    if (!selectedFile) {
      toast.error('لطفاً فایل PDF قرارداد را انتخاب کنید');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload PDF
      const formData = new FormData();
      formData.append('file', selectedFile);

      const upRes = await fetch('/api/upload/customer-contract', {
        method: 'POST',
        body: formData,
      });
      const upJson = await upRes.json();
      if (!upRes.ok) {
        throw new Error(upJson.error || 'خطا در بارگذاری فایل');
      }

      // 2. Create Contract Record
      const createRes = await fetch('/api/customer-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          title: title.trim(),
          description: description.trim(),
          fileUrl: upJson.url,
          fileName: upJson.name,
          fileSize: upJson.size,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson.error || 'خطا در ثبت قرارداد');
      }

      toast.success('قرارداد با موفقیت بارگذاری و ثبت شد');
      setCreateDialogOpen(false);
      setSelectedCustomerId('');
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      loadContracts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAdminSign = async (signatureDataUrl: string) => {
    if (!contractToSign) return;
    setSavingSign(true);
    try {
      const res = await fetch(`/api/customer-contracts/${contractToSign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureDataUrl,
          signerName: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'مدیریت نوین بین',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'خطا در ثبت امضا');
      }

      toast.success(json.message || 'امضای الکترونیکی شما با موفقیت ثبت شد');
      setSignDialogOpen(false);
      setContractToSign(null);
      loadContracts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSign(false);
    }
  };

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        !search ||
        (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.customerName || '').toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, search, statusFilter]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">در حال بررسی دسترسی...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">عدم دسترسی</h2>
        <p className="text-sm text-slate-500 mt-1">بخش بارگذاری و مدیریت قراردادهای مشتریان در اختیار سوپرادمین و مدیران سامانه می‌باشد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right pb-12" dir="rtl">
      <PageHeader
        title="قراردادهای مشتریان"
        description="بارگذاری قرارداد PDF برای مشتریان، امضای الکترونیکی دوطرفه و چاپ رسمی"
      >
        <Button
          onClick={() => {
            if (customers.length === 0) loadCustomers();
            setCreateDialogOpen(true);
          }}
          className="bg-sky-600 hover:bg-sky-700 text-white gap-2 font-medium min-h-[44px] px-4"
        >
          <Plus className="w-4 h-4" />
          <span>بارگذاری قرارداد جدید</span>
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="جستجوی عنوان قرارداد یا مشتری..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">فیلتر وضعیت:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 text-sm">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="pending">در انتظار امضا</SelectItem>
                <SelectItem value="signed_by_one">امضاشده توسط یک طرف</SelectItem>
                <SelectItem value="signed_by_both">امضاشده توسط هر دو طرف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold">
                  <th className="p-3.5">عنوان قرارداد</th>
                  <th className="p-3.5">نام مشتری</th>
                  <th className="p-3.5">تاریخ بارگذاری</th>
                  <th className="p-3.5">بارگذاری‌کننده</th>
                  <th className="p-3.5">وضعیت امضا</th>
                  <th className="p-3.5">فایل PDF</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="inline-block animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" />
                      <p className="text-xs text-slate-400 mt-2">در حال بارگذاری قراردادها...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <FileSignature className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">هیچ قراردادی یافت نشد</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">برای بارگذاری و ثبت قرارداد جدید برای مشتری کلیک کنید.</p>
                      <Button
                        type="button"
                        onClick={() => {
                          if (customers.length === 0) loadCustomers();
                          setCreateDialogOpen(true);
                        }}
                        className="bg-sky-600 hover:bg-sky-700 text-white gap-2 text-xs font-semibold h-10 px-4 min-h-[44px]"
                      >
                        <Plus className="w-4 h-4" />
                        بارگذاری قرارداد جدید
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const statusBadge =
                      c.status === 'signed_by_both' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          امضاشده توسط هر دو طرف
                        </Badge>
                      ) : c.status === 'signed_by_one' ? (
                        <Badge className="bg-sky-50 text-sky-700 border-sky-200 gap-1 font-semibold text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          امضاشده توسط یک طرف
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          در انتظار امضا
                        </Badge>
                      );

                    const canAdminSign = !c.adminSignature;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                            <span>{c.title}</span>
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1">{c.description}</p>
                          )}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">{c.customerName}</td>
                        <td className="p-3.5 text-xs text-slate-500 font-mono">
                          {c.createdAt ? formatJalaliDateTime(c.createdAt) : '—'}
                        </td>
                        <td className="p-3.5 text-xs text-slate-600">{c.uploaderName || 'سوپرادمین'}</td>
                        <td className="p-3.5">{statusBadge}</td>
                        <td className="p-3.5">
                          <a
                            href={c.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{c.fileName || 'دانلود PDF'}</span>
                          </a>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Online Preview button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPreviewPdfUrl(c.fileUrl);
                                setPdfPreviewOpen(true);
                              }}
                              className="text-xs gap-1 text-slate-600 hover:text-sky-600 h-8 px-2"
                              title="مشاهده آنلاین فایل PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              پیش‌نمایش
                            </Button>

                            {/* Electronic Sign button */}
                            {canAdminSign ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setContractToSign(c);
                                  setSignDialogOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 h-8 px-2.5"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                امضای سوپرادمین
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-300">
                                امضا شده توسط شما
                              </Badge>
                            )}

                            {/* Print Sheet button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveContractForPrint(c);
                                setPrintDialogOpen(true);
                              }}
                              className="text-xs gap-1 h-8 px-2.5 text-slate-700"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              برگه چاپ و امضاها
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <UploadCloud className="w-5 h-5 text-sky-600" />
              بارگذاری قرارداد مشتری جدید
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateContract} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">انتخاب مشتری *</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="انتخاب مشتری از دیتابیس..." />
                </SelectTrigger>
                <SelectContent dir="rtl" className="max-h-64">
                  {customers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      در حال دریافت مشتریان یا مشتری‌ای ثبت نشده...
                    </SelectItem>
                  ) : (
                    customers.map((cust) => {
                      const name =
                        cust.companyName ||
                        [cust.firstName, cust.lastName].filter(Boolean).join(' ') ||
                        'مشتری بدون نام';
                      return (
                        <SelectItem key={cust.id} value={cust.id}>
                          {name}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">عنوان قرارداد *</Label>
              <Input
                placeholder="مثال: قرارداد طراحی و توسعه وب‌سایت اختصاصی"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">توضیحات و شرایط تکمیلی</Label>
              <Textarea
                placeholder="توضیحات اختیاری درباره مفاد قرارداد، مدت زمان یا شرایط تحویل..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">فایل قرارداد (فقط PDF) *</Label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
                required
                className="text-sm"
              />
              <p className="text-[11px] text-slate-400">حداکثر حجم مجاز ۲۵ مگابایت می‌باشد.</p>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={uploading}>
                انصراف
              </Button>
              <Button type="submit" disabled={uploading} className="bg-sky-600 hover:bg-sky-700 text-white font-medium gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال بارگذاری و ثبت...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    ثبت قرارداد
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Electronic Signature Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileSignature className="w-5 h-5 text-emerald-600" />
              امضای الکترونیکی قرارداد توسط سوپرادمین
            </DialogTitle>
          </DialogHeader>

          {contractToSign && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                <div><strong>قرارداد:</strong> {contractToSign.title}</div>
                <div><strong>مشتری:</strong> {contractToSign.customerName}</div>
              </div>

              <SignaturePad
                signerName={[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'سوپرادمین'}
                onSave={handleAdminSign}
                onCancel={() => setSignDialogOpen(false)}
                isSaving={savingSign}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print View Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-4xl text-right max-h-[90vh] overflow-y-auto" dir="rtl">
          {activeContractForPrint && (
            <ContractPrintView
              contract={activeContractForPrint}
              onClose={() => setPrintDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Online PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] text-right flex flex-col p-4" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between pb-2">
            <DialogTitle className="text-base font-bold">پیش‌نمایش فایل PDF قرارداد</DialogTitle>
            <a href={previewPdfUrl} target="_blank" rel="noreferrer" download className="text-xs text-sky-600 underline">
              دانلود فایل
            </a>
          </DialogHeader>
          <div className="flex-1 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            <iframe
              src={previewPdfUrl}
              className="w-full h-full border-none"
              title="پیش‌نمایش PDF قرارداد"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
