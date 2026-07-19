import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          'w-full px-4 py-2.5 rounded-xl text-slate-800 bg-white border border-slate-200 outline-none text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200',
          {
            'border-rose-500 focus:ring-rose-500/20': error,
          },
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-rose-500 mt-1 block ml-1">{error}</span>}
    </div>
  );
};
