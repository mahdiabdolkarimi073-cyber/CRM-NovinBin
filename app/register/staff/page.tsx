'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffRegisterRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/login/staff'); }, [router]);
  return null;
}
