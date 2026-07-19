import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children?: React.ReactNode;
  message?: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  message,
  onClose,
  className,
}) => {
  return (
    <div
      className={clsx(
        'p-4 rounded-xl border flex items-start gap-3 relative',
        {
          'bg-indigo-50 border-indigo-200/50 text-indigo-800': type === 'info',
          'bg-emerald-50 border-emerald-200/50 text-emerald-800': type === 'success',
          'bg-amber-50 border-amber-200/50 text-amber-800': type === 'warning',
          'bg-rose-50 border-rose-200/50 text-rose-800': type === 'error',
        },
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        {type === 'info' && <Info className="h-4.5 w-4.5 text-indigo-600" />}
        {type === 'success' && <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />}
        {type === 'warning' && <AlertCircle className="h-4.5 w-4.5 text-amber-600" />}
        {type === 'error' && <AlertCircle className="h-4.5 w-4.5 text-rose-600" />}
      </div>

      <div className="flex-1 text-sm font-medium leading-relaxed">
        {title && <span className="font-bold block mb-1">{title}</span>}
        {message || children}
      </div>

      {onClose && (
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100/50 transition-colors shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
