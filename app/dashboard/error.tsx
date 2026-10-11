'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[dashboard-render]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">بارگذاری این صفحه با مشکل روبه‌رو شد</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          خطا ثبت شد. دوباره تلاش کنید؛ اگر مشکل ادامه داشت، جزئیات خطا را از کنسول مرورگر بررسی کنید.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            تلاش دوباره
          </button>
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            بازگشت
          </button>
        </div>
      </div>
    </div>
  );
}
