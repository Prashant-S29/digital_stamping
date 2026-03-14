'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/app/providers';
import { useSpread, type SpreadHop } from '@/lib/queries';

function HopRow({ hop, isLast }: { hop: SpreadHop; isLast: boolean }) {
  const isForward = hop.action === 'FORWARD';
  return (
    <div className='flex gap-4'>
      {/* Timeline */}
      <div className='flex flex-col items-center'>
        <div
          className='w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold'
          style={{
            backgroundColor: isForward
              ? 'var(--color-primary-dim)'
              : 'var(--color-chain-genesis)',
            color: isForward ? 'var(--color-primary)' : 'white',
            border: `1px solid ${isForward ? 'var(--color-primary)' : 'var(--color-chain-genesis)'}`,
          }}
        >
          {hop.hop}
        </div>
        {!isLast && (
          <div
            className='w-px flex-1 mt-1'
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        )}
      </div>

      {/* Content */}
      <div className='pb-6 flex-1 min-w-0'>
        <div className='flex items-center gap-2 mb-1'>
          <span
            className='text-xs font-mono px-2 py-0.5 rounded'
            style={{
              backgroundColor: isForward
                ? 'var(--color-primary-dim)'
                : 'var(--color-verified-dim)',
              color: isForward
                ? 'var(--color-primary)'
                : 'var(--color-verified)',
            }}
          >
            {hop.action}
          </span>
          {hop.block_index !== null && (
            <span
              className='text-xs font-mono'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              block #{hop.block_index}
            </span>
          )}
        </div>

        <div className='font-mono text-xs space-y-1 mt-2'>
          {hop.from_user && (
            <div className='flex gap-2'>
              <span style={{ color: 'var(--color-muted-foreground)' }}>
                from
              </span>
              <span style={{ color: 'var(--color-foreground)' }}>
                {hop.from_user}
              </span>
            </div>
          )}
          <div className='flex gap-2'>
            <span style={{ color: 'var(--color-muted-foreground)' }}>to </span>
            <span style={{ color: 'var(--color-foreground)' }}>
              {hop.to_user}
            </span>
          </div>
          <div className='flex gap-2'>
            <span style={{ color: 'var(--color-muted-foreground)' }}>at </span>
            <span style={{ color: 'var(--color-foreground)' }}>
              {new Date(hop.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpreadPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { data, isLoading, isError } = useSpread(id, token);

  return (
    <AppShell>
      <div className='max-w-xl animate-fade-up'>
        <div className='mb-8'>
          <Link
            href={`/messages/${id}`}
            className='text-xs mb-4 inline-block'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            ← Back to message
          </Link>
          <h1
            className='font-mono text-xl font-bold tracking-tight'
            style={{ color: 'var(--color-foreground)' }}
          >
            Spread Map
          </h1>
          <p
            className='text-xs mt-1'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Full journey of this message — every hop recorded on blockchain
          </p>
        </div>

        {isLoading && (
          <div className='space-y-3'>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className='h-20 rounded border animate-pulse'
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              />
            ))}
          </div>
        )}

        {isError && (
          <p className='text-sm' style={{ color: 'var(--color-tampered)' }}>
            Failed to load spread data
          </p>
        )}

        {data && (
          <div className='space-y-2'>
            {/* Summary */}
            <div
              className='rounded border p-4 mb-6 flex gap-6'
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div>
                <p
                  className='text-xs'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Origin
                </p>
                <p
                  className='font-mono text-sm mt-0.5'
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {data.origin}
                </p>
              </div>
              <div>
                <p
                  className='text-xs'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Total forwards
                </p>
                <p
                  className='font-mono text-sm mt-0.5'
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {data.total_hops}
                </p>
              </div>
              <div>
                <p
                  className='text-xs'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Total hops
                </p>
                <p
                  className='font-mono text-sm mt-0.5'
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {data.spread.length}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              {data.spread.map((hop, i) => (
                <HopRow
                  key={hop.hop}
                  hop={hop}
                  isLast={i === data.spread.length - 1}
                />
              ))}
            </div>

            {/* Actions */}
            <div className='flex gap-3 pt-2'>
              <Link
                href={`/verify/${id}`}
                className='flex-1 text-center py-2 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                Verify stamp
              </Link>
              <Link
                href='/explorer'
                className='flex-1 text-center py-2 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                Block explorer
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
