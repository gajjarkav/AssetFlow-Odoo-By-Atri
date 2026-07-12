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
    <div className="h-[60px] bg-[var(--bg-sidebar)] border-b border-[var(--border)] px-6 flex items-center justify-between shrink-0">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
      
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-base)] rounded-full transition-colors border border-[var(--border)]"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--danger)] text-[10px] text-white flex items-center justify-center font-bold rounded-full border border-[var(--bg-sidebar)]">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#1A1A22] border border-[#2A2A38] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-3 border-b border-[#2A2A38] bg-[#111118]">
                <span className="font-semibold text-sm text-[#F8FAFC]">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-[#22C55E] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#64748B]">No notifications.</div>
                ) : (
                  notifications?.map((n: any) => (
                    <div key={n.id} className={`p-3 border-b border-[#2A2A38]/50 hover:bg-[#2A2A38]/30 transition-colors ${!n.is_read ? 'bg-[#22C55E]/5' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className={`text-sm ${!n.is_read ? 'font-semibold text-white' : 'text-[#F8FAFC]'}`}>{n.title}</p>
                          <p className="text-xs text-[#94A3B8] mt-1">{n.message}</p>
                          <p className="text-[10px] text-[#64748B] mt-2">{dayjs(n.created_at).fromNow()}</p>
                        </div>
                        {!n.is_read && (
                          <button 
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="p-1 text-[#22C55E] hover:bg-[#22C55E]/20 rounded transition-colors"
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
            className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md hover:ring-2 hover:ring-[var(--primary)]/50 transition-all"
          >
            {user?.name?.charAt(0) || "U"}
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#1A1A22] border border-[#2A2A38] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-[#2A2A38] bg-[#111118]">
                <p className="font-semibold text-sm text-white truncate">{user?.name}</p>
                <p className="text-xs text-[#94A3B8] truncate mt-0.5">{user?.email}</p>
                <p className="text-[10px] uppercase font-bold text-[#22C55E] mt-2">{user?.role?.replace("_", " ")}</p>
              </div>
              <div className="p-1">
                <button 
                  className="w-full text-left px-3 py-2 text-sm text-[#F8FAFC] hover:bg-[#2A2A38] rounded-md transition-colors flex items-center gap-2"
                >
                  <User size={16} /> My Profile
                </button>
                <button 
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition-colors flex items-center gap-2 mt-1"
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
