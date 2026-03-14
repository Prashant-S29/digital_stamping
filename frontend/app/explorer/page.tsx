'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useChain, useChainValidation, type BlockData } from '@/lib/queries';

function BlockCard({
  block,
  isSelected,
  onClick,
}: {
  block: BlockData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isGenesis = block.index === 0;

  return (
    <button
      onClick={onClick}
      className='text-left w-full'
      style={{ outline: 'none' }}
    >
      <div
        className='rounded border p-4 transition-colors cursor-pointer'
        style={{
          backgroundColor: isSelected
            ? 'var(--color-primary-dim)'
            : 'var(--color-surface)',
          borderColor: isSelected
            ? 'var(--color-primary)'
            : isGenesis
              ? 'var(--color-chain-genesis)'
              : 'var(--color-border)',
        }}
      >
        <div className='flex items-center justify-between mb-2'>
          <span
            className='font-mono text-xs font-bold'
            style={{
              color: isGenesis
                ? 'var(--color-chain-genesis)'
                : 'var(--color-primary)',
            }}
          >
            {isGenesis ? 'GENESIS' : `Block #${block.index}`}
          </span>
          <span
            className='text-xs'
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {block.transactions.length} txn
            {block.transactions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p
          className='font-mono text-xs truncate'
          style={{ color: 'var(--color-foreground)' }}
        >
          {block.hash.slice(0, 20)}...
        </p>
        <p
          className='text-xs mt-1'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          nonce: {block.nonce.toLocaleString()}
        </p>
      </div>
    </button>
  );
}

export default function ExplorerPage() {
  const chainQ = useChain();
  const validateQ = useChainValidation();
  const [selected, setSelected] = useState<BlockData | null>(null);

  const chain = chainQ.data;
  const valid = validateQ.data;

  return (
    <AppShell>
      <div className='animate-fade-up'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1
              className='font-mono text-xl font-bold tracking-tight'
              style={{ color: 'var(--color-foreground)' }}
            >
              Block Explorer
            </h1>
            <p
              className='text-xs mt-1'
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Every stamped message is permanently recorded here
            </p>
          </div>

          {/* Chain validity indicator */}
          {valid && (
            <div
              className='flex items-center gap-2 px-3 py-1.5 rounded border'
              style={{
                backgroundColor: valid.is_valid
                  ? 'var(--color-verified-dim)'
                  : 'var(--color-tampered-dim)',
                borderColor: valid.is_valid
                  ? 'var(--color-verified)'
                  : 'var(--color-tampered)',
              }}
            >
              <span
                className='w-1.5 h-1.5 rounded-full animate-pulse-dot'
                style={{
                  backgroundColor: valid.is_valid
                    ? 'var(--color-verified)'
                    : 'var(--color-tampered)',
                }}
              />
              <span
                className='font-mono text-xs'
                style={{
                  color: valid.is_valid
                    ? 'var(--color-verified)'
                    : 'var(--color-tampered)',
                }}
              >
                {valid.is_valid ? 'CHAIN VALID' : 'CHAIN TAMPERED'}
              </span>
              <span
                className='text-xs'
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {valid.chain_length} blocks
              </span>
            </div>
          )}
        </div>

        <div className='flex gap-6'>
          {/* Block list */}
          <div className='w-64 shrink-0 space-y-2'>
            {chainQ.isLoading
              ? [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className='h-20 rounded border animate-pulse'
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  />
                ))
              : chain?.chain.map((block) => (
                  <BlockCard
                    key={block.index}
                    block={block}
                    isSelected={selected?.index === block.index}
                    onClick={() =>
                      setSelected(
                        selected?.index === block.index ? null : block,
                      )
                    }
                  />
                ))}
          </div>

          {/* Block detail */}
          <div className='flex-1 min-w-0 '>
            {selected ? (
              <div
                className='rounded border p-5 relative animate-fade-up'
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <p
                  className='font-mono text-xs font-bold uppercase tracking-widest mb-4'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Block #{selected.index} Details
                </p>

                <div className='font-mono text-xs space-y-2 mb-5'>
                  {[
                    ['Index', selected.index.toString()],
                    ['Hash', selected.hash],
                    ['Previous hash', selected.previous_hash],
                    ['Nonce', selected.nonce.toLocaleString()],
                    [
                      'Timestamp',
                      new Date(selected.timestamp).toLocaleString(),
                    ],
                    ['Transactions', selected.transactions.length.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className='flex gap-3'>
                      <span
                        className='w-28 shrink-0'
                        style={{ color: 'var(--color-muted-foreground)' }}
                      >
                        {label}
                      </span>
                      <span
                        className='break-all '
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Transactions */}
                <p
                  className='font-mono text-xs font-bold uppercase tracking-widest mb-3'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Transactions
                </p>
                <div className='space-y-2 overflow-hidden max-w-5xl'>
                  {selected.transactions.map((txn, i) => (
                    <div
                      key={i}
                      className='rounded   border p-3 font-mono text-xs'
                      style={{
                        backgroundColor: 'var(--color-surface-raised)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <pre
                        className='text-xs overflow-x-auto'
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {JSON.stringify(txn, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className='flex items-center  justify-center h-64 rounded border'
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <p
                  className='text-sm'
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  ← Select a block to inspect
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
