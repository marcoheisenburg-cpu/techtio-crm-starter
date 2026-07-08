'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setMessage('Email and password are required.');
      return;
    }

    setLoading(true);
    setMessage('');

    if (mode === 'login') {
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
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage('Account created. You can now log in.');
    setMode('login');
    setLoading(false);
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
            <h2>{mode === 'login' ? 'Sign in to CRM' : 'Create your account'}</h2>
            <p>
              {mode === 'login'
                ? 'Enter your credentials to continue.'
                : 'Create a secure account for CRM access.'}
            </p>
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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          <button className="btn login-submit" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>

          <button
            className="login-switch"
            type="button"
            onClick={() => {
              setMessage('');
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
          >
            {mode === 'login'
              ? 'Need an account? Create one'
              : 'Already have an account? Back to login'}
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