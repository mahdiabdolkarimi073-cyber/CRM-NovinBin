import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  ArrowLeft, BookOpenCheck, CalendarClock, ClipboardList, CreditCard,
  FileText, HeartHandshake, MonitorSmartphone, ScrollText,
  ShieldCheck, Sparkles, Users, Baby, Image as ImageIcon, Wrench,
  Backpack, GraduationCap, UserCheck, MessageCircle, CheckCircle2,
} from 'lucide-react';

const SECTIONS: { id: string; icon: ComponentType<{ size?: number | string; className?: string }>; title: string; items: string[] }[] = [
  {
    id: 's1', icon: ClipboardList, title: 'ثبت‌نام و تعیین سطح',
    items: [
      'ثبت‌نام هنرجو پس از تکمیل اطلاعات و پرداخت مبلغ تعیین‌شده قطعی خواهد شد.',
      'در دوره‌هایی که نیاز به تعیین سطح دارند، تعیین سطح پیش از شروع دوره انجام می‌شود.',
      'انتخاب دوره و سطح آموزشی بر اساس شرایط و توانایی هنرجو انجام خواهد شد.',
    ],
  },
  {
    id: 's2', icon: CreditCard, title: 'پرداخت شهریه',
    items: [
      'شهریه دوره باید مطابق زمان‌بندی اعلام‌شده توسط آموزشگاه پرداخت شود.',
      'ثبت‌نام در ترم جدید منوط به تسویه حساب دوره یا ترم قبلی است.',
      'در صورت توافق آموزشگاه، امکان پرداخت شهریه به‌صورت مرحله‌ای وجود دارد.',
      'هزینه کتاب، جزوه، پک آموزشی یا سایر اقلام آموزشی، در صورت اعلام، جداگانه محاسبه خواهد شد.',
    ],
  },
  {
    id: 's3', icon: CalendarClock, title: 'حضور و غیاب',
    items: [
      'والدین محترم لطفاً به زمان ورود و خروج از کلاس و نیز تعداد غیبت‌ها در طول ترم دقت ویژه داشته باشند.',
      'هر هنرجو در طول ترم می‌تواند ۳ جلسه غیبت داشته باشد.',
      'حضور منظم هنرجو در تمامی جلسات برای پیشرفت آموزشی ضروری است.',
      'غیبت هنرجو باید در اسرع وقت به آموزشگاه اطلاع داده شود.',
      'غیبت بدون اطلاع قبلی، به منزله عدم حضور هنرجو در جلسه محسوب می‌شود.',
      'مسئولیت پیگیری مطالب جلسات ازدست‌رفته بر عهده هنرجو یا والدین خواهد بود.',
    ],
  },
  {
    id: 's4', icon: UserCheck, title: 'تأخیر در حضور',
    items: [
      'هنرجویان موظف‌اند ۵ دقیقه پیش از شروع کلاس در آموزشگاه حضور داشته باشند.',
      'تأخیر مکرر موجب اختلال در روند آموزشی کلاس خواهد شد.',
      'در صورتی که هنرجو بیش از ۱۵ دقیقه تأخیر یا تعجیل داشته باشد، همان جلسه برای ایشان غیبت لحاظ خواهد شد.',
      'در صورت تأخیر، مدرس موظف به تکرار مطالب ارائه‌شده برای هنرجو نخواهد بود.',
      'حداقل یک‌بار مراجعه حضوری والدین به مرکز، قبل یا بعد از ساعت کلاسی، و صحبت با مدرس مربوطه جهت اطلاع از وضعیت درسی در طول ترم الزامی است.',
      'خواهشمند است قبل از اتمام کلاس، جهت بردن فرزند خود در محل حضور داشته باشید.',
      'در صورت تأخیر، توصیه‌های لازم را از قبل به فرزند خود اعلام نمایید و توجیه فرمایید که به هیچ عنوان از آموزشگاه خارج نشود.',
      'آموزشگاه خارج از ساعت کلاسی هیچ‌گونه مسئولیتی در قبال هنرجو بر عهده ندارد.',
      'بنابراین والدین محترم می‌بایست حتماً قبل از اتمام کلاس، جهت بردن فرزند خود در محل حضور داشته باشند. در غیر این صورت، در صورت بروز هر مشکلی، هیچ‌گونه مسئولیتی بر عهده آموزشگاه نخواهد بود.',
      'لازم به ذکر است در ساعات بعد از برگزاری کلاس، ممکن است درب ساختمان بسته و آموزشگاه تعطیل شود؛ لذا مکانی برای منتظر ماندن هنرجو در صورت تأخیر والدین وجود نخواهد داشت.',
    ],
  },
  {
    id: 's5', icon: ShieldCheck, title: 'کلاس جبرانی',
    items: [
      'برگزاری کلاس جبرانی برای غیبت هنرجو، تنها در صورت موافقت آموزشگاه و وجود شرایط لازم امکان‌پذیر است.',
      'در صورت تعطیلی یا لغو کلاس از طرف آموزشگاه، جلسه جایگزین یا جبرانی مطابق برنامه آموزشگاه برگزار خواهد شد.',
    ],
  },
  {
    id: 's6', icon: FileText, title: 'انصراف از دوره',
    items: [
      'درخواست انصراف باید توسط هنرجو یا ولی قانونی وی به آموزشگاه اعلام شود.',
      'شرایط استرداد شهریه بر اساس زمان انصراف، میزان استفاده از دوره و ضوابط اعلام‌شده توسط آموزشگاه تعیین خواهد شد.',
      'پس از دریافت یا استفاده از خدمات آموزشی، امکان استرداد کامل شهریه لزوماً وجود نخواهد داشت.',
    ],
  },
  {
    id: 's7', icon: HeartHandshake, title: 'نظم و رفتار',
    items: [
      'رعایت ادب و احترام نسبت به مدیر، مدرس، کارکنان و سایر هنرجویان الزامی است.',
      'هرگونه توهین، درگیری، ایجاد مزاحمت، بی‌نظمی عمدی یا اخلال در روند کلاس ممنوع است.',
      'در صورت تکرار رفتارهای نامناسب، آموزشگاه می‌تواند مطابق مقررات داخلی نسبت به تذکر یا محدود کردن ادامه حضور هنرجو اقدام کند.',
    ],
  },
  {
    id: 's8', icon: MonitorSmartphone, title: 'استفاده از تلفن همراه و وسایل الکترونیکی',
    items: [
      'استفاده از تلفن همراه در زمان تدریس بدون اجازه مدرس ممنوع است.',
      'تلفن همراه باید در حالت سکوت قرار داشته باشد.',
      'استفاده از لپ‌تاپ یا تبلت در دوره‌های برنامه‌نویسی و طراحی سایت صرفاً در راستای فعالیت آموزشی مجاز است.',
    ],
  },
  {
    id: 's9', icon: Wrench, title: 'حفظ و نگهداری تجهیزات',
    items: [
      'هنرجویان موظف‌اند در حفظ تجهیزات، رایانه‌ها، میز و سایر امکانات آموزشگاه دقت کنند.',
      'خسارت عمدی یا ناشی از بی‌احتیاطی به تجهیزات، مطابق نظر آموزشگاه و ضوابط مربوطه قابل پیگیری خواهد بود.',
    ],
  },
  {
    id: 's10', icon: Backpack, title: 'وسایل شخصی',
    items: [
      'مسئولیت نگهداری از تلفن همراه، کیف، مدارک و سایر وسایل شخصی بر عهده هنرجو است.',
      'آموزشگاه در قبال مفقود شدن وسایل شخصی که بدون مراقبت رها شده‌اند، مسئولیتی نخواهد داشت.',
    ],
  },
  {
    id: 's11', icon: Users, title: 'حضور والدین',
    items: [
      'والدین محترم در زمان برگزاری کلاس باید از ایجاد اختلال در روند آموزش خودداری کنند.',
      'پیگیری وضعیت آموزشی هنرجو از طریق مدیریت یا مسئول مربوطه انجام خواهد شد.',
      'در صورت نیاز، آموزشگاه می‌تواند جلسات مشاوره و گزارش آموزشی برای والدین برگزار کند.',
    ],
  },
  {
    id: 's12', icon: BookOpenCheck, title: 'تکالیف و فعالیت‌های آموزشی',
    items: [
      'انجام تکالیف و تمرین‌های تعیین‌شده توسط مدرس برای پیشرفت هنرجو ضروری است.',
      'در دوره‌های برنامه‌نویسی، طراحی سایت و سایر دوره‌های مهارتی، تمرین خارج از کلاس بخش مهمی از فرایند یادگیری است.',
    ],
  },
  {
    id: 's13', icon: ScrollText, title: 'محتوای آموزشی',
    items: [
      'جزوات، فایل‌ها، ویدئوها، تمرین‌ها و سایر محتواهای ارائه‌شده صرفاً برای استفاده آموزشی هنرجو تهیه شده‌اند.',
      'انتشار، فروش یا در اختیار قرار دادن محتوای اختصاصی آموزشگاه به اشخاص دیگر بدون اجازه آموزشگاه مجاز نیست.',
    ],
  },
  {
    id: 's14', icon: ImageIcon, title: 'عکس و فیلم',
    items: [
      'در صورت برگزاری برنامه‌های آموزشی، کارگاه‌ها یا رویدادهای آموزشگاه، ممکن است عکس یا فیلم تهیه شود.',
      'استفاده تبلیغاتی از تصاویر هنرجویان، به‌ویژه هنرجویان کودک و نوجوان، باید با رعایت رضایت و ضوابط مربوطه انجام شود.',
    ],
  },
  {
    id: 's15', icon: Baby, title: 'دوره‌های ویژه کودکان و نوجوانان',
    items: [
      'حضور به‌موقع و تحویل هنرجو پس از پایان کلاس بر عهده والدین یا سرپرست قانونی است.',
      'والدین موظف‌اند اطلاعات تماس صحیح و به‌روز خود را در اختیار آموزشگاه قرار دهند.',
      'هرگونه تغییر در وضعیت یا شرایطی که بر حضور و آموزش کودک تأثیر می‌گذارد، باید به آموزشگاه اطلاع داده شود.',
    ],
  },
  {
    id: 's16', icon: MessageCircle, title: 'ارتباط با آموزشگاه',
    items: [
      'اطلاعیه‌ها و تغییرات مربوط به کلاس‌ها از طریق کانال‌ها و روش‌های ارتباطی رسمی آموزشگاه اعلام خواهد شد.',
      'والدین و هنرجویان موظف‌اند اطلاعیه‌های رسمی آموزشگاه را پیگیری کنند.',
    ],
  },
  {
    id: 's17', icon: ShieldCheck, title: 'رعایت قوانین آموزشگاه',
    items: [
      'ثبت‌نام در آموزشگاه به منزله مطالعه و پذیرش قوانین و مقررات آموزشی و انضباطی آموزشگاه است.',
    ],
  },
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const toPersian = (n: number) => String(n).split('').map((d) => PERSIAN_DIGITS[Number(d)] ?? d).join('');

export default function AcademyRulesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-800" style={{ fontFamily: 'Vazir, Tahoma, sans-serif' }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0b2a6b 0%, #123f9e 55%, #1d4ed8 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.55) 0, transparent 45%), radial-gradient(circle at 10% 90%, rgba(255,255,255,0.35) 0, transparent 40%)' }} />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-14 sm:py-20 text-center text-white">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold leading-[1.4] tracking-tight">قوانین و مقررات آموزشگاه دنیای الگوریتم</h1>
          <p className="mt-4 text-sm sm:text-lg text-blue-100 leading-[1.9]">برای تجربه‌ای بهتر، منظم‌تر و موفق‌تر در مسیر یادگیری</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/academy/register" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 shadow-md transition hover:bg-blue-50">ثبت‌نام هنرجو</Link>
            <Link href="/academy/login" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">ورود به پنل</Link>
          </div>
        </div>
        <div className="h-6 sm:h-8 rounded-t-[2rem] bg-white" />
      </section>

      {/* Intro + TOC */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-l from-blue-50 via-white to-white p-5 sm:p-7 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow"><Sparkles size={20} /></div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-blue-900">ویژه هنرجویان و والدین محترم</h2>
              <p className="mt-2 text-sm sm:text-[15px] leading-[1.9] text-slate-600">به منظور ایجاد محیطی منظم، آرام و مناسب برای آموزش و همچنین بهره‌مندی هرچه بهتر هنرجویان از دوره‌های آموزشی، رعایت قوانین زیر الزامی است.</p>
            </div>
          </div>
          <nav className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-blue-900">فهرست مطالب</h3>
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="group flex min-h-[44px] items-center gap-2.5 rounded-xl border border-transparent bg-blue-50/60 px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-100/70 hover:text-blue-900">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600/90 text-[11px] font-bold text-white">{toPersian(index + 1)}</span>
                    <span className="leading-6">{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Sections */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-6">
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          return (
            <article key={section.id} id={section.id} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm transition hover:shadow-md hover:border-blue-200">
              <header className="flex items-center gap-3.5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md">
                  <Icon size={22} />
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-blue-800 shadow ring-1 ring-blue-200">{toPersian(index + 1)}</span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-blue-950 leading-7">{section.title}</h2>
              </header>
              <ul className="mt-4 space-y-2.5">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2.5 text-sm sm:text-[15px] leading-[1.9] text-slate-700">
                    <CheckCircle2 size={17} className="mt-1.5 shrink-0 text-blue-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      {/* Footer note */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-l from-blue-50 to-white p-5 sm:p-7 text-center shadow-sm">
          <p className="text-sm sm:text-base font-bold text-blue-900">مدیریت آموزشگاه دنیای الگوریتم (BamaLearn)</p>
          <p className="mt-2 text-sm leading-[1.9] text-slate-600">با آرزوی موفقیت و پیشرفت برای تمامی هنرجویان عزیز.</p>
        </div>
      </section>

      {/* Final acceptance area */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6 sm:p-9 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg"><FileText size={26} /></div>
          <h2 className="text-lg sm:text-2xl font-bold text-blue-950">قوانین را مطالعه کردید؟</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-[1.9] text-slate-600">
            پذیرش قوانین به‌صورت رسمی و در حساب کاربری شما ثبت می‌شود؛ بنابراین باید هنگام ثبت‌نام یا ورود، چک‌باکس پذیرش را در فرم مربوطه علامت بزنید.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/academy/register" className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-800">
              <CheckCircle2 size={18} />
              مطالعه کردم و می‌پذیرم — ثبت‌نام
            </Link>
            <Link href="/academy/login" className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-7 py-3 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-50">
              <BookOpenCheck size={18} />
              ورود به پنل کاربری
            </Link>
          </div>
        </div>
      </section>

      {/* Back links */}
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-6">
          <Link href="/academy/register" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50">
            <ArrowLeft size={16} />
            بازگشت به صفحه ثبت‌نام
          </Link>
          <Link href="/academy/login" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50">
            <ArrowLeft size={16} />
            بازگشت به صفحه ورود
          </Link>
        </div>
      </footer>
    </main>
  );
}
