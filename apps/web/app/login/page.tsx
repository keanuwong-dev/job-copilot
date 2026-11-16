import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { publicSupabaseEnv } from '@/lib/env';

export default function LoginPage() {
  const configured = publicSupabaseEnv() !== null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm configured={configured} />
      </Suspense>
    </main>
  );
}
