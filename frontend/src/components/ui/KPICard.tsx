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

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, colorKey = "text-indigo-600 bg-indigo-50", subtitle, onClick }) => {
  return (
    <Card 
      className={`${onClick ? "cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5 flex items-center justify-between h-full">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorKey} shadow-sm`}>
          <Icon size={24} />
        </div>
      </CardContent>
    </Card>
  );
};
