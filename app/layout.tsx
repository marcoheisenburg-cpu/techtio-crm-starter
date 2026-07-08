import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Techtio Ops CRM',
  description: 'Daily spend, accounts, agency, geo and CPL tracking CRM.'
};

const nav = [
  ['Dashboard', '/dashboard'],
  ['Daily Spend', '/daily-spend'],
  ['Accounts', '/accounts'],
  ['Agencies', '/agencies'],
  ['Offers', '/offers'],
  ['Buyers', '/buyers'],
  ['Reports', '/reports'],
  ['Settings', '/settings']
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="logo">Techtio <span>CRM</span></div>
            <nav className="nav">
              {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
