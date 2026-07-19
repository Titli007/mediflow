import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  isLoading = false,
  disabled,
  ...props
}) => {
  const isBtnDisabled = disabled || isLoading;
  return (
    <button
      disabled={isBtnDisabled}
      className={clsx(
        'px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer',
        {
          'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm': variant === 'primary' && !isBtnDisabled,
          'bg-slate-900/40 hover:bg-slate-900/60 text-slate-300 border border-white/5': variant === 'secondary' && !isBtnDisabled,
          'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20': variant === 'danger' && !isBtnDisabled,
          'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none': isBtnDisabled,
        },
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};
