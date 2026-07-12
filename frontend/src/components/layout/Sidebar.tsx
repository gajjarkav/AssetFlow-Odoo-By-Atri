import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navItems } from "../../constants/navItems";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNavItems = navItems.filter(item => 
    item.allowedRoles === "all" || (user && item.allowedRoles.includes(user.role))
  );

  return (
    <div className="w-[240px] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col flex-shrink-0">
      <div className="h-[60px] flex items-center px-6 border-b border-[var(--border)] gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
          AF
        </div>
        <span className="font-bold text-lg text-[var(--text-primary)]">AssetFlow</span>
        <span className="bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] px-1.5 py-0.5 rounded font-medium">ERP</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? "bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)]" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] border-l-2 border-transparent"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{user?.role.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};
