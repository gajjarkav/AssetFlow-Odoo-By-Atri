import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: LucideIcon;
}

export default function EmptyState({ message, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#2A2A38] flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-1">{message}</h3>
      {description && <p className="text-sm text-slate-400 max-w-sm">{description}</p>}
    </div>
  );
}
