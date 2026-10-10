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

      const attempt = async (): Promise<void> => {
        if (cancelled) return;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          const res = await fetch('/api/auth/me', {
            signal: controller.signal,
            credentials: 'include',
            headers: { 'Cache-Control': 'no-store' },
          });
          clearTimeout(timeout);

          if (cancelled) return;
          const data = await res.json();
          if (cancelled) return;

          if (data && data.user) {
            console.log('[auth-provider] /api/auth/me returned user', { userId: data.user.id, hasDemo: !!data.demo });
            setUser(data.user);
            if (data.demo) setDemoInfo(data.demo);
          } else if (data && data.dbError && retryCount < maxRetries) {
            // Database error — retry after a short delay instead of logging out
            console.log('[auth-provider] DB error from /api/auth/me, retrying', { retryCount: retryCount + 1, maxRetries });
            retryCount++;
            await new Promise((r) => setTimeout(r, 1000 * retryCount));
            return attempt();
          } else if (data && data.demoExpired) {
            // Demo expired — clear state and redirect to demo login
            console.log('[auth-provider] Demo expired, redirecting to login/staff');
            setDemoInfo(null);
            if (typeof window !== 'undefined') {
              window.location.href = '/login/staff';
            }
          } else {
            console.log('[auth-provider] /api/auth/me returned no user, treating as logged out', { status: res.status, dataKeys: Object.keys(data || {}) });
          }
        } catch (catchErr) {
          console.log('[auth-provider] /api/auth/me fetch error', { name: (catchErr as Error)?.name, message: (catchErr as Error)?.message, retryCount });
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise((r) => setTimeout(r, 1000 * retryCount));
            return attempt();
          }
          // Network error, timeout, JSON parse error — user is effectively logged out
        } finally {
          if (!cancelled && mountedRef.current) {
            setLoading(false);
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
    try {
      console.log('[auth-provider] signIn attempt', { hasEmail: !!email });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.log('[auth-provider] signIn failed', { status: res.status, error: data.error });
        return { success: false, error: data.error || 'ورود ناموفق' };
      }
      console.log('[auth-provider] signIn success, user set', { userId: data.user?.id });
      setUser(data.user);
      return { success: true, profile: data.user.profile };
    } catch (signInErr) {
      console.log('[auth-provider] signIn fetch error', { name: (signInErr as Error)?.name, message: (signInErr as Error)?.message });
      return { success: false, error: 'خطای ارتباط با سرور' };
    }
  }, []);

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      console.log('[auth-provider] signInWithPhone attempt', { hasPhone: !!phone });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.log('[auth-provider] signInWithPhone failed', { status: res.status, error: data.error });
        return { success: false, error: data.error || 'ورود ناموفق' };
      }
      console.log('[auth-provider] signInWithPhone success, user set', { userId: data.user?.id });
      setUser(data.user);
      return { success: true, profile: data.user.profile };
    } catch (signInPhoneErr) {
      console.log('[auth-provider] signInWithPhone fetch error', { name: (signInPhoneErr as Error)?.name, message: (signInPhoneErr as Error)?.message });
      return { success: false, error: 'خطای ارتباط با سرور' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    setUser(null);
    setDemoInfo(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', headers: { 'Cache-Control': 'no-store' } });
      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
        if (data.demo) setDemoInfo(data.demo); else setDemoInfo(null);
      }
    } catch {
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
