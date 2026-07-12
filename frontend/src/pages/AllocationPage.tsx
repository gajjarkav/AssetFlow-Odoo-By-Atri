import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { AlertTriangle, Search, Check, X, ArrowRight, CornerDownRight, Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { assets as assetsApi, employees as empApi, transfers as transApi, allocations as allocApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Modal } from "../components/ui/Modal";

// Local types for the page to ensure type safety without relying entirely on generic types
interface AssetOption {
  id: string;
  tag: string;
  name: string;
  status: string;
  current_holder_name?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
}

export const AllocationPage: React.FC = () => {
  const { isAdmin, isAssetManager } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  const [conflictHolder, setConflictHolder] = useState<string | null>(null);
  
  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [transferToReject, setTransferToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [allocationToReturn, setAllocationToReturn] = useState<string | null>(null);
  const [returnNotes, setReturnNotes] = useState("");

  // Forms
  const { register: regAlloc, handleSubmit: handleAllocSubmit, reset: resetAlloc, formState: { errors: allocErrs } } = useForm();
  const { register: regTrans, handleSubmit: handleTransSubmit, reset: resetTrans, formState: { errors: transErrs } } = useForm();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Queries
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ["assets", "search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const { data } = await assetsApi.getAssets({search: debouncedSearch});
      return data;
    },
    enabled: debouncedSearch.length > 0,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await empApi.getEmployees();
      return data;
    }
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const { data } = await transApi.getTransfers();
      return data.filter((t: any) => t.status === "pending" || t.status === "requested"); // Adjust based on actual API enum
    }
  });

  const { data: allocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ["allocations"],
    queryFn: async () => {
      const { data } = await allocApi.getAllocations();
      return data;
    }
  });

  // Mutations
  const allocMutation = useMutation({
    mutationFn: async (data: any) => await allocApi.createAllocation(data),
    onSuccess: () => {
      toast.success("Asset allocated successfully");
      resetAlloc();
      setSelectedAsset(null);
      setConflictHolder(null);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setConflictHolder(err.response.data.holder_name || "Another user");
      } else {
        toast.error(err.response?.data?.detail || "Failed to allocate asset");
      }
    }
  });

  const transferMutation = useMutation({
    mutationFn: async (data: any) => await transApi.createTransfer(data),
    onSuccess: () => {
      toast.success("Transfer request submitted", { style: { background: "#F59E0B", color: "white", border: "none" } });
      resetTrans();
      setSelectedAsset(null);
      setConflictHolder(null);
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to submit request")
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => await transApi.approveTransfer(id),
    onSuccess: () => {
      toast.success("Transfer approved");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => await transApi.rejectTransfer(id, reason),
    onSuccess: () => {
      toast.success("Transfer rejected", { style: { background: "#F59E0B", color: "white", border: "none" } });
      setRejectModalOpen(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    }
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes: string }) => await allocApi.returnAllocation(id, notes),
    onSuccess: () => {
      toast.success("Asset marked as returned");
      setReturnModalOpen(false);
      setReturnNotes("");
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  });

  // Handlers
  const onAllocate = (data: any) => {
    if (!selectedAsset) return;
    allocMutation.mutate({
      asset_id: selectedAsset.id,
      user_id: data.user_id,
      expected_return_date: data.expected_return_date,
      notes: data.notes
    });
  };

  const onTransfer = (data: any) => {
    if (!selectedAsset) return;
    transferMutation.mutate({
      asset_id: selectedAsset.id,
      to_user_id: data.to_user_id,
      reason: data.reason
    });
  };

  const isConflict = selectedAsset && (selectedAsset.status === "allocated" || conflictHolder);
  const actualHolderName = conflictHolder || selectedAsset?.current_holder_name || "Unknown User";

  return (
    <div className="space-y-6">
      
      {/* Top 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT PANEL */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Allocate Asset</h2>
            
            {/* Asset Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Find Asset</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by tag (e.g. AF-0114) or name..."
                  className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-[var(--text-muted)] transition-colors"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]" size={18} />}
              </div>
              
              {/* Dropdown Results */}
              {debouncedSearch && searchResults && !selectedAsset && (
                <div className="absolute z-10 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No assets found</div>
                  ) : (
                    searchResults.map((asset: any) => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          setSelectedAsset(asset);
                          setSearchTerm("");
                          setConflictHolder(null);
                        }}
                        className="w-full text-left p-3 hover:bg-[var(--bg-base)] flex items-center justify-between border-b border-[var(--border)] last:border-0 transition-colors"
                      >
                        <span className="font-medium text-[var(--text-primary)]">[{asset.tag || asset.id.substring(0,6)}] {asset.name}</span>
                        <StatusBadge status={asset.status} />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Selected Asset Chip */}
            {selectedAsset && (
              <div className="mt-4 p-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-0.5">Selected Asset</p>
                  <p className="font-medium text-[var(--text-primary)]">[{selectedAsset.tag || selectedAsset.id.substring(0,6)}] {selectedAsset.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedAsset.status} />
                  <button onClick={() => { setSelectedAsset(null); setConflictHolder(null); }} className="text-[var(--text-muted)] hover:text-white">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC FORMS */}
          {selectedAsset && !isConflict && (
            <form onSubmit={handleAllocSubmit(onAllocate)} className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Assign To</label>
                <select 
                  {...regAlloc("user_id", { required: "Employee is required" })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none rounded-lg px-4 py-2.5 text-white"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((e: EmployeeOption) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                  ))}
                </select>
                {allocErrs.user_id && <p className="mt-1 text-sm text-[var(--danger)]">{String(allocErrs.user_id.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Expected Return Date</label>
                <input 
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...regAlloc("expected_return_date", { required: "Return date is required" })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none rounded-lg px-4 py-2.5 text-white"
                />
                {allocErrs.expected_return_date && <p className="mt-1 text-sm text-[var(--danger)]">{String(allocErrs.expected_return_date.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Notes (Optional)</label>
                <textarea 
                  {...regAlloc("notes")}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none rounded-lg px-4 py-2.5 text-white min-h-[80px] resize-none"
                  placeholder="Any condition notes or accessories included..."
                />
              </div>

              <button 
                type="submit" 
                disabled={allocMutation.isPending}
                className="w-full bg-[var(--primary)] hover:bg-[#16a34a] text-black font-semibold rounded-lg py-3 flex items-center justify-center transition-colors mt-2"
              >
                {allocMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : "Allocate Asset"}
              </button>
            </form>
          )}

          {/* CONFLICT PANEL */}
          {isConflict && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 border-l-4 border-l-[#EF4444] rounded-xl p-5 shadow-lg animate-in zoom-in-95 duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-[#EF4444]/20 p-2 rounded-full shrink-0">
                  <AlertTriangle className="text-[#EF4444]" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#EF4444]">Asset Currently Unavailable</h3>
                  <p className="text-[#F8FAFC] mt-1 text-[15px]">
                    This asset is currently held by <span className="font-bold">{actualHolderName}</span>.
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    You can submit a transfer request. The current holder will be notified and must approve the return.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-base)]/50 rounded-lg p-4 border border-[var(--border)] mt-6">
                <h4 className="font-medium text-white mb-3">Submit Transfer Request</h4>
                <form onSubmit={handleTransSubmit(onTransfer)} className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Transfer To</label>
                    <select 
                      {...regTrans("to_user_id", { required: "Recipient is required" })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[#F59E0B] focus:outline-none rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Select employee...</option>
                      {employees.map((e: EmployeeOption) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    {transErrs.to_user_id && <p className="mt-1 text-xs text-[var(--danger)]">{String(transErrs.to_user_id.message)}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Reason for transfer</label>
                    <textarea 
                      {...regTrans("reason", { required: "Reason is required", minLength: { value: 20, message: "Minimum 20 characters" } })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[#F59E0B] focus:outline-none rounded-lg px-3 py-2 text-white text-sm min-h-[60px] resize-none"
                      placeholder="Explain why this transfer is needed urgently..."
                    />
                    {transErrs.reason && <p className="mt-1 text-xs text-[var(--danger)]">{String(transErrs.reason.message)}</p>}
                  </div>
                  <button 
                    type="submit" 
                    disabled={transferMutation.isPending}
                    className="w-full bg-[#F59E0B]/20 border border-[#F59E0B]/30 hover:bg-[#F59E0B]/30 text-[#F59E0B] font-semibold rounded-lg py-2.5 flex items-center justify-center transition-colors"
                  >
                    {transferMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : "Submit Transfer Request"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Pending Transfers */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Pending Transfers</h2>
            <div className="bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded text-sm">
              {transfers.length}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {transfersLoading ? (
              <LoadingSkeleton />
            ) : transfers.length === 0 ? (
              <div className="py-8"><EmptyState icon={ArrowRightLeft} message="No pending transfers" /></div>
            ) : (
              transfers.map((t: any) => (
                <div key={t.id} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-4 transition-all hover:border-[var(--primary)]/30">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-white">[{t.asset_tag || "ASSET"}] {t.asset_name}</p>
                    <span className="text-xs text-[var(--text-muted)]">{dayjs(t.created_at).format("MMM D")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3">
                    <span>{t.from_user_name}</span>
                    <ArrowRight size={14} className="text-[var(--text-muted)]" />
                    <span className="text-white">{t.to_user_name}</span>
                  </div>
                  <div className="bg-[var(--bg-card)] border-l-2 border-l-amber-500 p-2 rounded text-xs text-[var(--text-muted)] italic mb-4 flex items-start gap-2">
                    <CornerDownRight size={12} className="shrink-0 mt-0.5" />
                    <p>"{t.reason}"</p>
                  </div>
                  
                  {(isAdmin || isAssetManager) && (
                    <div className="flex items-center gap-2 mt-auto">
                      <button 
                        onClick={() => approveMutation.mutate(t.id)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => { setTransferToReject(t.id); setRejectModalOpen(true); }}
                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - Allocations Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Allocation History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-base)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="p-4 font-medium border-b border-[var(--border)]">Asset</th>
                <th className="p-4 font-medium border-b border-[var(--border)]">Allocated To</th>
                <th className="p-4 font-medium border-b border-[var(--border)]">Allocated On</th>
                <th className="p-4 font-medium border-b border-[var(--border)]">Expected Return</th>
                <th className="p-4 font-medium border-b border-[var(--border)]">Status</th>
                <th className="p-4 font-medium border-b border-[var(--border)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {allocLoading ? (
                <tr>
                  <td colSpan={6} className="p-4"><LoadingSkeleton /></td>
                </tr>
              ) : allocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No allocations found</td>
                </tr>
              ) : (
                // Sort by most recent first, assuming created_at exists. Fallback to just rendering.
                allocations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((alloc: any) => (
                  <tr key={alloc.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-base)]/50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-white">{alloc.asset_tag || "ASSET"}</p>
                      <p className="text-[var(--text-muted)] text-xs">{alloc.asset_name}</p>
                    </td>
                    <td className="p-4 text-[var(--text-primary)]">{alloc.user_name}</td>
                    <td className="p-4 text-[var(--text-secondary)]">{dayjs(alloc.created_at).format("MMM D, YYYY")}</td>
                    <td className="p-4 text-[var(--text-secondary)]">{alloc.expected_return_date ? dayjs(alloc.expected_return_date).format("MMM D, YYYY") : "-"}</td>
                    <td className="p-4"><StatusBadge status={alloc.status} /></td>
                    <td className="p-4 text-right">
                      {(isAdmin || isAssetManager) && alloc.status === "active" && (
                        <button 
                          onClick={() => { setAllocationToReturn(alloc.id); setReturnModalOpen(true); }}
                          className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded border border-blue-500/20 transition-colors"
                        >
                          Mark Returned
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Transfer Request">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Reason for rejection</label>
            <textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--danger)] focus:outline-none rounded-lg px-4 py-3 text-white min-h-[100px] resize-none"
              placeholder="Why is this transfer denied?"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-base)]">Cancel</button>
            <button 
              onClick={() => transferToReject && rejectMutation.mutate({ id: transferToReject, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--danger)] hover:bg-red-600 text-white disabled:opacity-50"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Process Asset Return">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Condition Notes (Optional)</label>
            <textarea 
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--primary)] focus:outline-none rounded-lg px-4 py-3 text-white min-h-[100px] resize-none"
              placeholder="Record any damage, missing accessories, or general condition upon return..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setReturnModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-base)]">Cancel</button>
            <button 
              onClick={() => allocationToReturn && returnMutation.mutate({ id: allocationToReturn, notes: returnNotes })}
              disabled={returnMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] hover:bg-green-600 text-black disabled:opacity-50"
            >
              {returnMutation.isPending ? "Processing..." : "Complete Return"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default AllocationPage;
