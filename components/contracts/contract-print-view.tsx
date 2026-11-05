'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X, Download, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { formatJalaliDateTime } from '@/lib/format';

interface ContractPrintViewProps {
  contract: any;
  onClose?: () => void;
}

export function ContractPrintView({ contract, onClose }: ContractPrintViewProps) {
  if (!contract) return null;

  const handlePrint = () => {
    window.print();
  };

  const statusLabel =
    contract.status === 'signed_by_both'
      ? 'امضاشده توسط هر دو طرف'
      : contract.status === 'signed_by_one'
      ? 'امضاشده توسط یک طرف'
      : 'در انتظار امضا';

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Action buttons (hidden on print) */}
      <div className="flex items-center justify-between print:hidden pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-sky-600 hover:bg-sky-700 text-white gap-2 font-medium">
            <Printer className="w-4 h-4" />
            چاپ قرارداد و امضاها
          </Button>
          {contract.fileUrl && (
            <a href={contract.fileUrl} download={contract.fileName || 'contract.pdf'} target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                دانلود فایل اصلی PDF
              </Button>
            </a>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Printable Sheet */}
      <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b-2 border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">سامانه جامع نوین بین</h1>
            <p className="text-xs text-slate-500 font-medium">برگه مشخصات و سوابق امضای الکترونیکی قرارداد</p>
          </div>
          <div className="text-left font-mono text-xs text-slate-600 space-y-1" dir="ltr">
            <div>شماره شناسایی: {contract.id?.slice(0, 8)}</div>
            <div>تاریخ ثبت: {contract.createdAt ? formatJalaliDateTime(contract.createdAt) : '—'}</div>
            <div className="inline-block px-2.5 py-0.5 rounded bg-slate-100 font-bold text-slate-800 text-right" dir="rtl">
              وضعیت: {statusLabel}
            </div>
          </div>
        </div>

        {/* Contract Title & Description */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <div className="text-xs text-slate-400 font-bold">موضوع و عنوان قرارداد:</div>
          <div className="text-lg font-bold text-slate-900">{contract.title}</div>
          {contract.description && (
            <p className="text-sm text-slate-600 leading-relaxed pt-1 border-t border-slate-200">
              {contract.description}
            </p>
          )}
        </div>

        {/* Parties Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Party A: Organization */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-sky-700 border-b pb-1.5">طرف اول (سازمان / مدیریت):</div>
            <div className="text-sm font-semibold">شرکت نوین بین</div>
            <div className="text-xs text-slate-500">بارگذاری‌کننده: {contract.uploaderName || 'سوپرادمین'}</div>
          </div>

          {/* Party B: Customer */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-indigo-700 border-b pb-1.5">طرف دوم (مشتری):</div>
            <div className="text-sm font-semibold">{contract.customerName || 'نامشخص'}</div>
            {contract.customerNationalId && (
              <div className="text-xs text-slate-500">شناسه / کد ملی: {contract.customerNationalId}</div>
            )}
            {contract.customerPhone && (
              <div className="text-xs text-slate-500">تلفن: {contract.customerPhone}</div>
            )}
          </div>
        </div>

        {/* PDF File Note */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
          <span className="font-semibold">فایل پیوست قرارداد: {contract.fileName || 'نسخه نهایی PDF'}</span>
          <span className="text-blue-700 font-mono text-[11px]">نسخه استاندارد ضمیمه دیتابیس</span>
        </div>

        {/* Electronic Signatures Boxes */}
        <div className="pt-4">
          <h3 className="text-sm font-bold text-slate-800 mb-4 pb-1 border-b border-slate-200">
            امضاهای الکترونیکی ثبت‌شده و تأییدشده
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Super Admin Signature Box */}
            <div className="p-4 rounded-xl border-2 border-slate-200 flex flex-col justify-between min-h-[180px] bg-white">
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">امضای نماینده طرف اول (سوپرادمین):</div>
                <div className="text-sm font-bold text-slate-800">{contract.adminSignerName || 'مدیریت نوین بین'}</div>
              </div>
              <div className="my-2 flex items-center justify-center min-h-[80px]">
                {contract.adminSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contract.adminSignature}
                    alt="امضای سوپرادمین"
                    className="max-h-24 object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" />
                    در انتظار امضای سوپرادمین
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-400 border-t pt-1.5">
                {contract.adminSignedAt ? `زمان ثبت: ${formatJalaliDateTime(contract.adminSignedAt)}` : 'هنوز امضا نشده است'}
              </div>
            </div>

            {/* Customer Signature Box */}
            <div className="p-4 rounded-xl border-2 border-slate-200 flex flex-col justify-between min-h-[180px] bg-white">
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">امضای نماینده طرف دوم (مشتری):</div>
                <div className="text-sm font-bold text-slate-800">{contract.customerSignerName || contract.customerName || 'مشتری'}</div>
              </div>
              <div className="my-2 flex items-center justify-center min-h-[80px]">
                {contract.customerSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contract.customerSignature}
                    alt="امضای مشتری"
                    className="max-h-24 object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" />
                    در انتظار امضای مشتری
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-400 border-t pt-1.5">
                {contract.customerSignedAt ? `زمان ثبت: ${formatJalaliDateTime(contract.customerSignedAt)}` : 'هنوز امضا نشده است'}
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory Legal Disclaimer */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>توضیح حقوقی صریح:</span>
          </div>
          <p>
            این امضا یک تأییدیه الکترونیکی درون‌سیستمی است و تعهد حقوقی مستقل از قوانین جاری کشور ایجاد نمی‌کند. این برگه صرفاً به‌منظور ثبت مستند توافق طرفین در بستر CRM/ERP نوین بین صادر شده و هرگونه ادعا منوط به اصل اسناد و قوانین ناظر خواهد بود.
          </p>
        </div>
      </div>
    </div>
  );
}
