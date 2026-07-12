import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { audits as auditApi, departments as deptApi } from "../api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Check, X, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

const AuditPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scopeType, setScopeType] = useState("LOCATION");
  const [scopeValue, setScopeValue] = useState("");

  const { data: audits, isLoading: loadingAudits } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => (await auditApi.getAudits()).data
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await deptApi.getDepartments()).data
  });

  // Find the first OPEN audit cycle, if any
  const activeAuditSummary = audits?.find((a: any) => a.status === "OPEN");

  // Fetch details (items) for the active audit
  const { data: activeAuditDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["auditDetail", activeAuditSummary?.id],
    queryFn: async () => (await auditApi.getAudit(activeAuditSummary.id)).data,
    enabled: !!activeAuditSummary?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await auditApi.createAudit(data)).data,
    onSuccess: () => {
      toast.success("Audit cycle created successfully");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create audit")
  });

  const markItemMutation = useMutation({
    mutationFn: async ({ auditId, assetId, result }: any) => {
      return (await auditApi.markAuditItem(auditId, { asset_id: assetId, result, notes: "" })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditDetail"] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
    onError: () => toast.error("Failed to mark item")
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => (await auditApi.closeAudit(id)).data,
    onSuccess: () => {
      toast.success("Audit cycle closed");
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["auditDetail"] });
    },
    onError: () => toast.error("Failed to close audit")
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      scope_type: scopeType,
      scope_value: scopeValue,
      start_date: dayjs().format("YYYY-MM-DD"),
      end_date: dayjs().add(7, 'day').format("YYYY-MM-DD")
    });
  };

  const handleMark = (assetId: string, result: string) => {
    if (!activeAuditSummary) return;
    markItemMutation.mutate({ auditId: activeAuditSummary.id, assetId, result });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Audit</h1>
          <p className="text-sm text-slate-500">Audit cycles and discrepancy reports</p>
        </div>
        {!activeAuditSummary && (
          <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New Audit Cycle
          </Button>
        )}
      </div>

      {loadingAudits || loadingDetail ? <LoadingSkeleton /> : activeAuditDetail ? (
        <Card className="border-[#22C55E]/30 bg-[#22C55E]/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-[#F8FAFC]">{activeAuditDetail.title}</CardTitle>
              <CardDescription>
                Scope: {activeAuditDetail.scope_type} | {dayjs(activeAuditDetail.start_date).format("MMM D")} - {dayjs(activeAuditDetail.end_date).format("MMM D, YYYY")}
              </CardDescription>
            </div>
            <Badge variant="success" className="animate-pulse">Active Cycle</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4 mt-2">
              <div className="bg-[#1A1A22] border border-[#2A2A38] px-4 py-2 rounded-lg text-center flex-1">
                <p className="text-xs text-[#94A3B8]">Total Items</p>
                <p className="text-xl font-bold text-[#F8FAFC]">{activeAuditDetail.items_total}</p>
              </div>
              <div className="bg-[#1A1A22] border border-[#22C55E]/50 px-4 py-2 rounded-lg text-center flex-1">
                <p className="text-xs text-[#94A3B8]">Verified</p>
                <p className="text-xl font-bold text-[#22C55E]">{activeAuditDetail.items_verified}</p>
              </div>
              <div className="bg-[#1A1A22] border border-[#EF4444]/50 px-4 py-2 rounded-lg text-center flex-1">
                <p className="text-xs text-[#94A3B8]">Missing/Damaged</p>
                <p className="text-xl font-bold text-[#EF4444]">{activeAuditDetail.items_missing + activeAuditDetail.items_damaged}</p>
              </div>
            </div>

            <div className="bg-[#1A1A22] rounded-lg border border-[#2A2A38] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Expected Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Verification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAuditDetail.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <span className="font-mono text-xs font-medium text-slate-500 block">{item.asset_tag}</span>
                        {item.asset_name}
                      </TableCell>
                      <TableCell>{item.expected_location}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            item.result === "VERIFIED" ? "success" : 
                            item.result === "MISSING" ? "destructive" : 
                            item.result === "DAMAGED" ? "warning" : "default"
                          }
                        >
                          {item.result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {item.result === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" title="Mark Verified" onClick={() => handleMark(item.asset_id, "VERIFIED")} className="border-green-500/30 hover:bg-green-500/20 text-green-500 h-8 px-2">
                              <Check size={14}/>
                            </Button>
                            <Button size="sm" variant="outline" title="Mark Missing" onClick={() => handleMark(item.asset_id, "MISSING")} className="border-red-500/30 hover:bg-red-500/20 text-red-500 h-8 px-2">
                              <X size={14}/>
                            </Button>
                            <Button size="sm" variant="outline" title="Mark Damaged" onClick={() => handleMark(item.asset_id, "DAMAGED")} className="border-amber-500/30 hover:bg-amber-500/20 text-amber-500 h-8 px-2">
                              <AlertTriangle size={14}/>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#64748B] italic flex items-center justify-end gap-1">
                            Logged <Check size={12}/>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeAuditDetail.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-[#94A3B8]">No assets found for this scope.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg gap-4">
              <div className="flex items-center gap-3">
                {activeAuditDetail.items_missing > 0 || activeAuditDetail.items_damaged > 0 ? (
                  <>
                    <AlertTriangle className="text-[#EF4444]" size={20} />
                    <span className="text-[#EF4444] font-medium text-sm">
                      {activeAuditDetail.items_missing + activeAuditDetail.items_damaged} assets flagged as missing or damaged.
                    </span>
                  </>
                ) : activeAuditDetail.items_pending === 0 ? (
                  <>
                    <Check className="text-[#22C55E]" size={20} />
                    <span className="text-[#22C55E] font-medium text-sm">
                      All items verified successfully.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="text-[#F59E0B]" size={20} />
                    <span className="text-[#F59E0B] font-medium text-sm">
                      {activeAuditDetail.items_pending} items still pending verification.
                    </span>
                  </>
                )}
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => closeMutation.mutate(activeAuditSummary.id)}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Close Audit Cycle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[#2A2A38] rounded-full flex items-center justify-center mb-4">
              <Check className="text-[#22C55E]" size={32} />
            </div>
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No active audit cycles</h3>
            <p className="text-[#94A3B8] text-sm max-w-sm mx-auto mb-6">
              You're all caught up. Start a new audit cycle to verify asset inventory by location or department.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>Start New Audit</Button>
          </CardContent>
        </Card>
      )}

      {/* New Audit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A38]">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Start New Audit Cycle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Audit Title</label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Server Room Audit"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Scope Type</label>
                <Select value={scopeType} onChange={(e) => {
                  setScopeType(e.target.value);
                  setScopeValue("");
                }} required>
                  <option value="LOCATION">By Location</option>
                  <option value="DEPARTMENT">By Department</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
                  {scopeType === "LOCATION" ? "Location Name" : "Select Department"}
                </label>
                {scopeType === "LOCATION" ? (
                  <Input 
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                    placeholder="e.g. Server Room B"
                    required 
                  />
                ) : (
                  <Select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} required>
                    <option value="" disabled>Select Department</option>
                    {departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="pt-4 border-t border-[#2A2A38] flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#22C55E] text-black hover:bg-[#16a34a]" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Start Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPage;
