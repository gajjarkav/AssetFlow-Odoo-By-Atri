import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { reports as repApi } from "../api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Button } from "../components/ui/button";

const ReportsPage: React.FC = () => {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await repApi.getReportsSummary()).data
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <h1 className="text-2xl font-bold text-[#F8FAFC]">Reports & Analytics</h1>

      {isLoading ? <div className="space-y-6"><LoadingSkeleton /><LoadingSkeleton /></div> : reports ? (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Utilization by Department</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.utilization_by_department}>
                    <XAxis dataKey="department_name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#2A2A38'}} contentStyle={{backgroundColor: '#1A1A22', borderColor: '#2A2A38', color: '#F8FAFC'}} />
                    <Bar dataKey="total_assets" fill="#6366F1" radius={[4, 4, 0, 0]} name="Total Assets" />
                    <Bar dataKey="allocated" fill="#22C55E" radius={[4, 4, 0, 0]} name="Allocated" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.maintenance_by_category}>
                    <XAxis dataKey="category_name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#1A1A22', borderColor: '#2A2A38', color: '#F8FAFC'}} />
                    <Bar dataKey="request_count" fill="#EF4444" radius={[4, 4, 0, 0]} name="Maintenance Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* List Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Most-used Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reports.most_used_assets?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start border-b border-[#2A2A38] pb-3 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-[#F8FAFC]">
                      {item.name} <span className="text-xs text-[#64748B]">({item.asset_tag})</span>
                    </span>
                    <span className="text-xs text-[#94A3B8]">{item.allocation_count} allocations</span>
                  </div>
                ))}
                {(!reports.most_used_assets || reports.most_used_assets.length === 0) && (
                  <div className="text-sm text-[#64748B]">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Idle Assets (&gt;30 days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reports.idle_assets?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start border-b border-[#2A2A38] pb-3 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-[#F8FAFC]">
                      {item.name} <span className="text-xs text-[#64748B]">({item.asset_tag})</span>
                    </span>
                    <span className="text-xs text-[#EF4444]">{item.days_idle} days idle</span>
                  </div>
                ))}
                {(!reports.idle_assets || reports.idle_assets.length === 0) && (
                  <div className="text-sm text-[#64748B]">No idle assets found</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ReportsPage;
