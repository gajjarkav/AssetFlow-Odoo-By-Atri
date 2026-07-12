import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItems } from '../../constants/navItems';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (item.roles === 'all') return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="w-[240px] h-screen fixed sm:sticky top-0 left-0 bg-[#111118] border-r border-[#2A2A38] flex flex-col z-40">
      <div className="h-[70px] flex items-center px-6 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">AF</div>
        <span className="text-white font-bold text-lg">AssetFlow</span>
        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto">ERP</span>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                  isActive 
                    ? 'text-emerald-400 bg-emerald-500/10 font-medium border-l-4 border-emerald-500 pl-3' 
                    : 'text-slate-400 hover:text-white hover:bg-[#1A1A22]'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.label === 'Notifications' && (
                <span className="w-2 h-2 rounded-full bg-red-500 ml-auto" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="h-[80px] border-t border-[#2A2A38] p-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate font-medium">{user?.name || 'User'}</p>
          <p className="text-xs text-slate-500 capitalize truncate">{user?.role?.replace('_', ' ') || 'Role'}</p>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
