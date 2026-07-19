import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glowing' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-300',
        {
          'bg-white border border-slate-200/80 shadow-md': variant === 'default',
          'glass-panel border-indigo-500/10 shadow-indigo-500/5 glow-violet': variant === 'glowing',
          'glass-card shadow-lg': variant === 'glass',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('p-6', className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('border-b border-slate-100 px-6 py-4 mb-2', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('border-t border-slate-100 px-6 py-4 mt-2 flex justify-end gap-2', className)} {...props}>
      {children}
    </div>
  );
};
