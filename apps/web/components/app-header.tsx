'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/applications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppHeader({ email }: { email: string }) {
  const path = usePathname();

  return (
    <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Job Tracker
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <NavLink href="/" active={path === '/'}>
          Tracker
        </NavLink>
        <NavLink href="/profile" active={path.startsWith('/profile')}>
          Profile
        </NavLink>
        <NavLink href="/answers" active={path.startsWith('/answers')}>
          Answers
        </NavLink>
        <NavLink href="/review" active={path.startsWith('/review')}>
          Review
        </NavLink>
        <NavLink href="/settings" active={path.startsWith('/settings')}>
          Settings
        </NavLink>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="max-w-48 truncate text-sm text-muted-foreground">{email}</span>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-2 py-1',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}
