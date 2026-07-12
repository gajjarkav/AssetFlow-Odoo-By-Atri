import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Search, Plus, Filter, X, Loader2, Activity, MapPin, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { assets as assetsApi, categories as categoriesApi, departments as departmentsApi } from "../api/endpoints";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { toast } from "sonner";

const AssetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewAssetId, setViewAssetId] = useState<string | null>(null);
  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [condition, setCondition] = useState("NEW");
  const [location, setLocation] = useState("");
  const [isShared, setIsShared] = useState(false);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await assetsApi.getAssets()).data
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await categoriesApi.getCategories()).data
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await departmentsApi.getDepartments()).data
  });

  const createAsset = useMutation({
    mutationFn: async (data: any) => (await assetsApi.createAsset(data)).data,
    onSuccess: () => {
      toast.success("Asset registered successfully!");
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail?.detail || err.response?.data?.detail || err.message || "Failed to register asset";
      toast.error(msg);
    }
  });

  const resetForm = () => {
    setName("");
    setCategoryId("");
    setDepartmentId("");
    setSerialNumber("");
    setCondition("NEW");
    setLocation("");
    setIsShared(false);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return toast.error("Category is required");
    
    createAsset.mutate({
      name,
      category_id: categoryId,
      serial_number: serialNumber || null,
      condition,
      location,
      is_shared: isShared,
      department_id: departmentId || null,
    });
  };

  const filteredAssets = assets?.filter((a: any) => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const item: any = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="space-y-6 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Directory</h1>
        <Button className="gap-2 shadow-md shadow-indigo-500/20" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Register Asset
        </Button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by tag, serial, or name..." 
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48 flex items-center gap-2">
          <Filter className="text-slate-400 shrink-0" size={18} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
          </Select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6"><LoadingSkeleton /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets?.map((asset: any) => (
                <motion.tr variants={item} initial="hidden" animate="show" key={asset.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-sm">{asset.tag}</TableCell>
                  <TableCell className="font-bold text-slate-800">
                    {asset.name}
                    {asset.current_holder_name && <span className="block text-xs text-slate-500 font-normal mt-0.5">Hold: {asset.current_holder_name}</span>}
                  </TableCell>
                  <TableCell>{asset.category_name || asset.category}</TableCell>
                  <TableCell>{asset.location}</TableCell>
                  <TableCell><StatusBadge status={asset.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setViewAssetId(asset.id)}>View</Button>
                  </TableCell>
                </motion.tr>
              ))}
              {filteredAssets?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">No assets found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      {/* Register Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A38]">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Register New Asset</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Asset Name</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MacBook Pro M3"
                  required 
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Category</label>
                  <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                    <option value="" disabled>Select Category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Department (Optional)</label>
                  <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">None</option>
                    {departments?.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Serial Number</label>
                  <Input 
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-123456"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Condition</label>
                  <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                    <option value="NEW">New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Location</label>
                <Input 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Server Room B, Desk 42"
                  required 
                />
              </div>

              <label className="flex items-center gap-3 py-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-5 bg-[#2A2A38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22C55E]"></div>
                </div>
                <span className="text-sm font-medium text-[#F8FAFC] group-hover:text-white transition-colors">
                  Is this a Shared Resource? (Bookable)
                </span>
              </label>

              <div className="pt-4 border-t border-[#2A2A38] flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#22C55E] text-black hover:bg-[#16a34a]" disabled={createAsset.isPending}>
                  {createAsset.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Register Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset View Modal */}
      {viewAssetId && (
        <AssetViewModal assetId={viewAssetId} onClose={() => setViewAssetId(null)} />
      )}
    </motion.div>
  );
};

export default AssetsPage;
