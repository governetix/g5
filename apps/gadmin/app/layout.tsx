import './globals.css';
import type { ReactNode } from 'react';
import { I18nProvider } from '../components/i18n/I18nProvider';

export const metadata = {
  title: 'gAdmin',
  description: 'G5 Admin Panel'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
