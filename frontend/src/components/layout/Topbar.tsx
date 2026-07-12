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
    <div className="h-[60px] bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-all border border-slate-100 shadow-sm">
          <Bell size={18} />
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md shadow-indigo-500/20 hover:scale-105 transition-transform">
          {user?.name?.charAt(0) || "U"}
        </div>
      </div>
    </div>
  );
};
