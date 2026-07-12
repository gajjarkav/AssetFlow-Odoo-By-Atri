import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
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
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={item}>
              <Card>
              <CardHeader>
                <CardTitle>Utilization by Department</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.utilization}>
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
              <CardHeader>
                <CardTitle>Maintenance Frequency</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reports.maintenanceFreq}>
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} dot={{r: 4, fill: '#22C55E'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* List Details Row */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle>Most-used assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.mostUsed.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                      <span className="text-xs text-slate-500 font-medium">{item.usage}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle>Idle assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.idle.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                      <span className="text-xs font-bold text-red-500">{item.usage}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle>Assets due for maintenance / nearing retirement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.dueForMaintenance.map((item: any, i: number) => (
                    <div key={i} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-bold text-slate-800">[{item.tag}] {item.name}</p>
                      <p className="text-xs font-bold text-amber-500 mt-1">{item.reason}</p>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4 text-xs h-8">Export Report</Button>
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
