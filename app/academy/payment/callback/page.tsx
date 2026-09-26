'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const refId = searchParams.get('refId');
  const saleReferenceId = searchParams.get('saleReferenceId');

  useEffect(() => {
    if (status === 'success' || status === 'success_no_settle') {
      const timer = setTimeout(() => { router.replace('/academy/finance'); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <main className="academy-auth-page" dir="rtl">
      <section className="academy-auth-panel">
        <div className="academy-login-card" style={{ textAlign: 'center' }}>
          {status === 'success' || status === 'success_no_settle' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <CheckCircle2 style={{ width: 64, height: 64, color: '#22C55E' }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>پرداخت با موفقیت انجام شد</h1>
              <p style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>کد پیگیری: <span dir="ltr" style={{ fontWeight: 600 }}>{saleReferenceId || refId || '—'}</span></p>
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 16 }}>در حال انتقال به صفحه مالی...</p>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><Loader2 className="animate-spin" style={{ color: '#2563EB' }} /></div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <XCircle style={{ width: 64, height: 64, color: '#EF4444' }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>پرداخت ناموفق بود</h1>
              <p style={{ fontSize: 14, color: '#64748B' }}>{message || 'خطایی در فرآیند پرداخت رخ داد'}</p>
              <button
                type="button"
                className="academy-primary-btn"
                style={{ marginTop: 24 }}
                onClick={() => router.replace('/academy/finance')}
              >
                بازگشت به صفحه مالی
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="student-shell-loading"><Loader2 className="animate-spin" /></div>}>
      <CallbackContent />
    </Suspense>
  );
}
