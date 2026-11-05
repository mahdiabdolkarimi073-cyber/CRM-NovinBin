'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Wallet, BookOpen } from 'lucide-react';
import Link from 'next/link';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const refId = searchParams.get('refId');
  const saleReferenceId = searchParams.get('saleReferenceId');
  const code = searchParams.get('code');

  const isSuccess = status === 'success' || status === 'success_no_settle';

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.replace('/academy/finance');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  return (
    <main className="academy-auth-page" dir="rtl">
      <section className="academy-auth-panel">
        <div className="academy-login-card" style={{ textAlign: 'center', maxWidth: 480, padding: '36px 28px' }}>
          {isSuccess ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 style={{ width: 48, height: 48, color: '#16A34A' }} />
                </div>
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
                پرداخت با موفقیت انجام شد
              </h1>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
                تراکنش شما در درگاه بهپرداخت ملت با موفقیت تأیید شد و وضعیت حساب آموزشی شما به‌روزرسانی گردید.
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '16px',
                  marginBottom: 24,
                  textAlign: 'right',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {saleReferenceId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>شماره مرجع شاپرک (SaleReferenceId):</span>
                    <strong dir="ltr" style={{ color: '#0F172A', fontFamily: 'monospace', fontSize: 14 }}>
                      {saleReferenceId}
                    </strong>
                  </div>
                )}
                {refId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>شناسه ارجاع درگاه (RefId):</span>
                    <span dir="ltr" style={{ color: '#334155', fontFamily: 'monospace', fontSize: 13 }}>
                      {refId}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>وضعیت تسویه بانکی:</span>
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>تأیید و تسویه شده</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link
                  href="/academy/finance"
                  className="academy-primary-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    fontSize: 14,
                  }}
                >
                  <Wallet style={{ width: 16, height: 16 }} />
                  <span>مشاهده سوابق و رسیدها در بخش مالی</span>
                </Link>
                <Link
                  href="/academy/course-catalog"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    fontSize: 13,
                    color: '#2563EB',
                    padding: '8px',
                  }}
                >
                  <BookOpen style={{ width: 15, height: 15 }} />
                  <span>بازگشت به فهرست دوره‌ها</span>
                </Link>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 20,
                  fontSize: 12,
                  color: '#94A3B8',
                }}
              >
                <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: '#2563EB' }} />
                <span>انتقال خودکار به بخش مالی تا لحظاتی دیگر...</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#FEE2E2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <XCircle style={{ width: 48, height: 48, color: '#DC2626' }} />
                </div>
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
                پرداخت انجام نشد
              </h1>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                {message || 'فرآیند تراکنش با درگاه بهپرداخت ملت کامل نشد یا توسط کاربر لغو گردید.'}
              </p>

              {code && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#991B1B',
                  }}
                >
                  کد خطای گزارش‌شده از شاپرک: <span dir="ltr" style={{ fontWeight: 700 }}>{code}</span>
                </div>
              )}

              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>
                در صورتی که مبلغی از حساب شما کسر شده باشد، مطابق قوانین شبکه شاپرک ظرف مدت حداکثر ۷۲ ساعت آینده توسط بانک مبدأ به حسابتان عودت داده خواهد شد.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link
                  href="/academy/finance"
                  className="academy-primary-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    fontSize: 14,
                  }}
                >
                  <Wallet style={{ width: 16, height: 16 }} />
                  <span>تلاش مجدد از صفحه مالی</span>
                </Link>
                <Link
                  href="/academy/course-catalog"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    fontSize: 13,
                    color: '#64748B',
                    padding: '8px',
                  }}
                >
                  <ArrowLeft style={{ width: 15, height: 15 }} />
                  <span>بازگشت به فهرست دوره‌ها</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="student-shell-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: '#2563EB' }} />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
