import React from "react";
import { statusConfig } from "../../constants/statusConfig";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status.toLowerCase()] || "bg-slate-100 text-slate-700 border border-slate-200";
  const label = status.replace(/_/g, " ").toUpperCase();
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${config}`}>
      {label}
    </span>
  );
};
