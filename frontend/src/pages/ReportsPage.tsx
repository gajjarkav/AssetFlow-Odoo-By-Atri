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
                  <BarChart data={reports.utilization}>
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#2A2A38'}} contentStyle={{backgroundColor: '#1A1A22', borderColor: '#2A2A38', color: '#F8FAFC'}} />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Frequency</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reports.maintenanceFreq}>
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#1A1A22', borderColor: '#2A2A38', color: '#F8FAFC'}} />
                    <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} dot={{r: 4, fill: '#22C55E'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* List Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Most-used assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reports.mostUsed.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start border-b border-[#2A2A38] pb-3 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-[#F8FAFC]">{item.name}</span>
                    <span className="text-xs text-[#94A3B8]">{item.usage}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Idle assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reports.idle.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start border-b border-[#2A2A38] pb-3 last:border-0 last:pb-0">
                    <span className="text-sm font-medium text-[#F8FAFC]">{item.name}</span>
                    <span className="text-xs text-[#EF4444]">{item.usage}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assets due for maintenance / nearing retirement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reports.dueForMaintenance.map((item: any, i: number) => (
                  <div key={i} className="border-b border-[#2A2A38] pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-[#F8FAFC]">[{item.tag}] {item.name}</p>
                    <p className="text-xs text-[#F59E0B] mt-1">{item.reason}</p>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4 text-xs h-8">Export Report</Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ReportsPage;
