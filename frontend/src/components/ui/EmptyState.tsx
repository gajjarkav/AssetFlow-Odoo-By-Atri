import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, message, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-card)]/50">
      <div className="p-4 bg-[var(--bg-base)] rounded-full mb-4 text-[var(--text-secondary)]">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">{message}</h3>
      {description && <p className="text-[var(--text-secondary)] text-sm max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
