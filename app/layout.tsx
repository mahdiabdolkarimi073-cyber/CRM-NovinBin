import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'نوین بین | سیستم مدیریت یکپارچه سازمان',
  description: 'پلتفرم یکپارچه ERP + CRM برای مدیریت کامل سازمان',
  icons: {
    icon: '/images/1.png',
    shortcut: '/images/1.png',
    apple: '/images/1.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-center" dir="rtl" duration={1500} toastOptions={{ duration: 1500 }} />
        </AuthProvider>
      </body>
    </html>
  );
}
