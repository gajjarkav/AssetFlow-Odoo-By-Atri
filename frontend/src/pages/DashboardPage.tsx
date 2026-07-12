import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { 
  CheckCircle, Package, Calendar, ArrowRightLeft, 
  Clock, AlertTriangle, Plus, Wrench, RefreshCw 
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { KPICard } from "../components/ui/KPICard";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DashboardStats } from "../types";

import { dashboard } from "../api/endpoints";

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
  const { data } = await dashboard.getDashboardKPIs();
  return data;
};

const DashboardPage: React.FC = () => {
  const { user, isAdmin, isAssetManager } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Failed to load dashboard</h3>
        <p className="text-red-600 mb-6">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
        <Button variant="destructive" onClick={() => refetch()} className="mx-auto flex items-center gap-2">
          <RefreshCw size={18} /> Retry
        </Button>
      </div>
    );
  }

  const stats = data?.stats;
  const recentActivity = data?.recent_activity?.slice(0, 10) || [];

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute left-1/3 bottom-0 translate-y-10 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10 space-y-2">
          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            Overview
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {user?.name || "User"}! 👋
          </h2>
          <p className="text-indigo-100 font-medium text-sm sm:text-base max-w-md">
            Welcome back. Here is a summary of your organization's assets, bookings, and active maintenance requests.
          </p>
        </div>
      </div>

      {stats && stats.overdue_returns > 0 && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-lg p-4 flex items-center gap-3 shadow-md">
          <AlertTriangle className="text-red-600 shrink-0" size={24} />
          <p className="text-red-700 font-medium">
            {stats.overdue_returns} asset(s) are overdue for return — immediate action required
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <LoadingSkeleton key={i} />)
        ) : stats ? (
          <>
            <motion.div variants={item}><KPICard title="Available Assets" value={stats.available_assets} icon={CheckCircle} colorKey="text-emerald-500" /></motion.div>
            <motion.div variants={item}><KPICard title="Allocated Assets" value={stats.allocated_assets} icon={Package} colorKey="text-blue-500" /></motion.div>
            <motion.div variants={item}><KPICard title="Active Bookings" value={stats.active_bookings} icon={Calendar} colorKey="text-indigo-500" /></motion.div>
            <motion.div variants={item}><KPICard title="Pending Transfers" value={stats.pending_transfers} icon={ArrowRightLeft} colorKey="text-amber-500" /></motion.div>
            <motion.div variants={item}><KPICard title="Upcoming Returns" value={stats.upcoming_returns} icon={Clock} colorKey="text-violet-500" /></motion.div>
            <motion.div variants={item}><KPICard title="Overdue Returns" value={stats.overdue_returns} icon={AlertTriangle} colorKey="text-red-500" /></motion.div>
          </>
        ) : null}
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {(isAdmin || isAssetManager) && (
          <button 
            onClick={() => navigate("/assets")}
            className="flex-1 bg-white border border-slate-200 hover:border-indigo-300 text-slate-800 rounded-xl px-5 py-4 flex items-center justify-center gap-3 transition-all hover:bg-indigo-50/50 shadow-sm hover:shadow-md"
          >
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Plus size={20} /></div>
            <span className="font-bold">Register Asset</span>
          </button>
        )}
        <button 
          onClick={() => navigate("/bookings")}
          className="flex-1 bg-white border border-slate-200 hover:border-blue-300 text-slate-800 rounded-xl px-5 py-4 flex items-center justify-center gap-3 transition-all hover:bg-blue-50/50 shadow-sm hover:shadow-md"
        >
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calendar size={20} /></div>
          <span className="font-bold">Book a Resource</span>
        </button>
        <button 
          onClick={() => navigate("/maintenance")}
          className="flex-1 bg-white border border-slate-200 hover:border-amber-300 text-slate-800 rounded-xl px-5 py-4 flex items-center justify-center gap-3 transition-all hover:bg-amber-50/50 shadow-sm hover:shadow-md"
        >
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Wrench size={20} /></div>
          <span className="font-bold">Raise Maintenance</span>
        </button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4"><LoadingSkeleton /><LoadingSkeleton /></div>
          ) : recentActivity.length === 0 ? (
            <EmptyState icon={Clock} message="No recent activity" description="Activity will appear here once users interact with assets." />
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {recentActivity.map((activity) => {
                let dotColor = "bg-gray-500";
                if (activity.type.includes("allocation")) dotColor = "bg-blue-500";
                if (activity.type.includes("transfer")) dotColor = "bg-amber-500";
                if (activity.type.includes("maintenance")) dotColor = "bg-violet-500";
                if (activity.type.includes("return")) dotColor = "bg-emerald-500";

                return (
                  <motion.div variants={item} key={activity.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 shadow-sm`} />
                    <p className="flex-1 text-sm text-slate-700 font-medium">{activity.description}</p>
                    <span className="text-xs text-slate-400 shrink-0 font-medium">
                      {dayjs(activity.created_at).format("MMM D, h:mm A")}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardPage;
