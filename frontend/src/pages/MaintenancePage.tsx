import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { maintenance as maintApi } from "../api/endpoints";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import dayjs from "dayjs";

const MaintenancePage: React.FC = () => {
  const { data: maintenance, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => (await maintApi.getMaintenance()).data
  });

  const columns = [
    { id: "pending", title: "Pending" },
    { id: "approved", title: "Approved" },
    { id: "technician_assigned", title: "Technician Assigned" },
    { id: "in_progress", title: "In Progress" },
    { id: "resolved", title: "Resolved" }
  ];

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariant: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="h-full flex flex-col space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance Management</h1>
          <p className="text-sm text-slate-500">Approval workflow & repair tracking</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> Raise Request</Button>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {isLoading ? (
          <div className="w-full flex gap-4"><LoadingSkeleton /><LoadingSkeleton /></div>
        ) : (
          columns.map(col => {
            const colItems = maintenance?.filter((m: any) => m.status === col.id) || [];
            return (
              <motion.div variants={itemVariant} key={col.id} className="flex-shrink-0 w-80 bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-col h-[calc(100vh-200px)] shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between font-bold">
                  <span className="text-slate-800">{col.title}</span>
                  <Badge variant="secondary" className="bg-white text-slate-700 shadow-sm border-slate-200">{colItems.length}</Badge>
                </div>
                <motion.div variants={container} initial="hidden" animate="show" className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colItems.map((item: any) => (
                    <motion.div variants={itemVariant} key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono font-medium text-slate-500">{item.asset_tag}</span>
                        <Badge 
                          variant={item.priority === "High" ? "destructive" : item.priority === "Medium" ? "warning" : "info"}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{item.asset_name}</h4>
                      <p className="text-xs text-slate-600 mb-3 line-clamp-2">{item.issue}</p>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-medium text-slate-400">{dayjs(item.created_at).format("MMM D")}</span>
                        {col.id === "pending" && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-indigo-600 hover:underline">Approve</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="h-20 flex items-center justify-center text-slate-400 text-sm font-medium">
                      Empty
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )
          })
        )}
      </motion.div>
    </motion.div>
  );
};

export default MaintenancePage;
