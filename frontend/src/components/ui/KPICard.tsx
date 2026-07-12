import React from "react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorKey?: string;
  subtitle?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, colorKey = "text-primary", subtitle, onClick }) => {
  return (
    <div 
      className={`bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-lg flex items-center justify-between ${onClick ? "cursor-pointer hover:border-[var(--primary)] transition-colors" : ""}`}
      onClick={onClick}
    >
      <div>
        <p className="text-[var(--text-secondary)] text-sm mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-full bg-[var(--bg-base)] ${colorKey}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};
