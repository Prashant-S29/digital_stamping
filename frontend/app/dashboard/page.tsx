'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/app/providers';
import { useInbox, useSent, type MessageSummary } from '@/lib/queries';

function MessageRow({
  msg,
  type,
}: {
  msg: MessageSummary;
  type: 'inbox' | 'sent';
}) {
  return (
    <Link
      href={`/messages/${msg.id}`}
      className='flex items-center justify-between px-4 py-3 rounded border transition-colors group'
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = 'var(--color-border-bright)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = 'var(--color-border)')
      }
    >
      <div className='flex items-center gap-4 min-w-0'>
        {/* Stamp indicator */}
        <span
          className='text-xs font-mono shrink-0'
          style={{
            color: msg.has_stamp
              ? 'var(--color-verified)'
              : 'var(--color-muted-foreground)',
          }}
        >
          {msg.has_stamp ? '✓' : '○'}
        </span>

        <div className='min-w-0'>
          <p
            className='text-xs font-mono truncate'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {type === 'inbox'
              ? `from: ${msg.sender_id.slice(0, 8)}...`
              : `to: ${msg.recipient_id.slice(0, 8)}...`}
          </p>
          <p
            className='text-xs font-mono mt-0.5 truncate'
            style={{ color: 'var(--color-foreground)' }}
          >
            {msg.message_hash.slice(0, 24)}...
          </p>
        </div>
      </div>

      <div className='flex items-center gap-4 shrink-0'>
        {msg.block_index !== null && (
          <span
            className='text-xs font-mono px-2 py-0.5 rounded'
            style={{
              backgroundColor: 'var(--color-primary-dim)',
              color: 'var(--color-primary)',
            }}
          >
            block #{msg.block_index}
          </span>
        )}
        <span
          className='text-xs'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {new Date(msg.created_at).toLocaleDateString()}
        </span>
        <span
          className='text-xs group-hover:translate-x-0.5 transition-transform'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          →
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className='flex flex-col items-center justify-center py-16 text-center'>
      <p
        className='font-mono text-3xl mb-3'
        style={{ color: 'var(--color-border-bright)' }}
      >
        ⬡
      </p>
      <p className='text-sm' style={{ color: 'var(--color-muted-foreground)' }}>
        No {label} messages yet
      </p>
      <Link
        href='/compose'
        className='text-xs mt-3 underline'
        style={{ color: 'var(--color-primary)' }}
      >
        Send your first stamped message →
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');

  const inboxQ = useInbox(token);
  const sentQ = useSent(token);

  const messages = tab === 'inbox' ? inboxQ.data : sentQ.data;
  const isLoading = tab === 'inbox' ? inboxQ.isLoading : sentQ.isLoading;

  return (
    <AppShell>
      <div className='max-w-3xl animate-fade-up'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1
              className='font-mono text-xl font-bold tracking-tight'
              style={{ color: 'var(--color-foreground)' }}
            >
              Messages
            </h1>
            <p
              className='text-xs mt-1'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              All messages are cryptographically stamped on the blockchain
            </p>
          </div>
          <Link
            href='/compose'
            className='px-4 py-2 rounded text-sm font-medium'
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            + Compose
          </Link>
        </div>

        {/* Tabs */}
        <div
          className='flex gap-1 mb-4 border-b'
          style={{ borderColor: 'var(--color-border)' }}
        >
          {(['inbox', 'sent'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className='px-4 py-2 text-sm font-medium capitalize transition-colors relative'
              style={{
                color:
                  tab === t
                    ? 'var(--color-primary)'
                    : 'var(--color-muted-foreground)',
              }}
            >
              {t}
              {tab === t && (
                <span
                  className='absolute bottom-0 left-0 right-0 h-0.5 rounded-full'
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className='space-y-2'>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className='h-14 rounded border animate-pulse'
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              />
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          <div className='space-y-2'>
            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} type={tab} />
            ))}
          </div>
        ) : (
          <EmptyState label={tab} />
        )}
      </div>
    </AppShell>
  );
}
