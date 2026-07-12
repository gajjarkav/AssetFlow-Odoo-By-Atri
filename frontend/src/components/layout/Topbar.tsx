import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navItems } from "../../constants/navItems";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications as notifApi } from "../../api/endpoints";
import dayjs from "dayjs";

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notifApi.getNotifications()).data,
    refetchInterval: 30000 // poll every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => (await notifApi.markNotificationRead(id)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => (await notifApi.markAllRead()).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const currentNavItem = navItems.find(item => location.pathname.startsWith(item.path));
  const title = currentNavItem ? currentNavItem.label : "Dashboard";
  
  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <div className="h-[60px] bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
      
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            className="relative p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-all border border-slate-100 shadow-sm"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center font-bold rounded-full border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
                <span className="font-semibold text-sm text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No notifications.</div>
                ) : (
                  notifications?.map((n: any) => (
                    <div key={n.id} className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-indigo-50/50' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium">{dayjs(n.created_at).fromNow()}</p>
                        </div>
                        {!n.is_read && (
                          <button 
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md shadow-indigo-500/20 hover:scale-105 transition-all"
          >
            {user?.name?.charAt(0) || "U"}
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <p className="font-bold text-sm text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user?.email}</p>
                <p className="text-[10px] uppercase font-bold text-indigo-600 mt-2">{user?.role?.replace("_", " ")}</p>
              </div>
              <div className="p-1">
                <button 
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <User size={16} /> My Profile
                </button>
                <button 
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 font-bold rounded-md transition-colors flex items-center gap-2 mt-1"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
