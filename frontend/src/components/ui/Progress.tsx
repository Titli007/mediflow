import React from 'react';

interface SkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  count = 1,
  height = 'h-6',
  className,
}) => {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className={`w-full rounded-xl bg-slate-200 animate-pulse ${height} ${className}`}
        />
      ))}
    </div>
  );
};
