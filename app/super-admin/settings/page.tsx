'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Globe, Mail, Bell } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div>
      <PageHeader title="تنظیمات پلتفرم" description="پیکربندی سیستم نوین بین" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" /> امنیت</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600">احراز هویت دو مرحله‌ای</span>
              <Badge variant="secondary">غیرفعال</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600">رمز عبور حداقل ۶ کاراکتر</span>
              <Badge variant="default">فعال</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600">قفل حساب پس از ۵ تلاش ناموفق</span>
              <Badge variant="default">فعال</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-5 h-5 text-sky-500" /> عمومی</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600">زبان پیش‌فرض</span>
              <Badge variant="secondary">فارسی</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600">منطقه زمانی</span>
              <Badge variant="secondary">Asia/Tehran</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-sm text-slate-600">واحد پولی</span>
              <Badge variant="secondary">تومان</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
