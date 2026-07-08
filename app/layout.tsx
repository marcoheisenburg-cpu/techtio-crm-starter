import './globals.css';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';

export const metadata: Metadata = {
  title: 'Techtio Ops CRM',
  description: 'Daily spend, accounts, agency, geo and CPL tracking CRM.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}