'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { VerifyBadge } from '@/components/VerifyBadge';
import { useAuth } from '@/app/providers';
import { useVerify } from '@/lib/queries';

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { data, isLoading, isError } = useVerify(id, token);

  return (
    <AppShell>
      <div className='max-w-xl animate-fade-up'>
        <pre>{JSON.stringify(data, null, 2)}</pre>
        <div className='mb-8'>
          <Link
            href='/dashboard'
            className='text-xs mb-4 inline-block'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            ← Back
          </Link>
          <h1
            className='font-mono text-xl font-bold tracking-tight'
            style={{ color: 'var(--color-foreground)' }}
          >
            Stamp Verification
          </h1>
          <p
            className='font-mono text-xs mt-1 truncate'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {id}
          </p>
        </div>

        {isLoading && (
          <div className='space-y-3'>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className='h-16 rounded border animate-pulse'
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              />
            ))}
          </div>
        )}

        {isError && (
          <div
            className='rounded border p-4'
            style={{
              backgroundColor: 'var(--color-tampered-dim)',
              borderColor: 'var(--color-tampered)',
            }}
          >
            <p className='text-sm' style={{ color: 'var(--color-tampered)' }}>
              Failed to fetch verification data
            </p>
          </div>
        )}

        {data && (
          <div className='space-y-4'>
            {/* Verdict badge */}
            <VerifyBadge verdict={data.verdict} checks={data.checks} />

            {/* Stamp details */}
            <div
              className='rounded border p-4 font-mono text-xs space-y-2'
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p
                className='text-xs font-sans font-medium tracking-widest uppercase mb-3'
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Stamp Details
              </p>
              {[
                ['Stamp ID', data.stamp.stamp_id],
                ['Sender', data.stamp.sender_email],
                ['Origin IP', data.stamp.origin_ip],
                ['Device', data.stamp.origin_device],
                ['Timestamp', new Date(data.stamp.timestamp).toLocaleString()],
                ['Block', `#${data.stamp.block_index}`],
                ['Msg Hash', data.message_hash.slice(0, 32) + '...'],
                ['Signature', data.stamp.rsa_signature.slice(0, 32) + '...'],
              ].map(([label, value]) => (
                <div key={label} className='flex gap-2'>
                  <span
                    className='w-24 flex-shrink-0'
                    style={{ color: 'var(--color-muted-foreground)' }}
                  >
                    {label}
                  </span>
                  <span
                    className='truncate'
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className='flex gap-3'>
              <Link
                href={`/spread/${id}`}
                className='flex-1 text-center py-2 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                View spread map
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
