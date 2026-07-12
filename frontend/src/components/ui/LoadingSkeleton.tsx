import React from "react";

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-4 w-full">
      <div className="h-10 bg-[var(--border)] rounded w-full"></div>
      <div className="h-10 bg-[var(--border)] rounded w-full"></div>
      <div className="h-10 bg-[var(--border)] rounded w-full"></div>
      <div className="h-10 bg-[var(--border)] rounded w-3/4"></div>
    </div>
  );
};
