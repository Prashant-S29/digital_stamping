'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/app/providers';
import { NoKeyBanner } from '@/components/NoKeyBanner';

import { useSendMessage, type SendResponse } from '@/lib/queries';
import { createStamp } from '@/lib/crypto';

export default function ComposePage() {
  const router = useRouter();
  const { token, privateKey, user } = useAuth();
  const mutation = useSendMessage(token);

  const [recipient, setRecipient] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SendResponse | null>(null);

  const effectiveKey = privateKey;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!effectiveKey) {
      setError('Private key required to sign the stamp. Paste it below.');
      return;
    }

    try {
      const stamp = await createStamp(user!.id, body, effectiveKey);

      const res = await mutation.mutateAsync({
        recipient,
        body,
        message_hash: stamp.message_hash,
        rsa_signature: stamp.rsa_signature,
        stamp_id: stamp.stamp_id,
        timestamp: stamp.timestamp,
      });

      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  // Success screen
  if (result) {
    return (
      <AppShell>
        <div className='max-w-lg animate-fade-up'>
          <div
            className='rounded border p-6 space-y-4'
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-verified)',
            }}
          >
            <div className='flex items-center gap-3'>
              <span
                className='text-2xl'
                style={{ color: 'var(--color-verified)' }}
              >
                ✓
              </span>
              <div>
                <p
                  className='font-mono font-bold'
                  style={{ color: 'var(--color-verified)' }}
                >
                  Message sent & stamped
                </p>
                <p
                  className='text-xs mt-0.5'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Mined onto the blockchain successfully
                </p>
              </div>
            </div>

            <div
              className='font-mono text-xs space-y-2 border-t pt-4'
              style={{ borderColor: 'var(--color-border)' }}
            >
              {[
                ['Message ID', result.message_id],
                ['Stamp ID', result.stamp_id],
                ['Block', `#${result.block_index}`],
                ['Timestamp', new Date(result.timestamp).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className='flex gap-3'>
                  <span
                    className='w-28 flex-shrink-0'
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

            <div className='flex gap-3 pt-2'>
              <Link
                href={`/verify/${result.message_id}`}
                className='flex-1 text-center py-2 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-primary-dim)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary)',
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
                View on chain
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setBody('');
                  setRecipient('');
                }}
                className='flex-1 py-2 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                New message
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className='max-w-2xl animate-fade-up'>
        <div className='mb-8'>
          <h1
            className='font-mono text-xl font-bold tracking-tight'
            style={{ color: 'var(--color-foreground)' }}
          >
            Compose
          </h1>
          <p
            className='text-xs mt-1'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Your message will be AES-256 encrypted and stamped on the blockchain
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Recipient */}
          <div>
            <label
              className='block text-xs mb-1.5 font-medium'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Recipient email
            </label>
            <input
              type='email'
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              placeholder='bob@example.com'
              className='w-full px-3 py-2.5 rounded text-sm outline-none font-mono'
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = 'var(--color-primary)')
              }
              onBlur={(e) =>
                (e.target.style.borderColor = 'var(--color-border)')
              }
            />
          </div>

          {/* Body */}
          <div>
            <label
              className='block text-xs mb-1.5 font-medium'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder='Write your message here...'
              rows={6}
              className='w-full px-3 py-2.5 rounded text-sm outline-none resize-none leading-relaxed'
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = 'var(--color-primary)')
              }
              onBlur={(e) =>
                (e.target.style.borderColor = 'var(--color-border)')
              }
            />
          </div>

          {/* Private key — only shown if not in session */}
          {!effectiveKey && (
            <NoKeyBanner context='you cannot sign or send messages' />
          )}

          {privateKey && (
            <div
              className='flex items-center gap-2 text-xs'
              style={{ color: 'var(--color-verified)' }}
            >
              <span>✓</span>
              <span>Private key loaded from session</span>
            </div>
          )}

          {error && (
            <p
              className='text-xs px-3 py-2 rounded'
              style={{
                backgroundColor: 'var(--color-tampered-dim)',
                color: 'var(--color-tampered)',
              }}
            >
              {error}
            </p>
          )}

          {/* Mining indicator */}
          {mutation.isPending && (
            <div
              className='rounded border p-4 overflow-hidden relative'
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-primary)',
              }}
            >
              <div className='absolute inset-0 overflow-hidden'>
                <div
                  className='h-0.5 w-full animate-scan'
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    opacity: 0.3,
                  }}
                />
              </div>
              <p
                className='font-mono text-xs relative z-10'
                style={{ color: 'var(--color-primary)' }}
              >
                ⛏ Mining stamp onto blockchain...
              </p>
              <p
                className='text-xs mt-1 relative z-10'
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Running Proof of Work — this may take a moment
              </p>
            </div>
          )}

          <button
            type='submit'
            disabled={mutation.isPending}
            className='w-full py-3 rounded text-sm font-medium glow-primary'
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? 'Stamping...' : 'Send & stamp on blockchain'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
