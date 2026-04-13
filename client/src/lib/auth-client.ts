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
  email: async ({ email, password }: { email: string; password: string; callbackURL?: string }) => {
    try {
      const res: any = await apiService.login(email, password);
      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        window.location.href = '/';
        return { data: res.user, error: null };
      }
      return { data: null, error: { message: 'Login failed' } };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }
};

export const signOut = async () => {
  localStorage.removeItem('token');
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
