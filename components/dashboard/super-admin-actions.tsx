'use client';

import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface SuperAdminActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'default';
  variant?: 'card' | 'table';
}

export function SuperAdminActions({ onView, onEdit, onDelete, size = 'sm', variant = 'card' }: SuperAdminActionsProps) {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  if (!isSuperAdmin) return null;

  const btnSize = size === 'sm' ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0';

  if (variant === 'table') {
    return (
      <div className="flex items-center justify-center gap-1">
        {onView && (
          <Button size="sm" variant="ghost" className={btnSize} onClick={onView} title="مشاهده">
            <Eye className="w-4 h-4 text-sky-600" />
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="ghost" className={btnSize} onClick={onEdit} title="ویرایش">
            <Pencil className="w-4 h-4 text-amber-600" />
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" className={`${btnSize} hover:bg-red-50`} onClick={onDelete} title="حذف">
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {onView && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={onView}>
          <Eye className="w-3 h-3 text-sky-600" />
          مشاهده
        </Button>
      )}
      {onEdit && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={onEdit}>
          <Pencil className="w-3 h-3 text-amber-600" />
          ویرایش
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300" onClick={onDelete}>
          <Trash2 className="w-3 h-3 text-red-600" />
          حذف
        </Button>
      )}
    </div>
  );
}
