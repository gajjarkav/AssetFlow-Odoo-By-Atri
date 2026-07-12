import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { navItems } from '../../constants/navItems';
import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const location = useLocation();
  const { user } = useAuth();
  
  const currentNav = navItems.find(item => location.pathname.startsWith(item.path));
  const pageTitle = currentNav?.label || 'AssetFlow';

  return (
    <div className="h-[60px] bg-[#111118] border-b border-[#2A2A38] flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
      
      <div className="flex items-center gap-4">
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-[#111118]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </div>
  );
}
