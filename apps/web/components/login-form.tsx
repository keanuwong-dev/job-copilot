'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { APP_NAME } from '@job-tracker/shared';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ configured }: { configured: boolean }) {
  const params = useSearchParams();
  const error = params.get('error');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabase();
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        setMessage(signInError ? signInError.message : 'Check your email for a sign-in link.');
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : 'Could not send the link.');
      }
    });
  }

  return (
    <div className="w-full max-w-sm rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10">
      <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in with a magic link. No password.</p>
      {error === 'config' ? (
        <p className="mt-4 text-sm text-destructive">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to
          `apps/web/.env.local`, then restart the dev server.
        </p>
      ) : null}
      {error === 'auth' ? (
        <p className="mt-4 text-sm text-destructive">
          That sign-in link did not work. Request a new one.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-5 grid gap-3">
        <div>
          <Label htmlFor="email" className="mb-1.5">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={!configured || pending}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!configured || pending}>
          {pending ? 'Sending…' : 'Email me a link'}
        </Button>
      </form>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </div>
  );
}
