// Stub UI components to replace @/components/ui (shadcn-style)
import React from 'react';

interface CardProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Card: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`rounded-lg border border-border-color bg-background-panel shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

interface BadgeProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export const Badge: React.FC<BadgeProps> = ({ className = '', children, variant = 'default' }) => {
  const variants: Record<string, string> = {
    default: 'bg-primary text-text-on-primary',
    secondary: 'bg-background-light text-text-main',
    outline: 'border border-border-color text-text-main bg-transparent',
    destructive: 'bg-accent-red text-white',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input
    className={`flex h-9 w-full rounded-md border border-border-color bg-background-light px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-text-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${className}`}
    {...props}
  />
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ className = '', variant = 'default', size = 'default', children, ...props }) => {
  const variants: Record<string, string> = {
    default: 'bg-primary text-text-on-primary hover:bg-primary-hover',
    outline: 'border border-border-color bg-transparent hover:bg-background-light',
    ghost: 'bg-transparent hover:bg-background-light',
    destructive: 'bg-accent-red text-white hover:bg-accent-red-hover',
  };
  const sizes: Record<string, string> = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-7 px-3 text-xs',
    lg: 'h-11 px-8 text-base',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Separator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <hr className={`border-border-color ${className}`} />
);
