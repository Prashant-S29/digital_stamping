'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createContext, useContext, useEffect, useState } from 'react';
import { queryClient } from '@/lib/query-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthUser = {
  id: string;
  email: string;
  username: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  privateKey: string | null;
  hydrated: boolean;
};

type AuthContextType = AuthState & {
  login: (token: string, user: AuthUser, privateKey?: string) => void;
  logout: () => void;
  setPrivateKey: (key: string) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  privateKey: null,
  hydrated: false,
  login: () => {},
  logout: () => {},
  setPrivateKey: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ---------------------------------------------------------------------------
// Auth Provider
// ---------------------------------------------------------------------------

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    user: null,
    privateKey: null,
    hydrated: false,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('ds_token');
    const storedUser = localStorage.getItem('ds_user');
    const storedKey = sessionStorage.getItem('ds_pk');

    setAuth({
      token: storedToken,
      user: storedUser ? JSON.parse(storedUser) : null,
      privateKey: storedKey,
      hydrated: true,
    });
  }, []);

  const login = (token: string, user: AuthUser, pk?: string) => {
    localStorage.setItem('ds_token', token);
    localStorage.setItem('ds_user', JSON.stringify(user));

    if (pk) sessionStorage.setItem('ds_pk', pk);

    setAuth({
      token,
      user,
      privateKey: pk ?? null,
      hydrated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('ds_token');
    localStorage.removeItem('ds_user');
    sessionStorage.removeItem('ds_pk');

    setAuth({
      token: null,
      user: null,
      privateKey: null,
      hydrated: true,
    });

    queryClient.clear();
  };

  const setPrivateKey = (key: string) => {
    sessionStorage.setItem('ds_pk', key);

    setAuth((prev) => ({
      ...prev,
      privateKey: key,
    }));
  };

  if (!auth.hydrated) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <span
          className='font-mono text-xs animate-pulse-dot'
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Loading...
        </span>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        login,
        logout,
        setPrivateKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Root Providers
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
