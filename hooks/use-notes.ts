'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import type { PersonalNote } from '@/lib/types';

export function useNotes() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchData<PersonalNote>('personal_notes', {
        orderBy: { createdAt: 'desc' },
      });
      setNotes(data);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری یادداشت‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async (data: {
    title: string;
    content?: string;
    color?: string;
    tags?: string[];
    pinned?: boolean;
    isArchived?: boolean;
    isTrashed?: boolean;
    trashedAt?: string | null;
    reminderAt?: string | null;
    reminderEnabled?: boolean;
    reminderDismissed?: boolean;
  }): Promise<PersonalNote | null> => {
    try {
      const note = await createData<PersonalNote>('personal_notes', data);
      setNotes((prev) => [note, ...prev]);
      return note;
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد یادداشت');
      return null;
    }
  }, []);

  const updateNote = useCallback(async (
    id: string,
    data: Partial<{
      title: string;
      content: string;
      color: string;
      tags: string[];
      pinned: boolean;
      isArchived: boolean;
      isTrashed: boolean;
      trashedAt: string | null;
      reminderAt: string | null;
      reminderEnabled: boolean;
      reminderDismissed: boolean;
    }>
  ): Promise<PersonalNote | null> => {
    try {
      const note = await updateData<PersonalNote>('personal_notes', { id }, data);
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    } catch (err: any) {
      setError(err.message || 'خطا در به‌روزرسانی یادداشت');
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteData('personal_notes', { id });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'خطا در حذف یادداشت');
      return false;
    }
  }, []);

  const getNoteById = useCallback(async (id: string): Promise<PersonalNote | null> => {
    try {
      const data = await fetchData<PersonalNote>('personal_notes', {
        where: { id },
      });
      return data[0] || null;
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری یادداشت');
      return null;
    }
  }, []);

  return {
    notes,
    loading,
    error,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
  };
}
