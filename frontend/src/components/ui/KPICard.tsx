import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  colorKey: 'green' | 'blue' | 'amber' | 'red' | 'violet' | 'indigo';
  subtitle?: string;
  onClick?: () => void;
}

const colorMap = {
  green: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
  blue: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
  amber: { bg: 'rgba(245,158,11,0.15)', color: '#FBBF24' },
  red: { bg: 'rgba(239,68,68,0.15)', color: '#F87171' },
  violet: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
  indigo: { bg: 'rgba(99,102,241,0.15)', color: '#818CF8' },
};

export default function KPICard({ title, value, icon: Icon, colorKey, subtitle, onClick }: KPICardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[#1A1A22] border border-[#2A2A38] rounded-xl p-5 transition-colors ${onClick ? 'cursor-pointer hover:border-[#3A3A48]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-lg" style={{ background: colorMap[colorKey].bg }}>
          <Icon size={20} style={{ color: colorMap[colorKey].color }} />
        </div>
      </div>
    </div>
  );
}
