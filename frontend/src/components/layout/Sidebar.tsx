import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navItems } from "../../constants/navItems";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNavItems = navItems.filter(item => 
    item.allowedRoles === "all" || (user && item.allowedRoles.includes(user.role))
  );

  return (
    <div className={`${isCollapsed ? 'w-[80px]' : 'w-[240px]'} transition-all duration-300 ease-in-out h-screen bg-[var(--bg-sidebar)] backdrop-blur-xl border-r border-[var(--border)] flex flex-col flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative`}>
      <div className={`h-[60px] flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-6 gap-3'} border-b border-[var(--border)] shrink-0 bg-white/50 transition-all duration-300`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20 shrink-0">
          AF
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
            <span className="font-bold text-lg text-slate-800 tracking-tight">AssetFlow</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">ERP</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 overflow-x-hidden">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) => 
                `flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? `bg-white shadow-sm border border-slate-100 text-[var(--primary)] shadow-indigo-500/5 ${isCollapsed ? '' : 'translate-x-1'}` 
                  : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800 border border-transparent"
                }`
              }
            >
              <Icon size={isCollapsed ? 20 : 18} className="shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-300">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className={`p-4 border-t border-[var(--border)] shrink-0 bg-white/30 transition-all duration-300 ${isCollapsed ? 'flex flex-col items-center px-2' : ''}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center ${isCollapsed ? 'justify-center w-full mb-4' : 'gap-3 w-full mb-4'} p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer border border-transparent`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} className="shrink-0" /> : <ChevronLeft size={20} className="shrink-0" />}
          {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">Collapse Menu</span>}
        </button>

        <div className={`flex items-center ${isCollapsed ? 'justify-center mb-3' : 'gap-3 mb-4 p-2 bg-white rounded-xl border border-slate-100 shadow-sm'}`}>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 truncate font-medium">{user?.role.replace(/_/g, " ")}</p>
            </div>
          )}
        </div>
        <button 
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`w-full flex items-center justify-center ${isCollapsed ? 'p-2' : 'gap-2 px-4 py-2'} bg-white border border-slate-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm`}
        >
          <LogOut size={isCollapsed ? 18 : 16} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-300">Logout</span>}
        </button>
      </div>
    </div>
  );
};
