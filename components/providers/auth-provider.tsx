'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import type { Profile } from '@/lib/types';

interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; profile?: Profile }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isStaff: false,
  isCustomer: false,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const init = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/auth/me', {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-store' },
        });
        clearTimeout(timeout);

        if (cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        if (data && data.user) {
          setUser(data.user);
        }
      } catch {
        // Network error, timeout, JSON parse error — user is effectively logged out
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'ورود ناموفق' };
      setUser(data.user);
      return { success: true, profile: data.user.profile };
    } catch {
      return { success: false, error: 'خطای ارتباط با سرور' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { 'Cache-Control': 'no-store' } });
      const data = await res.json();
      if (data && data.user) setUser(data.user);
    } catch {
      // ignore
    }
  }, []);

  const profile = user?.profile ?? null;
  const isCustomer = profile?.userType === 'customer';
  const isStaff = !isCustomer && !!profile;

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isStaff, isCustomer, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
