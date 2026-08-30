# نوین بین - سیستم مدیریت یکپارچه سازمان (Enterprise ERP + CRM SaaS)

پلتفرم کامل مدیریت سازمان شامل CRM، فروش، حسابداری، انبار، منابع انسانی و اتوماسیون کسب‌وکار.

## معماری

```
Next.js App Router (TypeScript)
       ↓
  Service Layer (lib/services/)
       ↓
  Repository Layer (BaseRepository)
       ↓
  Supabase PostgreSQL
```

### لایه‌ها
- **Frontend**: Next.js 13 App Router + TypeScript + Tailwind CSS + shadcn/ui
- **Service Layer**: ماژول‌های CRM، Sales، Accounting، Inventory، HR، Platform
- **Repository Layer**: الگوی BaseRepository برای CRUD operations با tenant isolation
- **Database**: PostgreSQL (Supabase) با Row Level Security

## ماژول‌ها

### ماژول‌های CRM
- مدیریت مشتریان (حقیقی/حقوقی) با صفحه 360 درجه
- سرنخ‌های فروش با تبدیل به مشتری
- قیف فروش کانبان با Drag & Drop
- باشگاه مشتریان (امتیازات، سطح، کیف پول)

### ماژول‌های فروش
- محصولات و دسته‌بندی
- سفارشات با محاسبه مالیات و تخفیف
- فاکتورها با مدیریت پرداخت

### ماژول‌های ERP
- **حسابداری**: چارت حساب‌ها، اسناد حسابداری، گزارش‌های مالی
- **انبار**: چند انباره، حرکات انبار، هشدار موجودی کم
- **منابع انسانی**: کارکنان، حضور و غیاب، مرخصی

### ماژول‌های عملیات
- وظایف با تابلو کانبان
- جلسات با یادآوری
- تیکت‌های پشتیبانی
- مرکز اعلان‌ها

### پنل سوپر ادمین (مدیریت پلتفرم)
- داشبورد پلتفرم
- مدیریت سازمان‌ها (Tenants)
- پلن‌های اشتراک
- ماژول‌های قابل فروش
- اشتراک‌ها و صورتحساب
- مانیتورینگ مصرف

### پورتال مشتریان
- داشبورد اختصاصی
- سفارشات و فاکتورها
- تیکت‌های پشتیبانی
- باشگاه مشتریان

## ساختار پروژه

```
├── app/
│   ├── (landing)/             # صفحه اصلی
│   ├── login/                 # ورود پرسنل و مشتری
│   ├── register/              # ثبت‌نام پرسنل و مشتری
│   ├── dashboard/             # پنل مدیریت سازمان
│   │   ├── customers/         # مشتریان + جزئیات
│   │   ├── leads/             # سرنخ‌ها
│   │   ├── pipeline/          # قیف فروش
│   │   ├── tasks/             # وظایف
│   │   ├── products/          # محصولات
│   │   ├── orders/            # سفارشات
│   │   ├── invoices/          # فاکتورها
│   │   ├── meetings/          # جلسات
│   │   ├── tickets/           # تیکت‌ها
│   │   ├── accounting/        # حسابداری
│   │   ├── inventory/         # انبار
│   │   ├── hr/                # منابع انسانی
│   │   ├── loyalty/           # باشگاه مشتریان
│   │   ├── notifications/     # اعلان‌ها
│   │   └── settings/          # تنظیمات
│   ├── portal/                # پورتال مشتریان
│   └── super-admin/           # پنل سوپر ادمین
├── components/
│   ├── ui/                    # کامپوننت‌های shadcn/ui
│   ├── dashboard/             # کامپوننت‌های داشبورد
│   └── providers/             # Auth Provider
├── lib/
│   ├── services/              # Service Layer
│   │   ├── base.ts            # BaseRepository + helpers
│   │   ├── crm.ts             # CRM services
│   │   ├── tasks.ts           # Task & Meeting services
│   │   ├── business.ts        # Sales, Accounting, Inventory, HR
│   │   └── platform.ts        # SaaS Platform services
│   ├── supabase/              # Supabase client
│   ├── types.ts               # TypeScript types
│   ├── constants.ts           # Constants & helpers
│   └── format.ts              # Persian formatting
├── hooks/
│   ├── use-services.ts        # Service layer hook
│   └── use-toast.ts           # Toast notifications
├── prisma/
│   └── schema.prisma          # Prisma schema (source of truth)
└── supabase/
    └── migrations/            # SQL migrations
```

## نصب و راه‌اندازی

```bash
# نصب وابستگی‌ها
npm install

# کپی فایل محیط
cp .env.example .env
# مقادیر Supabase را در .env قرار دهید

# اجرای توسعه
npm run dev

# build تولیدی
npm run build

# اجرای تولید
npm start
```

## امنیت

- **Multi-Tenant**: هر سازمان فقط داده‌های خود را می‌بیند
- **Row Level Security**: در سطح دیتابیس
- **RBAC**: نقش‌های سوپر ادمین، مدیر، پرسنل، مشتری
- **Audit Log**: ثبت تمام عملیات حساس

## Deploy

پروژه آماده deploy روی Vercel، Netlify یا هر سرور Node.js است.

### Vercel
1. پروژه را به GitHub push کنید
2. در Vercel import کنید
3. Environment variables را از .env.example تنظیم کنید
4. Deploy

### Netlify
1. پروژه را به GitHub push کنید
2. در Netlify import کنید
3. Environment variables را تنظیم کنید
4. Deploy

## تکنولوژی‌ها

- Next.js 13 (App Router)
- TypeScript 5.2
- Tailwind CSS 3.3
- shadcn/ui (Radix UI)
- Supabase (PostgreSQL)
- Prisma ORM 5.22
- Recharts (نمودارها)
- Lucide React (آیکون‌ها)
- Sonner (اعلان‌ها)
- Vazirmatn (فونت فارسی)
