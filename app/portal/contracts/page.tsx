'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  FileSignature, Search, Download, Eye, Printer, CheckCircle2,
  Clock, ShieldCheck, FileText, AlertCircle,
} from 'lucide-react';
import { formatJalaliDateTime, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';
import { SignaturePad } from '@/components/ui/signature-pad';
import { ContractPrintView } from '@/components/contracts/contract-print-view';

export default function PortalContractsPage() {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Signature modal
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [contractToSign, setContractToSign] = useState<any | null>(null);
  const [savingSign, setSavingSign] = useState(false);

  // Print view modal
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [activeContractForPrint, setActiveContractForPrint] = useState<any | null>(null);

  // Online PDF preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');

  const loadContracts = useCallback(async () => {
    if (!profile?.customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/customer-contracts');
      const json = await res.json();
      if (res.ok) {
        setContracts(json.data || []);
      } else {
        toast.error(json.error || 'خطا در بارگذاری قراردادها');
      }
    } catch (err: any) {
      toast.error('خطای ارتباط با سرور: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.customerId]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleCustomerSign = async (signatureDataUrl: string) => {
    if (!contractToSign) return;
    setSavingSign(true);
    try {
      const customerName =
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'مشتری';

      const res = await fetch(`/api/customer-contracts/${contractToSign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureDataUrl,
          signerName: customerName,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'خطا در ثبت امضا');
      }

      toast.success(json.message || 'امضای الکترونیکی شما با موفقیت ثبت و قرارداد قفل گردید');
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
    if (!search.trim()) return contracts;
    return contracts.filter((c) =>
      (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [contracts, search]);

  return (
    <div className="space-y-6 text-right pb-12" dir="rtl">
      <PageHeader
        title="قراردادهای من"
        description="مشاهده، دریافت و امضای الکترونیکی قراردادهای منعقد شده"
      />

      {/* Search and Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-slate-200">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="جستجو در عناوین قراردادها..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sky-50/70 border-sky-200">
          <CardContent className="p-4 flex items-center gap-3 text-xs text-sky-800">
            <ShieldCheck className="w-8 h-8 text-sky-600 shrink-0" />
            <div>
              <strong className="block text-sky-950 mb-0.5">امضای الکترونیکی امن</strong>
              قراردادهای امضاشده در سامانه قفل شده و غیرقابل تغییر می‌باشند.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full mb-3" />
            <p className="text-sm">در حال دریافت قراردادها...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="py-16 text-center text-slate-400">
              <FileSignature className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">هنوز قراردادی برای شما ثبت نشده است</p>
              <p className="text-xs text-slate-400 mt-1">پس از بارگذاری قرارداد توسط مدیریت، در این بخش قابل مشاهده و امضا خواهد بود.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => {
            const hasCustomerSigned = !!c.customerSignature;
            const hasAdminSigned = !!c.adminSignature;

            const statusBadge =
              c.status === 'signed_by_both' ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold text-xs py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  امضاشده توسط هر دو طرف
                </Badge>
              ) : c.status === 'signed_by_one' ? (
                <Badge className="bg-sky-50 text-sky-700 border-sky-200 gap-1 font-semibold text-xs py-1">
                  <Clock className="w-3.5 h-3.5" />
                  {hasCustomerSigned ? 'امضاشده توسط شما (در انتظار امضای مدیریت)' : 'امضاشده توسط مدیریت (در انتظار امضای شما)'}
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold text-xs py-1">
                  <Clock className="w-3.5 h-3.5" />
                  در انتظار امضا
                </Badge>
              );

            return (
              <Card key={c.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-900">{c.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span>تاریخ بارگذاری: {c.createdAt ? formatJalaliDateTime(c.createdAt) : '—'}</span>
                            {c.fileSize ? <span>حجم: {formatFileSize(c.fileSize)}</span> : null}
                          </div>
                        </div>
                      </div>

                      {c.description && (
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl pt-1">
                          {c.description}
                        </p>
                      )}

                      <div className="pt-1 flex items-center gap-2">
                        {statusBadge}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Online View/Preview */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewPdfUrl(c.fileUrl);
                          setPreviewOpen(true);
                        }}
                        className="text-xs gap-1.5 h-9"
                      >
                        <Eye className="w-4 h-4 text-sky-600" />
                        مشاهده آنلاین PDF
                      </Button>

                      {/* Download */}
                      <a href={c.fileUrl} download={c.fileName || 'contract.pdf'} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
                          <Download className="w-4 h-4 text-slate-600" />
                          دانلود فایل
                        </Button>
                      </a>

                      {/* Electronic Sign */}
                      {!hasCustomerSigned ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setContractToSign(c);
                            setSignDialogOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-medium h-9"
                        >
                          <FileSignature className="w-4 h-4" />
                          امضای الکترونیکی
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="text-xs text-emerald-700 bg-emerald-50 h-9 gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          توسط شما امضا شده است
                        </Button>
                      )}

                      {/* Print */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveContractForPrint(c);
                          setPrintDialogOpen(true);
                        }}
                        className="text-xs gap-1.5 text-slate-700 h-9"
                      >
                        <Printer className="w-4 h-4" />
                        برگه رسمی چاپ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Customer Signature Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileSignature className="w-5 h-5 text-emerald-600" />
              امضای الکترونیکی قرارداد
            </DialogTitle>
          </DialogHeader>

          {contractToSign && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                <div><strong>قرارداد:</strong> {contractToSign.title}</div>
                <div><strong>نام امضاکننده:</strong> {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'مشتری'}</div>
              </div>

              <SignaturePad
                signerName={[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'مشتری'}
                onSave={handleCustomerSign}
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
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] text-right flex flex-col p-4" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between pb-2">
            <DialogTitle className="text-base font-bold">پیش‌نمایش آنلاین قرارداد PDF</DialogTitle>
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
