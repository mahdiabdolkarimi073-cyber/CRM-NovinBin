'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { MELLAT_STARTPAY_URL } from '@/lib/mellat';

function GatewayRedirectContent() {
  const searchParams = useSearchParams();
  const refId = searchParams.get('refId') || '';
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (refId && formRef.current) {
      formRef.current.submit();
    }
  }, [refId]);

  if (!refId) {
    return (
      <main className="academy-auth-page" dir="rtl">
        <section className="academy-auth-panel">
          <div className="academy-login-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>
              شناسه تراکنش نامعتبر است
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
              شناسه ارجاع درگاه پرداخت (RefId) یافت نشد. لطفاً مجدداً از بخش مالی یا دوره‌ها اقدام به پرداخت فرمایید.
            </p>
            <a
              href="/academy/course-catalog"
              className="academy-primary-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              بازگشت به فهرست دوره‌ها
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="academy-auth-page" dir="rtl">
      <section className="academy-auth-panel">
        <div className="academy-login-card" style={{ textAlign: 'center', padding: '36px 24px', maxWidth: 440 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <ShieldCheck style={{ width: 40, height: 40 }} />
            </div>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            انتقال به درگاه بهپرداخت ملت
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
            در حال اتصال امن به درگاه پرداخت اینترنتی شاپرک (بانک ملت)... لطفاً چند لحظه شکیبا باشید.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: '#2563EB' }} />
          </div>

          {/* فرم استاندارد ارسال شناسه به بهپرداخت ملت شاپرک */}
          <form ref={formRef} method="POST" action={MELLAT_STARTPAY_URL} style={{ display: 'block' }}>
            <input type="hidden" name="RefId" value={refId} />
            <button
              type="submit"
              className="academy-primary-btn"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
              }}
            >
              <span>انتقال مستقیم به صفحه پرداخت</span>
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </form>

          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 16 }}>
            شناسه پرداخت شاپرک: <span dir="ltr" style={{ fontWeight: 600 }}>{refId}</span>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function GatewayPage() {
  return (
    <Suspense
      fallback={
        <div className="student-shell-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: '#2563EB' }} />
        </div>
      }
    >
      <GatewayRedirectContent />
    </Suspense>
  );
}
