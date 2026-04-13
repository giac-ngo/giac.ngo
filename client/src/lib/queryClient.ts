// Stub: replaces @tanstack/react-query queryClient
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

export async function apiRequest(method: string, url: string, data?: any) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  return res;
}

export function getQueryFn({ on401 }: { on401: 'returnNull' | 'throw' }) {
  return async ({ queryKey }: { queryKey: string[] }) => {
    try {
      const res = await fetch(queryKey[0], { credentials: 'include' });
      if (res.status === 401) {
        if (on401 === 'returnNull') return null;
        throw new Error('Unauthorized');
      }
      return res.json();
    } catch {
      if (on401 === 'returnNull') return null;
      throw new Error('Fetch failed');
    }
  };
}
