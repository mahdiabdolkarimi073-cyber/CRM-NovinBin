'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  ['محصولات', '#features'],
  ['راهکارها', '#solutions'],
  ['صنایع', '#industries'],
  ['مشتریان', '#testimonials'],
  ['مقالات', '#articles'],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1220px] items-center justify-between px-5 lg:px-8">
        <Link href="#top" className="flex items-center gap-3" aria-label="نوین بین">
          <Image src="/images/1.png" alt="نوین بین" width={56} height={56} className="h-14 w-14 object-contain" priority />
          <span className="hidden text-right sm:block">
            <strong className="block text-[16px] font-extrabold text-[#11276a]">نوین بین</strong>
            <small className="text-[11px] font-medium text-slate-500">سیستم مدیریت ارتباط با مشتری</small>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="منوی اصلی">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-[15px] font-bold text-slate-600 transition-colors hover:text-[#2851d9]">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login" className="rounded-full px-5 py-2.5 text-[14px] font-bold text-[#173287] transition hover:bg-[#f2f5ff]">ورود</Link>
          <Link href="/register/customer" className="rounded-full bg-[#2851d9] px-6 py-3 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(40,81,217,.2)] transition hover:-translate-y-0.5 hover:bg-[#1f43bd]">شروع رایگان</Link>
        </div>
        <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full text-[#173287] hover:bg-slate-50 lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? 'بستن منو' : 'باز کردن منو'}>{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3.5 text-[15px] font-bold text-slate-700 hover:bg-[#f3f6ff]">{label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <Link href="/login" className="rounded-full border-2 border-[#2851d9] py-3 text-center text-[14px] font-bold text-[#2851d9]">ورود</Link>
              <Link href="/register/customer" className="rounded-full bg-[#2851d9] py-3 text-center text-[14px] font-bold text-white">شروع رایگان</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
