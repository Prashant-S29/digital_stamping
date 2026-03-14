type Check = {
  signature_valid: boolean;
  block_valid: boolean;
  chain_hash_match: boolean;
  chain_valid: boolean;
};

type Props = {
  verdict: 'VERIFIED' | 'TAMPERED';
  checks: Check;
};

const CHECK_LABELS: Record<keyof Check, string> = {
  signature_valid: 'RSA Signature',
  block_valid: 'Block Hash',
  chain_hash_match: 'Message Hash',
  chain_valid: 'Chain Integrity',
};

export function VerifyBadge({ verdict, checks }: Props) {
  const isVerified = verdict === 'VERIFIED';

  return (
    <div
      className='rounded border p-6 space-y-5'
      style={{
        borderColor: isVerified
          ? 'var(--color-verified)'
          : 'var(--color-tampered)',
        backgroundColor: isVerified
          ? 'var(--color-verified-dim)'
          : 'var(--color-tampered-dim)',
      }}
    >
      {/* Verdict */}
      <div className='flex items-center gap-3'>
        <span className='text-3xl'>{isVerified ? '✓' : '✗'}</span>
        <div>
          <p
            className='font-mono font-bold text-xl tracking-wider'
            style={{
              color: isVerified
                ? 'var(--color-verified)'
                : 'var(--color-tampered)',
            }}
          >
            {verdict}
          </p>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {isVerified
              ? 'All cryptographic checks passed'
              : 'One or more checks failed — message may be tampered'}
          </p>
        </div>
      </div>

      {/* Checks */}
      <div className='space-y-2'>
        {(Object.keys(CHECK_LABELS) as (keyof Check)[]).map((key) => (
          <div key={key} className='flex items-center justify-between text-sm'>
            <span style={{ color: 'var(--color-foreground)' }}>
              {CHECK_LABELS[key]}
            </span>
            <span
              className='font-mono text-xs px-2 py-0.5 rounded'
              style={{
                backgroundColor: checks[key]
                  ? 'var(--color-verified-dim)'
                  : 'var(--color-tampered-dim)',
                color: checks[key]
                  ? 'var(--color-verified)'
                  : 'var(--color-tampered)',
              }}
            >
              {checks[key] ? 'PASS' : 'FAIL'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
