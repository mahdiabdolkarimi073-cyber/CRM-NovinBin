'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IdentityForm } from '@/components/irnic/identity-form';

type Identity = { customerName: string; siteName: string; irnicId: string; password: string };

export default function EditIrnicPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<Identity | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/irnic/${params.id}`).then(async (response) => {
      const json = await response.json();
      if (!response.ok) setError(json.error || 'بارگذاری ناموفق بود');
      else setRecord(json.data);
    }).catch(() => setError('بارگذاری ناموفق بود'));
  }, [params.id]);
  if (error) return <div className="p-10 text-center text-sm text-rose-500" dir="rtl">{error}</div>;
  if (!record) return <div className="p-10 text-center text-sm text-slate-400" dir="rtl">در حال بارگذاری...</div>;
  return <IdentityForm id={params.id} initialValues={record} />;
}
