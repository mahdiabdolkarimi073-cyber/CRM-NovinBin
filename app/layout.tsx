import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SmsReminderPoller } from '@/components/providers/sms-reminder-poller';
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
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            {children}
            <SmsReminderPoller />
            <Toaster position="top-center" dir="rtl" duration={1500} toastOptions={{ duration: 1500 }} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
