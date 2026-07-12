import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Filter } from "lucide-react";
import { assets as assetsApi } from "../api/endpoints";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

const AssetsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await assetsApi.getAssets()).data
  });

  const filteredAssets = assets?.filter((a: any) => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Asset Directory</h1>
        <Button className="gap-2"><Plus size={16} /> Register Asset</Button>
      </div>

      <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by tag, serial, or name..." 
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48 flex items-center gap-2">
          <Filter className="text-[#64748B] shrink-0" size={18} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="allocated">Allocated</option>
            <option value="under_maintenance">Maintenance</option>
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
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-sm">{asset.tag}</TableCell>
                  <TableCell className="font-medium">
                    {asset.name}
                    {asset.current_holder_name && <span className="block text-xs text-[#94A3B8]">Hold: {asset.current_holder_name}</span>}
                  </TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{asset.location}</TableCell>
                  <TableCell><StatusBadge status={asset.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAssets?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#64748B]">No assets found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AssetsPage;
