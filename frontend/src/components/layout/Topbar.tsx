import React from "react";
import { useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navItems } from "../../constants/navItems";

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const currentNavItem = navItems.find(item => location.pathname.startsWith(item.path));
  const title = currentNavItem ? currentNavItem.label : "Dashboard";

  return (
    <div className="h-[60px] bg-[var(--bg-sidebar)] border-b border-[var(--border)] px-6 flex items-center justify-between shrink-0">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-base)] rounded-full transition-colors border border-[var(--border)]">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[var(--danger)] rounded-full border border-[var(--bg-sidebar)]"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md">
          {user?.name?.charAt(0) || "U"}
        </div>
      </div>
    </div>
  );
};
