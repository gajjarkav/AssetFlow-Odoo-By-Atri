import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2 } from "lucide-react";
import { maintenance as maintApi, assets as assetsApi } from "../api/endpoints";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import dayjs from "dayjs";

const MaintenancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => (await maintApi.getMaintenance()).data
  });

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await assetsApi.getAssets()).data
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await maintApi.createMaintenance(data)).data,
    onSuccess: () => {
      toast.success("Maintenance request raised");
      setIsModalOpen(false);
      setAssetId("");
      setDescription("");
      setPriority("MEDIUM");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail?.detail || "Failed to raise request");
    }
  });

  const columns = [
    { id: "pending", title: "Pending" },
    { id: "approved", title: "Approved" },
    { id: "technician_assigned", title: "Technician Assigned" },
    { id: "in_progress", title: "In Progress" },
    { id: "resolved", title: "Resolved" }
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Maintenance Management</h1>
          <p className="text-sm text-[#94A3B8]">Approval workflow & repair tracking</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Raise Request
        </Button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {isLoading ? (
          <div className="w-full flex gap-4"><LoadingSkeleton /><LoadingSkeleton /></div>
        ) : (
          columns.map(col => {
            const colItems = maintenance?.filter((m: any) => m.status === col.id) || [];
            return (
              <div key={col.id} className="flex-shrink-0 w-80 bg-[#1A1A22] border border-[#2A2A38] rounded-xl flex flex-col h-[calc(100vh-200px)]">
                <div className="p-4 border-b border-[#2A2A38] flex items-center justify-between font-semibold">
                  <span className="text-[#F8FAFC]">{col.title}</span>
                  <Badge variant="secondary" className="bg-[#0B0B0F]">{colItems.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colItems.map((item: any) => (
                    <div key={item.id} className="bg-[#0B0B0F] border border-[#2A2A38] rounded-lg p-3 hover:border-[#22C55E]/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-[#94A3B8]">{item.asset_tag}</span>
                        <Badge 
                          variant={item.priority === "High" ? "destructive" : item.priority === "Medium" ? "warning" : "info"}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-white text-sm mb-1">{item.asset_name}</h4>
                      <p className="text-xs text-[#94A3B8] mb-3 line-clamp-2">{item.issue}</p>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#2A2A38]/50">
                        <span className="text-[10px] text-[#64748B]">{dayjs(item.created_at).format("MMM D")}</span>
                        {col.id === "pending" && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-[#22C55E] hover:underline">Approve</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="h-20 flex items-center justify-center text-[#64748B] text-sm italic">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A38]">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Raise Maintenance Request</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form 
              className="p-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ asset_id: assetId, description, priority });
              }}
            >
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Asset</label>
                <Select value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
                  <option value="" disabled>Select Asset</option>
                  {assets?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Priority</label>
                <Select value={priority} onChange={(e) => setPriority(e.target.value)} required>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Issue Description</label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue..." 
                  required 
                />
              </div>

              <div className="pt-4 border-t border-[#2A2A38] flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#22C55E] text-black hover:bg-[#16a34a]" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
