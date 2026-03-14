'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/compose', label: 'Compose', icon: '✦' },
  { href: '/explorer', label: 'Chain', icon: '⛓' },
  { href: '/profile', label: 'Profile', icon: '◎' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      className='fixed left-0 top-0 h-screen w-56 flex flex-col border-r'
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className='px-5 py-5 border-b'
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className='flex items-center gap-2'>
          <span className='text-lg' style={{ color: 'var(--color-primary)' }}>
            ⬡
          </span>
          <span
            className='font-mono text-sm font-bold tracking-tight'
            style={{ color: 'var(--color-foreground)' }}
          >
            DIGITAL
            <br />
            STAMP
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className='flex-1 px-3 py-4 space-y-1'>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className='flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors'
              style={{
                backgroundColor: active
                  ? 'var(--color-primary-dim)'
                  : 'transparent',
                color: active
                  ? 'var(--color-primary)'
                  : 'var(--color-muted-foreground)',
              }}
            >
              <span className='font-mono text-xs'>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div
          className='px-4 py-4 border-t'
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p
            className='text-xs mb-1'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Signed in as
          </p>
          <p
            className='text-sm font-medium truncate'
            style={{ color: 'var(--color-foreground)' }}
          >
            {user.email}
          </p>
          <button
            onClick={handleLogout}
            className='mt-3 text-xs transition-colors'
            style={{ color: 'var(--color-muted-foreground)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--color-tampered)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--color-muted-foreground)')
            }
          >
            Sign out →
          </button>
        </div>
      )}
    </aside>
  );
}
