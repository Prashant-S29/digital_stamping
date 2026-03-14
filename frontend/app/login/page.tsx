'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/lib/queries';
import { useAuth } from '@/app/providers';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const mutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await mutation.mutateAsync({ email, password });
      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

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
            Blockchain-powered message verification
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
            Sign in to your account
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
                label: 'Password',
                type: 'password',
                val: password,
                set: setPassword,
                ph: '••••••••',
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
              {mutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p
          className='text-center text-xs mt-4'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          No account?{' '}
          <Link href='/register' style={{ color: 'var(--color-primary)' }}>
            Register →
          </Link>
        </p>
      </div>
    </div>
  );
}
