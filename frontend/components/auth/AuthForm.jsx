'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { login, signup } from '@lib/auth';

export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const { mutate, isPending, error } = useMutation({
    mutationFn: isSignup ? signup : login,
    onSuccess: () => router.replace('/map'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onSubmit = (e) => {
    e.preventDefault();
    mutate(form);
  };

  const input =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>

        {isSignup && (
          <input className={input} placeholder="Full name" autoComplete="name" required value={form.name} onChange={set('name')} />
        )}
        <input className={input} type="email" placeholder="Email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <input
          className={input}
          type="password"
          placeholder="Password"
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          value={form.password}
          onChange={set('password')}
        />

        {error && <p className="text-sm text-red-600">{error.message}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>

        <p className="text-center text-sm text-slate-500">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link href={isSignup ? '/login' : '/signin'} className="font-medium text-blue-600 hover:underline">
            {isSignup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </form>
    </div>
  );
}