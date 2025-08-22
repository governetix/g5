"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../components/auth/AuthProvider';

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/admin/theme');
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <form onSubmit={onSubmit} className="space-y-4 w-80 border border-border p-6 rounded-md bg-card">
        <h1 className="text-lg font-semibold">Login</h1>
        <div className="space-y-1">
          <label className="block text-sm">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-2 py-1 border rounded bg-background" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-2 py-1 border rounded bg-background" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button disabled={loading} className="w-full py-2 bg-primary text-primary-foreground rounded disabled:opacity-50">
          {loading ? '...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginInner />
    </AuthProvider>
  );
}
