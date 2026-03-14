'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/app/providers';

export default function ProfilePage() {
  const { user, privateKey, setPrivateKey } = useAuth();

  const [pasted, setPasted] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    const key = pasted.trim();
    if (!key.startsWith('-----BEGIN PRIVATE KEY-----')) {
      setError(
        'Invalid key format. Must start with -----BEGIN PRIVATE KEY-----',
      );
      return;
    }
    setPrivateKey(key);
    setSaved(true);
    setError('');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPasted(text.trim());
    };
    reader.readAsText(file);
  };

  return (
    <AppShell>
      <div className='max-w-xl animate-fade-up'>
        <div className='mb-8'>
          <h1
            className='font-mono text-xl font-bold tracking-tight'
            style={{ color: 'var(--color-foreground)' }}
          >
            Profile & Keys
          </h1>
          <p className='text-xs mt-1' style={{ color: 'var(--color-muted-foreground)' }}>
            Your private key is never stored permanently — reload it each
            session to sign messages
          </p>
        </div>

        {/* User info */}
        <div
          className='rounded border p-4 mb-6 font-mono text-xs space-y-2'
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p
            className='font-sans text-xs uppercase tracking-widest mb-3'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Identity
          </p>
          {[
            ['Username', user?.username],
            ['Email', user?.email],
            ['User ID', user?.id],
          ].map(([label, value]) => (
            <div key={label} className='flex gap-3'>
              <span
                className='w-24 flex-shrink-0'
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {label}
              </span>
              <span style={{ color: 'var(--color-foreground)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Private key status */}
        <div
          className='rounded border p-4 mb-4'
          style={{
            backgroundColor: privateKey
              ? 'var(--color-verified-dim)'
              : 'var(--color-tampered-dim)',
            borderColor: privateKey
              ? 'var(--color-verified)'
              : 'var(--color-tampered)',
          }}
        >
          <div className='flex items-center gap-2'>
            <span
              style={{
                color: privateKey
                  ? 'var(--color-verified)'
                  : 'var(--color-tampered)',
              }}
            >
              {privateKey ? '✓' : '✗'}
            </span>
            <p
              className='text-sm font-medium'
              style={{
                color: privateKey
                  ? 'var(--color-verified)'
                  : 'var(--color-tampered)',
              }}
            >
              {privateKey
                ? 'Private key loaded in session'
                : 'Private key not in session'}
            </p>
          </div>
          <p className='text-xs mt-1' style={{ color: 'var(--color-muted-foreground)' }}>
            {privateKey
              ? 'You can send, sign, and decrypt messages. Key clears when you close the tab.'
              : 'Load your private key below to send messages and decrypt your inbox.'}
          </p>
        </div>

        {/* Load key */}
        <div
          className='rounded border p-5 space-y-4'
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p
            className='text-sm font-medium'
            style={{ color: 'var(--color-foreground)' }}
          >
            Load private key
          </p>

          {/* File upload */}
          <div>
            <label
              className='block text-xs mb-2'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Upload .pem file
            </label>
            <label
              className='flex items-center gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors'
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-primary)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-border)')
              }
            >
              <span
                className='text-xs'
                style={{ color: 'var(--color-primary)' }}
              >
                Choose file
              </span>
              <span className='text-xs' style={{ color: 'var(--color-muted-foreground)' }}>
                or drag your .pem file here
              </span>
              <input
                type='file'
                accept='.pem,.key,.txt'
                onChange={handleFile}
                className='hidden'
              />
            </label>
          </div>

          {/* Divider */}
          <div className='flex items-center gap-3'>
            <div
              className='flex-1 h-px'
              style={{ backgroundColor: 'var(--color-border)' }}
            />
            <span className='text-xs' style={{ color: 'var(--color-muted-foreground)' }}>
              or paste
            </span>
            <div
              className='flex-1 h-px'
              style={{ backgroundColor: 'var(--color-border)' }}
            />
          </div>

          {/* Paste */}
          <div>
            <label
              className='block text-xs mb-2'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Paste private key
            </label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={
                '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
              }
              rows={6}
              className='w-full px-3 py-2 rounded text-xs outline-none font-mono resize-none leading-relaxed'
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
          </div>

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

          <button
            onClick={handleSave}
            disabled={!pasted.trim()}
            className='w-full py-2.5 rounded text-sm font-medium transition-colors'
            style={{
              backgroundColor: saved
                ? 'var(--color-verified)'
                : 'var(--color-primary)',
              color: 'white',
              opacity: !pasted.trim() ? 0.5 : 1,
            }}
          >
            {saved ? '✓ Key loaded into session' : 'Load key into session'}
          </button>

          <p
            className='text-xs text-center'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Key is stored in sessionStorage only — cleared automatically when
            you close the tab
          </p>
        </div>
      </div>
    </AppShell>
  );
}
