// Stub: replaces wouter with react-router-dom equivalents
import React from 'react';
export { Link, useNavigate, useParams } from 'react-router-dom';

// useLocation from wouter returns the pathname string (not an object like react-router)
export function useLocation(): [string, (to: string) => void] {
  const loc = window.location.pathname;
  return [loc, (to: string) => { window.location.href = to; }];
}

// useRoute: [matched, params]  
export function useRoute(_pattern: string): [boolean, Record<string, string>] {
  return [false, {}];
}

export function Switch({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Route({ component: C, children }: { component?: React.ComponentType; path?: string; children?: React.ReactNode }) {
  if (C) return <C />;
  return <>{children}</>;
}
