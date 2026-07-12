import React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./card";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorKey?: string;
  subtitle?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, colorKey = "text-[#F8FAFC]", subtitle, onClick }) => {
  return (
    <Card 
      className={`${onClick ? "cursor-pointer hover:border-[#22C55E]/50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5 flex items-center justify-between h-full">
        <div>
          <p className="text-[#94A3B8] text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-[#F8FAFC]">{value}</h3>
          {subtitle && <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-[#0B0B0F] ${colorKey}`}>
          <Icon size={24} />
        </div>
      </CardContent>
    </Card>
  );
};
