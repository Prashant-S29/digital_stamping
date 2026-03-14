import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Query keys — single source of truth, prevents typos
export const queryKeys = {
  health: ['health'] as const,
  messages: {
    inbox: ['messages', 'inbox'] as const,
    sent: ['messages', 'sent'] as const,
    detail: (id: string) => ['messages', id] as const,
  },
  verify: (id: string) => ['verify', id] as const,
  spread: (id: string) => ['spread', id] as const,
  blockchain: {
    chain: ['blockchain', 'chain'] as const,
    block: (i: number) => ['blockchain', 'block', i] as const,
    validate: ['blockchain', 'validate'] as const,
  },
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () =>
      api.get<{ status: string; env: string; version: string }>('/health'),
  });
}

// ---------------------------------------------------------------------------
// Messages — filled in during M6
// ---------------------------------------------------------------------------
export function useInbox(token: string) {
  return useQuery({
    queryKey: queryKeys.messages.inbox,
    queryFn: () => api.get('/api/v1/messages/inbox', token),
    enabled: !!token,
  });
}

export function useSent(token: string) {
  return useQuery({
    queryKey: queryKeys.messages.sent,
    queryFn: () => api.get('/api/v1/messages/sent', token),
    enabled: !!token,
  });
}

export function useMessage(id: string, token: string) {
  return useQuery({
    queryKey: queryKeys.messages.detail(id),
    queryFn: () => api.get(`/api/v1/messages/${id}`, token),
    enabled: !!id && !!token,
  });
}

// ---------------------------------------------------------------------------
// Verify — filled in during M7
// ---------------------------------------------------------------------------
export function useVerify(id: string, token: string) {
  return useQuery({
    queryKey: queryKeys.verify(id),
    queryFn: () => api.get(`/api/v1/verify/${id}`, token),
    enabled: !!id && !!token,
  });
}

// ---------------------------------------------------------------------------
// Spread — filled in during M7
// ---------------------------------------------------------------------------
export function useSpread(id: string, token: string) {
  return useQuery({
    queryKey: queryKeys.spread(id),
    queryFn: () => api.get(`/api/v1/spread/${id}`, token),
    enabled: !!id && !!token,
  });
}

// ---------------------------------------------------------------------------
// Blockchain — filled in during M3
// ---------------------------------------------------------------------------
export function useChain() {
  return useQuery({
    queryKey: queryKeys.blockchain.chain,
    queryFn: () => api.get('/api/v1/blockchain/chain'),
    refetchInterval: 1000 * 10, // poll every 10s — chain grows as messages are sent
  });
}

export function useBlock(index: number) {
  return useQuery({
    queryKey: queryKeys.blockchain.block(index),
    queryFn: () => api.get(`/api/v1/blockchain/block/${index}`),
    enabled: index >= 0,
  });
}

export function useChainValidation() {
  return useQuery({
    queryKey: queryKeys.blockchain.validate,
    queryFn: () => api.get('/api/v1/blockchain/validate'),
    refetchInterval: 1000 * 30,
  });
}

// ---------------------------------------------------------------------------
// Mutations — filled in during M6
// ---------------------------------------------------------------------------
export function useSendMessage(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { recipient: string; body: string }) =>
      api.post('/api/v1/messages/send', payload, token),
    onSuccess: () => {
      // Invalidate sent box so it refetches
      qc.invalidateQueries({ queryKey: queryKeys.messages.sent });
      qc.invalidateQueries({ queryKey: queryKeys.blockchain.chain });
    },
  });
}

export function useForwardMessage(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recipient }: { id: string; recipient: string }) =>
      api.post(`/api/v1/messages/forward/${id}`, { recipient }, token),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.spread(id) });
      qc.invalidateQueries({ queryKey: queryKeys.blockchain.chain });
    },
  });
}
