import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { 
  CheckCircle, Package, Calendar, ArrowRightLeft, 
  Clock, AlertTriangle, Plus, Wrench, RefreshCw 
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { KPICard } from "../components/ui/KPICard";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { DashboardStats } from "../types";

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

interface DashboardResponse {
  stats: DashboardStats;
  recent_activity: RecentActivity[];
}

const fetchDashboard = async (): Promise<DashboardResponse> => {
  const { data } = await api.get("/dashboard");
  return data;
};

const DashboardPage: React.FC = () => {
  const { isAdmin, isAssetManager } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-6 text-center max-w-lg mx-auto mt-10">
        <AlertTriangle className="text-[#EF4444] mx-auto mb-4" size={48} />
        <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Failed to load dashboard</h3>
        <p className="text-[#EF4444] mb-6">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
        <button 
          onClick={() => refetch()} 
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
        >
          <RefreshCw size={18} /> Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats;
  const recentActivity = data?.recent_activity?.slice(0, 10) || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {stats && stats.overdue_returns > 0 && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 border-l-4 border-l-[#EF4444] rounded-lg p-4 flex items-center gap-3 shadow-lg">
          <AlertTriangle className="text-[#EF4444] shrink-0" size={24} />
          <p className="text-[#EF4444] font-medium">
            {stats.overdue_returns} asset(s) are overdue for return — immediate action required
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <LoadingSkeleton key={i} />)
        ) : stats ? (
          <>
            <KPICard title="Available Assets" value={stats.available_assets} icon={CheckCircle} colorKey="text-emerald-500" />
            <KPICard title="Allocated Assets" value={stats.allocated_assets} icon={Package} colorKey="text-blue-500" />
            <KPICard title="Active Bookings" value={stats.active_bookings} icon={Calendar} colorKey="text-indigo-500" />
            <KPICard title="Pending Transfers" value={stats.pending_transfers} icon={ArrowRightLeft} colorKey="text-amber-500" />
            <KPICard title="Upcoming Returns" value={stats.upcoming_returns} icon={Clock} colorKey="text-violet-500" />
            <KPICard title="Overdue Returns" value={stats.overdue_returns} icon={AlertTriangle} colorKey="text-red-500" />
          </>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {(isAdmin || isAssetManager) && (
          <button 
            onClick={() => navigate("/assets")}
            className="flex-1 bg-[#1A1A22] border border-[#2A2A38] hover:border-[#22C55E]/50 text-[#F8FAFC] rounded-xl px-5 py-4 flex items-center justify-center gap-3 transition-all hover:bg-[#2A2A38]/30"
          >
            <div className="p-2 bg-[#22C55E]/20 text-[#22C55E] rounded-lg"><Plus size={20} /></div>
            <span className="font-medium">Register Asset</span>
          </button>
        )}
        <button 
          onClick={() => navigate("/bookings")}
          className="flex-1 bg-[#1A1A22] border border-[#2A2A38] hover:border-[#22C55E]/50 text-[#F8FAFC] rounded-xl px-5 py-4 flex items-center justify-center gap-3 transition-all hover:bg-[#2A2A38]/30"
        >
          <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg"><Calendar size={20} /></div>
          <span className="font-medium">Book a Resource</span>
        </button>
        <button 
          onClick={() => navigate("/maintenance")}
          className="flex-1 bg-[#1A1A22] border border-[#2A2A38] hover:border-[#22C55E]/50 text-[#F8FAFC] rounded-xl px-5 py-4 flex items-center justify-center gap-3 transition-all hover:bg-[#2A2A38]/30"
        >
          <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"><Wrench size={20} /></div>
          <span className="font-medium">Raise Maintenance</span>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#F8FAFC] mb-6">Recent Activity</h2>
        
        {isLoading ? (
          <div className="space-y-4"><LoadingSkeleton /><LoadingSkeleton /></div>
        ) : recentActivity.length === 0 ? (
          <EmptyState icon={Clock} message="No recent activity" description="Activity will appear here once users interact with assets." />
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              // Determine dot color based on type
              let dotColor = "bg-gray-500";
              if (activity.type.includes("allocation")) dotColor = "bg-blue-500";
              if (activity.type.includes("transfer")) dotColor = "bg-amber-500";
              if (activity.type.includes("maintenance")) dotColor = "bg-violet-500";
              if (activity.type.includes("return")) dotColor = "bg-emerald-500";

              return (
                <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-[#0B0B0F]/50 rounded-lg transition-colors border border-transparent hover:border-[#2A2A38]">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                  <p className="flex-1 text-sm text-[#F8FAFC]">{activity.description}</p>
                  <span className="text-xs text-[#64748B] shrink-0">
                    {dayjs(activity.created_at).format("MMM D, h:mm A")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
