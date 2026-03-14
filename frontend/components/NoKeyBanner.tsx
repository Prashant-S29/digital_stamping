import Link from 'next/link';

export function NoKeyBanner({ context }: { context: string }) {
  return (
    <div
      className='rounded border px-4 py-3 flex items-center justify-between'
      style={{
        backgroundColor: 'var(--color-pending-dim)',
        borderColor: 'var(--color-pending)',
      }}
    >
      <div className='flex items-center gap-2'>
        <span style={{ color: 'var(--color-pending)' }}>⚠</span>
        <p className='text-sm' style={{ color: 'var(--color-pending)' }}>
          Private key not in session —{' '}
          <span style={{ color: 'var(--color-foreground)' }}>{context}</span>
        </p>
      </div>
      <Link
        href='/profile'
        className='text-xs px-3 py-1.5 rounded flex-shrink-0 ml-4'
        style={{
          backgroundColor: 'var(--color-pending-dim)',
          border: '1px solid var(--color-pending)',
          color: 'var(--color-pending)',
        }}
      >
        Load key →
      </Link>
    </div>
  );
}
