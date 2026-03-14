'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRegister } from '@/lib/queries';
import { useAuth } from '@/app/providers';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const mutation = useRegister();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await mutation.mutateAsync({ email, username, password });
      setPrivateKey(res.private_key || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-stamp-private-key-${email}.pem`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleContinue = () => {
    if (!mutation.data) return;
    login(mutation.data.token, mutation.data.user, privateKey);
    router.push('/dashboard');
  };

  // Show private key screen after successful registration
  if (privateKey) {
    return (
      <div
        className='min-h-screen flex items-center justify-center px-4'
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className='w-full max-w-lg animate-fade-up'>
          <div
            className='rounded border p-6 space-y-5'
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-pending)',
            }}
          >
            <div className='flex items-start gap-3'>
              <span className='text-xl'>⚠</span>
              <div>
                <h2
                  className='font-mono font-bold text-sm tracking-wide'
                  style={{ color: 'var(--color-pending)' }}
                >
                  SAVE YOUR PRIVATE KEY NOW
                </h2>
                <p
                  className='text-xs mt-1'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  This key will never be shown again. You need it to send and
                  sign messages. If you lose it, your messages cannot be
                  stamped.
                </p>
              </div>
            </div>

            <pre
              className='text-xs p-3 rounded overflow-x-auto font-mono leading-relaxed'
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
            >
              {privateKey}
            </pre>

            <div className='flex gap-3'>
              <button
                onClick={handleCopy}
                className='flex-1 py-2 rounded text-sm font-medium transition-colors'
                style={{
                  backgroundColor: copied
                    ? 'var(--color-verified-dim)'
                    : 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: copied
                    ? 'var(--color-verified)'
                    : 'var(--color-foreground)',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className='flex-1 py-2 rounded text-sm font-medium'
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                Download .pem
              </button>
              <button
                onClick={handleContinue}
                className='flex-1 py-2 rounded text-sm font-medium'
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                }}
              >
                I&apos;ve saved it →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className='min-h-screen flex items-center justify-center px-4'
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className='w-full max-w-sm animate-fade-up'>
        <div className='mb-8 text-center'>
          <p
            className='font-mono text-2xl font-bold mb-1'
            style={{ color: 'var(--color-primary)' }}
          >
            ⬡
          </p>
          <h1
            className='font-mono text-lg font-bold tracking-widest uppercase'
            style={{ color: 'var(--color-foreground)' }}
          >
            Digital Stamp
          </h1>
          <p
            className='text-xs mt-1'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Create your identity on the chain
          </p>
        </div>

        <div
          className='rounded border p-6'
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h2
            className='text-sm font-semibold mb-5'
            style={{ color: 'var(--color-foreground)' }}
          >
            Create account
          </h2>
          <form onSubmit={handleSubmit} className='space-y-4'>
            {[
              {
                label: 'Email',
                type: 'email',
                val: email,
                set: setEmail,
                ph: 'alice@example.com',
              },
              {
                label: 'Username',
                type: 'text',
                val: username,
                set: setUsername,
                ph: 'Alice',
              },
              {
                label: 'Password',
                type: 'password',
                val: password,
                set: setPassword,
                ph: 'Min 8 characters',
              },
            ].map(({ label, type, val, set, ph }) => (
              <div key={label}>
                <label
                  className='block text-xs mb-1.5'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  required
                  placeholder={ph}
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
              </div>
            ))}

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
              type='submit'
              disabled={mutation.isPending}
              className='w-full py-2.5 rounded text-sm font-medium mt-2'
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                opacity: mutation.isPending ? 0.7 : 1,
              }}
            >
              {mutation.isPending ? 'Generating keys...' : 'Create account'}
            </button>
          </form>
        </div>

        <p
          className='text-center text-xs mt-4'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Have an account?{' '}
          <Link href='/login' style={{ color: 'var(--color-primary)' }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
