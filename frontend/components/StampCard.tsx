type Stamp = {
  stamp_id: string;
  origin_ip: string;
  origin_device: string;
  timestamp: string;
  rsa_signature: string;
  block_index: number;
  is_verified: boolean;
};

export function StampCard({ stamp }: { stamp: Stamp }) {
  return (
    <div
      className='rounded border p-4 font-mono text-xs space-y-2'
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div className='flex items-center justify-between mb-3'>
        <span
          className='text-xs font-sans font-medium tracking-widest uppercase'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Digital Stamp
        </span>
        <span
          className='text-xs px-2 py-0.5 rounded'
          style={{
            backgroundColor: 'var(--color-verified-dim)',
            color: 'var(--color-verified)',
          }}
        >
          ✓ Stamped
        </span>
      </div>

      {[
        ['Stamp ID', stamp.stamp_id],
        ['Block', `#${stamp.block_index}`],
        ['Origin IP', stamp.origin_ip],
        ['Device', stamp.origin_device],
        ['Timestamp', new Date(stamp.timestamp).toLocaleString()],
        ['Signature', stamp.rsa_signature.slice(0, 32) + '...'],
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
  );
}
