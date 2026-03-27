'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StampCard } from '@/components/StampCard';
import { decryptMessage } from '@/lib/crypto';

import { useAuth } from '@/app/providers';
import { NoKeyBanner } from '@/components/NoKeyBanner';

import { useMessage, useForwardMessage } from '@/lib/queries';
import { signPayload } from '@/lib/crypto';

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, privateKey, user } = useAuth();
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);

  const router = useRouter();

  const msgQ = useMessage(id, token);
  const forward = useForwardMessage(token);

  const [showForward, setShowForward] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [fwdError, setFwdError] = useState('');
  const [fwdSuccess, setFwdSuccess] = useState('');

  const msg = msgQ.data;

  // After msgQ.data loads, attempt decrypt if recipient + key available
  useEffect(() => {
    if (!msg || !privateKey) return;

    const isSender = msg.sender_id === user?.id;
    const isRecipient = msg.recipient_id === user?.id;

    if (!isSender && !isRecipient) return;

    // Pick the right encrypted AES key based on who is viewing
    const encryptedKey = isRecipient
      ? msg.encrypted_aes_key
      : msg.encrypted_aes_key_sender;

    if (!encryptedKey || !msg.encrypted_body || !msg.iv) return;

    decryptMessage(msg.encrypted_body, encryptedKey, msg.iv, privateKey)
      .then(setDecryptedBody)
      .catch(() => setDecryptedBody(null));
  }, [msg, privateKey, user]);

  
  
  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKey) { router.push('/profile'); return; }
    if (!msg) { setFwdError('Message not found'); return; }
  
    try {
      const stamp_id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const message_hash = msg.message_hash;
  
      const rsa_signature = await signPayload(
        { stamp_id, sender_id: user!.id, message_hash, timestamp },
        privateKey,
      );
  
      const res = await forward.mutateAsync({
        id,
        recipient,
        rsa_signature,
        stamp_id,
        timestamp,
        message_hash,
        encrypted_body: msg.encrypted_body,
        encrypted_aes_key_for_sender: msg.encrypted_aes_key_sender ?? '',
        iv: msg.iv,
      });
  
      setFwdSuccess(`Forwarded to ${res.forwarded_to} — block #${res.block_index}`);
      setShowForward(false);
      setRecipient('');
    } catch (err: unknown) {
      setFwdError(err instanceof Error ? err.message : 'Forward failed');
    }
  };

  if (msgQ.isLoading) {
    return (
      <AppShell>
        <div className='max-w-2xl'>
          <div
            className='h-6 w-32 rounded animate-pulse mb-6'
            style={{ backgroundColor: 'var(--color-surface)' }}
          />
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className='h-20 rounded border animate-pulse mb-3'
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!msg) return <pre>{JSON.stringify({ msgQ }, null, 2)}</pre>;

  const isRecipient = msg.recipient_id === user?.id;

  return (
    <AppShell>
      <div className='max-w-2xl animate-fade-up'>
        {/* Back */}
        <Link
          href='/dashboard'
          className='text-xs mb-6 inline-block'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          ← Back to messages
        </Link>

        {/* Meta */}
        <div
          className='rounded border p-4 mb-4 font-mono text-xs space-y-1'
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className='flex gap-2'>
            <span
              className='w-24 flex-shrink-0'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Message ID
            </span>
            <span style={{ color: 'var(--color-foreground)' }}>{msg.id}</span>
          </div>
          <div className='flex gap-2'>
            <span
              className='w-24 flex-shrink-0'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Hash
            </span>
            <span style={{ color: 'var(--color-foreground)' }}>
              {msg.message_hash}
            </span>
          </div>
          <div className='flex gap-2'>
            <span
              className='w-24 flex-shrink-0'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Sent
            </span>
            <span style={{ color: 'var(--color-foreground)' }}>
              {new Date(msg.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Body */}
        <div
          className='rounded border p-5 mb-4'
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p
            className='text-xs uppercase tracking-widest mb-3'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Message
          </p>
          {decryptedBody ? (
            <p
              className='text-sm leading-relaxed'
              style={{ color: 'var(--color-foreground)' }}
            >
              {decryptedBody}
            </p>
          ) : isRecipient ? (
            <div className='space-y-3'>
              <NoKeyBanner context='message body is encrypted and cannot be displayed' />
            </div>
          ) : (
            <p
              className='text-sm italic'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Only the recipient can decrypt this message.
            </p>
          )}
        </div>

        {/* Stamp */}
        {msg.stamp && (
          <div className='mb-4'>
            <StampCard stamp={msg.stamp} />
          </div>
        )}

        {/* Actions */}
        <div className='flex gap-3 mb-4'>
          <Link
            href={`/verify/${msg.id}`}
            className='px-4 py-2 rounded text-sm font-medium'
            style={{
              backgroundColor: 'var(--color-primary-dim)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
            }}
          >
            Verify stamp
          </Link>
          <Link
            href={`/spread/${msg.id}`}
            className='px-4 py-2 rounded text-sm font-medium'
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          >
            Spread map
          </Link>
          <button
            onClick={() => setShowForward(!showForward)}
            className='px-4 py-2 rounded text-sm font-medium'
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          >
            Forward
          </button>
        </div>

        {/* Success */}
        {fwdSuccess && (
          <p
            className='text-xs px-3 py-2 rounded mb-3'
            style={{
              backgroundColor: 'var(--color-verified-dim)',
              color: 'var(--color-verified)',
            }}
          >
            ✓ {fwdSuccess}
          </p>
        )}

        {/* Forward form */}
        {showForward && (
          <form
            onSubmit={handleForward}
            className='rounded border p-4 space-y-3'
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p
              className='text-xs font-medium'
              style={{ color: 'var(--color-foreground)' }}
            >
              Forward to
            </p>
            <input
              type='email'
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              placeholder='recipient@example.com'
              className='w-full px-3 py-2 rounded text-sm outline-none font-mono'
              style={{
                backgroundColor: 'var(--color-surface-raised)',
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
            {fwdError && (
              <p className='text-xs' style={{ color: 'var(--color-tampered)' }}>
                {fwdError}
              </p>
            )}
            <div className='flex gap-2'>
              <button
                type='submit'
                disabled={forward.isPending}
                className='px-4 py-1.5 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  opacity: forward.isPending ? 0.7 : 1,
                }}
              >
                {forward.isPending ? 'Mining...' : 'Forward & stamp'}
              </button>
              <button
                type='button'
                onClick={() => setShowForward(false)}
                className='px-4 py-1.5 rounded text-sm'
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
