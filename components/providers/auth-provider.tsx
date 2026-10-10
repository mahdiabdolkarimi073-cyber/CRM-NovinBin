'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import type { Profile } from '@/lib/types';

interface DemoInfo {
  slug: string;
  orgId: string;
  expiry: string;
}

interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  profile: Profile;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isDemo: boolean;
  demoInfo: DemoInfo | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; profile?: Profile }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ success: boolean; error?: string; profile?: Profile }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isStaff: false,
  isCustomer: false,
  isDemo: false,
  demoInfo: null,
  signIn: async () => ({ success: false }),
  signInWithPhone: async () => ({ success: false }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

function clientDiag(step: string, info: Record<string, unknown>) {
  console.info(`[AUTH-DIAG][client] step=${step}`, info);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [demoInfo, setDemoInfo] = useState<DemoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const init = async () => {
      let retryCount = 0;
      const maxRetries = 3;

      clientDiag('init_start', { maxRetries });

      const attempt = async (): Promise<void> => {
        if (cancelled) return;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          clientDiag('me_fetch_start', { retryCount, url: '/api/auth/me' });

          const res = await fetch('/api/auth/me', {
            signal: controller.signal,
            credentials: 'include',
            headers: { 'Cache-Control': 'no-store' },
          });
          clearTimeout(timeout);

          if (cancelled) return;
          clientDiag('me_fetch_response', { retryCount, httpStatus: res.status, ok: res.ok });

          const data = await res.json();
          if (cancelled) return;

          clientDiag('me_fetch_data', {
            retryCount,
            hasUser: !!data?.user,
            hasDbError: !!data?.dbError,
            hasDemoExpired: !!data?.demoExpired,
            dataKeys: Object.keys(data || {}),
          });

          if (data && data.user) {
            clientDiag('me_user_authenticated', { retryCount, userId: data.user.id, hasDemo: !!data.demo });
            console.log('[auth-provider] /api/auth/me returned user', { userId: data.user.id, hasDemo: !!data.demo });
            setUser(data.user);
            if (data.demo) setDemoInfo(data.demo);
          } else if (data && data.dbError && retryCount < maxRetries) {
            // Database error — retry after a short delay instead of logging out
            clientDiag('me_db_error_retry', { retryCount: retryCount + 1, maxRetries });
            console.log('[auth-provider] DB error from /api/auth/me, retrying', { retryCount: retryCount + 1, maxRetries });
            retryCount++;
            await new Promise((r) => setTimeout(r, 1000 * retryCount));
            return attempt();
          } else if (data && data.demoExpired) {
            // Demo expired — clear state and redirect to demo login
            clientDiag('me_demo_expired_redirect', { retryCount });
            console.log('[auth-provider] Demo expired, redirecting to login/staff');
            setDemoInfo(null);
            if (typeof window !== 'undefined') {
              window.location.href = '/login/staff';
            }
          } else {
            clientDiag('me_no_user_logged_out', { retryCount, httpStatus: res.status, dataKeys: Object.keys(data || {}) });
            console.log('[auth-provider] /api/auth/me returned no user, treating as logged out', { status: res.status, dataKeys: Object.keys(data || {}) });
          }
        } catch (catchErr) {
          const e = catchErr as Error;
          clientDiag('me_fetch_error', {
            retryCount,
            errorName: e?.name || 'Unknown',
            errorMessage: e?.message || String(catchErr),
          });
          console.log('[auth-provider] /api/auth/me fetch error', { name: (catchErr as Error)?.name, message: (catchErr as Error)?.message, retryCount });
          if (retryCount < maxRetries) {
            retryCount++;
            clientDiag('me_fetch_error_retry', { retryCount, maxRetries });
            await new Promise((r) => setTimeout(r, 1000 * retryCount));
            return attempt();
          }
          clientDiag('me_fetch_error_exhausted_retries', { retryCount, maxRetries });
          // Network error, timeout, JSON parse error — user is effectively logged out
        } finally {
          if (!cancelled && mountedRef.current) {
            setLoading(false);
            clientDiag('loading_set_false', { retryCount });
          }
        }
      };

      await attempt();
    };

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const traceId = `signIn-${Date.now()}`;
    try {
      clientDiag('signIn_start', { traceId, hasEmail: !!email });
      console.log('[auth-provider] signIn attempt', { hasEmail: !!email });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      clientDiag('signIn_response', { traceId, httpStatus: res.status, ok: res.ok, hasUser: !!data?.user, hasError: !!data?.error });
      if (!res.ok) {
        clientDiag('signIn_failed', { traceId, httpStatus: res.status, error: data.error });
        console.log('[auth-provider] signIn failed', { status: res.status, error: data.error });
        return { success: false, error: data.error || 'ورود ناموفق' };
      }
      clientDiag('signIn_success', { traceId, userId: data.user?.id });
      console.log('[auth-provider] signIn success, user set', { userId: data.user?.id });
      setUser(data.user);
      return { success: true, profile: data.user.profile };
    } catch (signInErr) {
      const e = signInErr as Error;
      clientDiag('signIn_fetch_error', { traceId, errorName: e?.name || 'Unknown', errorMessage: e?.message || String(signInErr) });
      console.log('[auth-provider] signIn fetch error', { name: (signInErr as Error)?.name, message: (signInErr as Error)?.message });
      return { success: false, error: 'خطای ارتباط با سرور' };
    }
  }, []);

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    const traceId = `signInPhone-${Date.now()}`;
    try {
      clientDiag('signInWithPhone_start', { traceId, hasPhone: !!phone });
      console.log('[auth-provider] signInWithPhone attempt', { hasPhone: !!phone });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      clientDiag('signInWithPhone_response', { traceId, httpStatus: res.status, ok: res.ok, hasUser: !!data?.user, hasError: !!data?.error });
      if (!res.ok) {
        clientDiag('signInWithPhone_failed', { traceId, httpStatus: res.status, error: data.error });
        console.log('[auth-provider] signInWithPhone failed', { status: res.status, error: data.error });
        return { success: false, error: data.error || 'ورود ناموفق' };
      }
      clientDiag('signInWithPhone_success', { traceId, userId: data.user?.id });
      console.log('[auth-provider] signInWithPhone success, user set', { userId: data.user?.id });
      setUser(data.user);
      return { success: true, profile: data.user.profile };
    } catch (signInPhoneErr) {
      const e = signInPhoneErr as Error;
      clientDiag('signInWithPhone_fetch_error', { traceId, errorName: e?.name || 'Unknown', errorMessage: e?.message || String(signInPhoneErr) });
      console.log('[auth-provider] signInWithPhone fetch error', { name: (signInPhoneErr as Error)?.name, message: (signInPhoneErr as Error)?.message });
      return { success: false, error: 'خطای ارتباط با سرور' };
    }
  }, []);

  const signOut = useCallback(async () => {
    clientDiag('signOut_start', {});
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      clientDiag('signOut_logout_api_called', {});
    } catch {
      clientDiag('signOut_logout_api_error', {});
      // ignore
    }
    setUser(null);
    setDemoInfo(null);
    clientDiag('signOut_state_cleared', {});
  }, []);

  const refreshProfile = useCallback(async () => {
    clientDiag('refreshProfile_start', {});
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', headers: { 'Cache-Control': 'no-store' } });
      const data = await res.json();
      clientDiag('refreshProfile_response', { httpStatus: res.status, hasUser: !!data?.user });
      if (data && data.user) {
        setUser(data.user);
        if (data.demo) setDemoInfo(data.demo); else setDemoInfo(null);
      }
    } catch {
      clientDiag('refreshProfile_error', {});
      // ignore
    }
  }, []);

  const profile = user?.profile ?? null;
  const isCustomer = profile?.userType === 'customer';
  const isStaff = !isCustomer && !!profile;
  const isDemo = !!demoInfo;

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isStaff, isCustomer, isDemo, demoInfo, signIn, signInWithPhone, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
