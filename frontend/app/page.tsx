'use client';

import { useHealth } from '@/lib/queries';

export default function HomePage() {
  const { data, isLoading, isError } = useHealth();

  return (
    <main className='min-h-screen flex flex-col items-center justify-center bg-background p-8'>
      <div className='mb-10 text-center'>
        <h1 className='text-3xl font-bold text-foreground tracking-tight'>
          Digital Stamp
        </h1>
        <p className='text-muted-foreground mt-2 text-sm'>
          Blockchain-powered origin, time &amp; spread verification
        </p>
      </div>

      <div className='w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm'>
        <p className='text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium'>
          System Status
        </p>
        <div className='flex items-center gap-3'>
          <span
            className={`inline-block w-3 h-3 rounded-full shrink-0 ${
              isLoading
                ? 'bg-yellow-400 animate-pulse'
                : data
                  ? 'bg-green-500'
                  : 'bg-red-500'
            }`}
          />
          <span className='text-sm font-medium text-foreground'>
            {isLoading && 'Connecting to backend…'}
            {data && 'Backend: OK'}
            {isError && 'Backend: Unreachable'}
          </span>
        </div>

        {data && (
          <div className='mt-4 space-y-1 text-xs text-muted-foreground font-mono'>
            <div className='flex justify-between'>
              <span>Environment</span>
              <span className='text-foreground'>{data.env}</span>
            </div>
            <div className='flex justify-between'>
              <span>Version</span>
              <span className='text-foreground'>{data.version}</span>
            </div>
          </div>
        )}
      </div>

      <p className='mt-8 text-xs text-muted-foreground'>
        M0 — Scaffold complete ✦ Auth, Blockchain &amp; Messaging coming next
      </p>
    </main>
  );
}
