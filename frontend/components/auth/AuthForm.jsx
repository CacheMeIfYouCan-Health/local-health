'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, signup } from '@lib/auth';

// Only allow same-site paths, so ?next=https://evil.com can't redirect off-site.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/map');

export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawNext = useSearchParams().get('next');
  const next = safeNext(rawNext);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const { mutate, isPending, error } = useMutation({
    mutationFn: isSignup ? signup : login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace(next);
    },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onSubmit = (e) => {
    e.preventDefault();
    mutate(form);
  };

  const input =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

  const otherHref = `${isSignup ? '/login' : '/signup'}${
    rawNext ? `?next=${encodeURIComponent(rawNext)}` : ''
  }`;

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>

        {isSignup && (
          <input
            className={input}
            placeholder="Full name"
            autoComplete="name"
            required
            value={form.name}
            onChange={set('name')}
          />
        )}
        <input
          className={input}
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
        />
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

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/map"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-[15px] font-semibold text-gray-900 transition hover:border-emerald-400 hover:bg-emerald-50 active:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <span aria-hidden>🗺️</span>
          Open map
        </Link>

        <p className="text-center text-sm text-slate-500">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link href={otherHref} className="font-medium text-blue-600 hover:underline">
            {isSignup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </form>
    </div>
  );
}