'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DemoLoginPage() {
  const params = useParams();
  const rawSlug = params.slug as string;
  let slug = rawSlug;
  try { slug = decodeURIComponent(rawSlug); } catch {}
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoInfo, setDemoInfo] = useState<any>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/demo/info?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDemoInfo(data);
        }
      })
      .catch(() => setError('خطای ارتباط با سرور'))
      .finally(() => {
        setInfoLoading(false);
        setTimeout(() => passwordRef.current?.focus(), 100);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ورود ناموفق');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('خطای ارتباط با سرور');
      setLoading(false);
    }
  };

  const isExpired = demoInfo?.isExpired;
  const isSuspended = demoInfo?.isSuspended;
  const daysRemaining = demoInfo?.daysRemaining ?? 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo size={90} />
          <h1 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">
            ورود به محیط دمو
          </h1>
          {demoInfo && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {demoInfo.name}
              {demoInfo.companyName ? ` - ${demoInfo.companyName}` : ''}
            </p>
          )}
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-center text-base font-medium text-slate-700 dark:text-slate-200">
              رمز عبور دمو را وارد کنید
            </CardTitle>
          </CardHeader>
          <CardContent>
            {infoLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : error && !demoInfo ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {isExpired && (
                  <Alert className="mb-4 border-orange-200 bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:border-orange-900 dark:text-orange-300">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      این دمو منقضی شده است. برای تمدید با پشتیبانی تماس بگیرید.
                    </AlertDescription>
                  </Alert>
                )}
                {isSuspended && (
                  <Alert className="mb-4 border-red-200 bg-red-50 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      این دمو موقتاً غیرفعال شده است.
                    </AlertDescription>
                  </Alert>
                )}
                {!isExpired && !isSuspended && demoInfo && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>
                      {daysRemaining > 0
                        ? `${daysRemaining.toLocaleString('fa-IR')} روز تا پایان دمو`
                        : 'آخرین روز دمو'}
                    </span>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">رمز عبور</Label>
                    <div className="relative">
                      <Input
                        ref={passwordRef}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="رمز عبور دمو"
                        required
                        disabled={isExpired || isSuspended}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || isExpired || isSuspended}
                  >
                    {loading ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      'ورود به دمو'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          این یک محیط آزمایشی است. تمام داده‌ها بعد از پایان دوره حذف می‌شوند.
        </p>
      </div>
    </div>
  );
}
