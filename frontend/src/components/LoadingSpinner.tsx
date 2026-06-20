import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  label, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 p-4 ${className}`}>
      <div className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClasses[size]}`} />
      {label && <p className="text-sm font-medium text-gray-500 animate-pulse">{label}</p>}
    </div>
  );
};

export const SkeletonLoader: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="w-full space-y-4 animate-pulse p-4">
      <div className="h-6 bg-gray-200 rounded-md w-1/4"></div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-150 rounded-md w-full"></div>
        ))}
      </div>
    </div>
  );
};
