import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
}

export default function LoadingSkeleton({ rows = 5 }: LoadingSkeletonProps) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-[#2A2A38] rounded-lg mb-3 animate-pulse" />
      ))}
    </div>
  );
}
