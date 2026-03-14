'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [token, hydrated, router]);

  if (!hydrated) return null;
  if (!token) return null;

  return (
    <div className='flex min-h-screen'>
      <Sidebar />
      <main
        className='flex-1 ml-56 min-h-screen p-8'
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {children}
      </main>
    </div>
  );
}
