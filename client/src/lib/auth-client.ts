// Stub adapter: replaces better-auth with GiacNgoVN's JWT auth
// Pages from bodhi-lab import from "@/lib/auth-client"

import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

// Minimal useSession hook that reads from localStorage (GiacNgoVN stores user there)
export function useSession() {
  const [data, setData] = useState<{ user: any } | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setData({ user });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
    setIsPending(false);
  }, []);

  return { data, isPending };
}

// Stubs for auth methods – redirect to GiacNgoVN login page
export const signIn = {
  email: async ({ email, password, callbackURL: _callbackURL, fetchOptions }: { 
    email: string; 
    password: string; 
    callbackURL?: string;
    fetchOptions?: {
      onSuccess?: (ctx: { data?: { user?: Record<string, unknown> } }) => void;
      onError?: (ctx: { error: { message?: string } }) => void;
    };
  }) => {
    try {
      const res: any = await apiService.login(email, password);
      // The backend returns the user object directly, containing apiToken
      if (res && res.apiToken) {
        localStorage.setItem('apiToken', res.apiToken);
        localStorage.setItem('user', JSON.stringify(res));
        if (fetchOptions?.onSuccess) {
          fetchOptions.onSuccess({ data: { user: res } });
          return;
        }
        window.location.href = '/';
        return { data: res, error: null };
      }
      if (fetchOptions?.onError) {
        fetchOptions.onError({ error: { message: 'Login failed' } });
        return;
      }
      return { data: null, error: { message: 'Login failed' } };
    } catch (e: any) {
      if (fetchOptions?.onError) {
        fetchOptions.onError({ error: { message: e.message } });
        return;
      }
      return { data: null, error: { message: e.message } };
    }
  }
};

export const signOut = async () => {
  localStorage.removeItem('apiToken');
  localStorage.removeItem('user');
  window.location.href = '/';
};

export const signUp = {
  email: async (_data: any) => ({ data: null, error: { message: 'Registration via /login page' } })
};

export const requestPasswordReset = async (_data: any) => ({ data: null, error: null });
export const resetPassword = async (_data: any) => ({ data: null, error: null });
export const forgetPassword = requestPasswordReset;
export const sendVerificationEmail = async (_data: any) => ({ data: null, error: null });
export const changePassword = async (_data: any) => ({ data: null, error: null });
export const updateUser = async (_data: any) => ({ data: null, error: null });
export const changeEmail = async (_data: any) => ({ data: null, error: null });
export const listSessions = async () => ({ data: [], error: null });
export const revokeSession = async (_data: any) => ({ data: null, error: null });
export const revokeOtherSessions = async () => ({ data: null, error: null });

export const authClient = { useSession, signIn, signOut };
