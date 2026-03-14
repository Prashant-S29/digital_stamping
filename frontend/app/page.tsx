'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './providers';

export default function HomePage() {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) router.push('/dashboard');
    else router.push('/login');
  }, [token, router]);

  return (
    <div
      className='min-h-screen flex items-center justify-center'
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div
        className='font-mono text-xs animate-pulse-dot'
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        Initializing...
      </div>
    </div>
  );
}
