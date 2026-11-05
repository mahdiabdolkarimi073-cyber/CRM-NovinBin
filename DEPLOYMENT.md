# راهنمای استقرار (Deployment Guide) — نوین بین

## پیش‌نیازها

- Node.js نسخه ۱۸ یا بالاتر
- npm نسخه ۹ یا بالاتر
- یک پایگاه داده PostgreSQL (پیشنهاد: Supabase)

## مراحل نصب

### ۱. کلون پروژه و نصب وابستگی‌ها

```bash
npm install
```

### ۲. تنظیم متغیرهای محیطی

فایل `.env` را با مقادیر واقعی پر کنید:

```bash
cp .env.example .env
```

متغیرهای ضروری:
- `DATABASE_URL` — آدرس اتصال به PostgreSQL
- `JWT_SECRET` — کلید امضای توکن JWT (حداقل ۳۲ کاراکتر)
- `NEXT_PUBLIC_APP_URL` — آدرس پایه برنامه

### ۳. اعمال Schema روی دیتابیس

```bash
npm run prisma:generate
npm run prisma:migrate
```

### ۴. اجرای Seed (داده تستی)

```bash
npm run prisma:seed
```

### ۵. Build پروژه

```bash
npm run build
```

### ۶. اجرای Production

```bash
npm start
```

برنامه روی پورت ۳۰۰۰ اجرا می‌شود.

## حساب‌های تستی

| نقش | ایمیل | رمز عبور |
|------|--------|----------|
| سوپرادمین | superadmin@test.com | Admin@123456 |
| مدیر سازمان | admin@test.com | Admin@123456 |
| کارمند | employee@test.com | Admin@123456 |
| مشتری | customer@test.com | Admin@123456 |

## استقرار روی Vercel / Netlify

1. متغیرهای محیطی را در پنل تنظیمات وارد کنید
2. دستور build: `npm run build`
3. دستور start: `npm start`
4. مطمئن شوید `DATABASE_URL` از Supabase Pooler connection string استفاده می‌کند

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## نکات Performance

- در production، `NEXT_PUBLIC_APP_URL` را روی دامنه واقعی تنظیم کنید
- اتصال به دیتابیس از طریق Pooler (پورت ۶۵۴۳) سریع‌تر است
- برای حجم بالا، Prisma connection pooling را فعال کنید
- فایل‌های استاتیک توسط Next.js به صورت خودکار cache می‌شوند
