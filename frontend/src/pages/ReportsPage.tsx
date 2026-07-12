import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { reports as repApi } from "../api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Button } from "../components/ui/button";

const ReportsPage: React.FC = () => {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await repApi.getReportsSummary()).data
  });

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
      className="space-y-6 max-w-7xl mx-auto pb-10"
    >
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>

      {isLoading ? <div className="space-y-6"><LoadingSkeleton /><LoadingSkeleton /></div> : reports ? (
        <>
          {/* Charts Row */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={item}>
              <Card>
              <CardHeader>
                <CardTitle>Utilization by Department</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.utilization_by_department}>
                    <XAxis dataKey="department_name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Bar dataKey="total_assets" fill="#6366F1" radius={[4, 4, 0, 0]} name="Total Assets" />
                    <Bar dataKey="allocated" fill="#22C55E" radius={[4, 4, 0, 0]} name="Allocated" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
              <CardHeader>
                <CardTitle>Maintenance by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.maintenance_by_category}>
                    <XAxis dataKey="category_name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Bar dataKey="request_count" fill="#EF4444" radius={[4, 4, 0, 0]} name="Maintenance Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
              <CardHeader>
                <CardTitle>Assets Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.utilization_by_department}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="total_assets"
                      nameKey="department_name"
                      stroke="none"
                    >
                      {reports.utilization_by_department?.map((entry: any, index: number) => {
                        const WARM_COLORS = ['#FF6384', '#FF9F40', '#FFCD56', '#F43F5E', '#FB923C', '#FBBF24', '#E11D48'];
                        return <Cell key={`cell-${index}`} fill={WARM_COLORS[index % WARM_COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748B' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* List Details Row */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle>Most-used Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.most_used_assets?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm font-bold text-slate-800">
                        {item.name} <span className="text-xs text-slate-500 font-medium">({item.asset_tag})</span>
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{item.allocation_count} allocations</span>
                    </div>
                  ))}
                  {(!reports.most_used_assets || reports.most_used_assets.length === 0) && (
                    <div className="text-sm text-slate-500">No data available</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle>Idle Assets (&gt;30 days)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.idle_assets?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm font-bold text-slate-800">
                        {item.name} <span className="text-xs text-slate-500 font-medium">({item.asset_tag})</span>
                      </span>
                      <span className="text-xs font-bold text-red-500">{item.days_idle} days idle</span>
                    </div>
                  ))}
                  {(!reports.idle_assets || reports.idle_assets.length === 0) && (
                    <div className="text-sm text-slate-500">No idle assets found</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  );
};

export default ReportsPage;
