'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setMessage('Email and password are required.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-left">
          <div className="login-logo-row">
            <div className="login-logo-mark">T</div>
            <div>
              <h1>Techtio CRM</h1>
              <p>Media buying operations dashboard</p>
            </div>
          </div>

          <div className="login-copy">
            <span className="login-pill">Private Ops Workspace</span>
            <h2>Track spend, buyers, accounts and performance in one place.</h2>
            <p>
              Secure access for Techtio operations. Manage daily spend, budget pools,
              offers, accounts and reporting from one clean dashboard.
            </p>
          </div>

          <div className="login-stats">
            <div>
              <strong>Live</strong>
              <span>Supabase data</span>
            </div>
            <div>
              <strong>CRM</strong>
              <span>Internal only</span>
            </div>
            <div>
              <strong>Ops</strong>
              <span>Daily tracking</span>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span>Welcome back</span>
            <h2>Sign in to CRM</h2>
            <p>Enter your Techtio CRM credentials to continue.</p>
          </div>

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@techtio.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          <button className="btn login-submit" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </button>

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}