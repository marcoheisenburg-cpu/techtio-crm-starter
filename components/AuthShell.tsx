'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

const nav = [
  ['Dashboard', '/dashboard'],
  ['Daily Spend', '/daily-spend'],
  ['Top Up Requests', '/top-up-requests'],
  ['Accounts', '/accounts'],
  ['Agencies', '/agencies'],
  ['Offers', '/offers'],
  ['Buyers', '/buyers'],
  ['Reports', '/reports'],
  ['Settings', '/settings']
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setChecking(false);

      if (!data.session && !isLoginPage) {
        router.replace('/login');
      }

      if (data.session && isLoginPage) {
        router.replace('/dashboard');
      }
    }

    checkSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (!newSession && !isLoginPage) {
        router.replace('/login');
      }

      if (newSession && isLoginPage) {
        router.replace('/dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="auth-loading">
        <div className="auth-card">
          <h1>Checking login...</h1>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <h2>Techtio CRM</h2>
            <p>Ops Dashboard</p>
          </div>
        </div>

        <nav className="nav">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? 'active' : ''}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          className="btn secondary"
          type="button"
          onClick={logout}
          style={{ marginTop: 24, width: '100%' }}
        >
          Logout
        </button>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}