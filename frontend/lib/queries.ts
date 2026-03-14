import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

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
// Auth mutations
// ---------------------------------------------------------------------------

type AuthPayload = { email: string; username?: string; password: string };
type AuthResponse = {
  token: string;
  user: { id: string; email: string; username: string };
  private_key?: string;
  warning?: string;
};

export function useRegister() {
  return useMutation({
    mutationFn: (payload: AuthPayload) =>
      api.post<AuthResponse>('/api/v1/auth/register', payload),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: AuthPayload) =>
      api.post<AuthResponse>('/api/v1/auth/login', payload),
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function useInbox(token: string | null) {
  return useQuery({
    queryKey: queryKeys.messages.inbox,
    queryFn: () => api.get<MessageSummary[]>('/api/v1/messages/inbox', token!),
    enabled: !!token,
  });
}

export function useSent(token: string | null) {
  return useQuery({
    queryKey: queryKeys.messages.sent,
    queryFn: () => api.get<MessageSummary[]>('/api/v1/messages/sent', token!),
    enabled: !!token,
  });
}

export function useMessage(id: string, token: string | null) {
  return useQuery({
    queryKey: queryKeys.messages.detail(id),
    queryFn: () => api.get<MessageDetail>(`/api/v1/messages/${id}`, token),
    enabled: !!id && !!token,
  });
}

export function useSendMessage(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      recipient: string;
      body: string;
      message_hash: string;
      rsa_signature: string;
      stamp_id: string;
      timestamp: string;
    }) => api.post<SendResponse>('/api/v1/messages/send', payload, token!),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.sent });
      qc.invalidateQueries({ queryKey: queryKeys.blockchain.chain });
    },
  });
}

export function useForwardMessage(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      recipient: string;
      rsa_signature: string;
      stamp_id: string;
      timestamp: string;
      message_hash: string;
      encrypted_body?: string;
      encrypted_aes_key_for_sender?: string;
      iv?: string;
    }) =>
      api.post<ForwardResponse>(
        `/api/v1/messages/forward/${payload.id}`,
        {
          recipient: payload.recipient,
          rsa_signature: payload.rsa_signature,
          stamp_id: payload.stamp_id,
          timestamp: payload.timestamp,
          message_hash: payload.message_hash,
          encrypted_body: payload.encrypted_body,
          encrypted_aes_key_for_sender: payload.encrypted_aes_key_for_sender,
          iv: payload.iv,
        },
        token!,
      ),

    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.messages.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.spread(id) });
      qc.invalidateQueries({ queryKey: queryKeys.blockchain.chain });
    },
  });
}

// ---------------------------------------------------------------------------
// Verify + Spread
// ---------------------------------------------------------------------------

export function useVerify(id: string, token: string | null) {
  return useQuery({
    queryKey: queryKeys.verify(id),
    queryFn: () => api.get<VerifyResponse>(`/api/v1/verify/${id}`, token!),
    enabled: !!id && !!token,
  });
}

export function useSpread(id: string, token: string | null) {
  return useQuery({
    queryKey: queryKeys.spread(id),
    queryFn: () =>
      api.get<SpreadResponse>(`/api/v1/verify/spread/${id}`, token!),
    enabled: !!id && !!token,
  });
}

// ---------------------------------------------------------------------------
// Blockchain
// ---------------------------------------------------------------------------

export function useChain() {
  return useQuery({
    queryKey: queryKeys.blockchain.chain,
    queryFn: () => api.get<ChainResponse>('/api/v1/blockchain/chain'),
    refetchInterval: 1000 * 15,
  });
}

export function useChainValidation() {
  return useQuery({
    queryKey: queryKeys.blockchain.validate,
    queryFn: () => api.get<ValidateResponse>('/api/v1/blockchain/validate'),
    refetchInterval: 1000 * 30,
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageSummary = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_hash: string;
  created_at: string;
  has_stamp: boolean;
  block_index: number | null;
};
export type MessageDetail = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_hash: string;
  created_at: string;
  encrypted_body: string;
  encrypted_aes_key: string;
  encrypted_aes_key_sender: string | null;
  iv: string;
  stamp: StampSummary | null;
};
export type StampSummary = {
  stamp_id: string;
  origin_ip: string;
  origin_device: string;
  timestamp: string;
  rsa_signature: string;
  block_index: number;
  is_verified: boolean;
};

export type SendResponse = {
  message_id: string;
  stamp_id: string;
  block_index: number;
  timestamp: string;
  message: string;
};

export type ForwardResponse = {
  message_id: string;
  new_message_id: string;
  stamp_id: string;
  block_index: number;
  hop_number: number;
  forwarded_to: string;
  message: string;
};

export type VerifyResponse = {
  verdict: 'VERIFIED' | 'TAMPERED';
  checks: {
    signature_valid: boolean;
    block_valid: boolean;
    chain_hash_match: boolean;
    chain_valid: boolean;
  };
  stamp: StampSummary & { sender_email: string };
  message_id: string;
  message_hash: string;
};

export type SpreadHop = {
  hop: number;
  action: 'SEND' | 'FORWARD';
  from_user: string | null;
  to_user: string | null;
  timestamp: string;
  block_index: number | null;
};

export type SpreadResponse = {
  message_id: string;
  total_hops: number;
  origin: string;
  spread: SpreadHop[];
};

export type ChainResponse = {
  length: number;
  difficulty: number;
  chain: BlockData[];
};

export type BlockData = {
  index: number;
  hash: string;
  previous_hash: string;
  nonce: number;
  timestamp: string;
  transactions: Record<string, unknown>[];
};

export type ValidateResponse = {
  is_valid: boolean;
  chain_length: number;
  tampered_block: number | null;
  message: string;
};
