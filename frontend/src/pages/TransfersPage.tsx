import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Check, X, Search, Filter, Loader2 } from "lucide-react";
import { transfers as transfersApi, assets as assetsApi, employees as employeesApi } from "../api/endpoints";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { toast } from "sonner";
import dayjs from "dayjs";

const TransfersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const queryClient = useQueryClient();

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await assetsApi.getAssets()).data
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await employeesApi.getEmployees()).data
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await transfersApi.createTransfer(data)).data,
    onSuccess: () => {
      toast.success("Transfer requested successfully");
      setIsModalOpen(false);
      setAssetId("");
      setToUserId("");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail?.detail || "Failed to request transfer");
    }
  });

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => (await transfersApi.getTransfers()).data
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => (await transfersApi.approveTransfer(id)).data,
    onSuccess: () => {
      toast.success("Transfer approved successfully");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: () => toast.error("Failed to approve transfer")
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => (await transfersApi.rejectTransfer(id, "Rejected by admin")).data,
    onSuccess: () => {
      toast.success("Transfer rejected");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: () => toast.error("Failed to reject transfer")
  });

  const filteredTransfers = transfers?.filter((t: any) => {
    const matchesSearch = t.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.from_user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.to_user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Asset Transfers</h1>
          <p className="text-sm text-[#94A3B8]">Peer-to-peer custody transfer requests</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <ArrowRightLeft size={16} /> Request Transfer
        </Button>
      </div>

      <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by asset or user..." 
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48 flex items-center gap-2">
          <Filter className="text-[#64748B] shrink-0" size={18} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6"><LoadingSkeleton /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers?.map((transfer: any) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div className="font-medium text-[#F8FAFC]">{transfer.asset_name}</div>
                    <div className="text-xs text-[#94A3B8] font-mono">{transfer.asset_tag}</div>
                  </TableCell>
                  <TableCell>{transfer.from_user_name}</TableCell>
                  <TableCell>{transfer.to_user_name}</TableCell>
                  <TableCell className="text-sm text-[#94A3B8]">
                    {dayjs(transfer.created_at).format("MMM D, YYYY")}
                  </TableCell>
                  <TableCell><StatusBadge status={transfer.status} /></TableCell>
                  <TableCell className="text-right">
                    {transfer.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          onClick={() => approveMutation.mutate(transfer.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => rejectMutation.mutate(transfer.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm">View</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransfers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#64748B]">No transfers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A38]">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Request Transfer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form 
              className="p-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ asset_id: assetId, to_user_id: toUserId });
              }}
            >
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Asset to Transfer</label>
                <Select value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
                  <option value="" disabled>Select Asset</option>
                  {assets?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Transfer To (User)</label>
                <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)} required>
                  <option value="" disabled>Select User</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                  ))}
                </Select>
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

export default TransfersPage;
