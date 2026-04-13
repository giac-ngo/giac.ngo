// Stub: replaces @marsidev/react-turnstile
// Simply renders nothing (Turnstile CAPTCHA not needed locally)
import React from 'react';

interface TurnstileProps {
  siteKey: string;
  onSuccess?: (token: string) => void;
  onExpire?: () => void;
}

export function Turnstile({ onSuccess }: TurnstileProps) {
  // Auto-pass in development
  React.useEffect(() => {
    if (onSuccess) onSuccess('dev-token');
  }, []);
  return null;
}

