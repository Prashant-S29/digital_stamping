import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min — don't refetch if data is fresh
      retry: 1, // retry failed requests once
      refetchOnWindowFocus: false, // don't spam backend on tab switch
    },
    mutations: {
      retry: 0, // never retry mutations (send, forward etc.)
    },
  },
});
