import React from "react";
import { useQuery } from "@tanstack/react-query";
import { audits as auditApi } from "../api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Check, X, AlertTriangle } from "lucide-react";

const AuditPage: React.FC = () => {
  const { data: audits, isLoading: loadingAudits } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => (await auditApi.getAudits()).data
  });

  // We mock a nested request since we intercept /audits in mockData
  // For the sake of simulation, we just use the first active audit
  const activeAudit = audits?.[0];

  const mockItems = [
    { id: "ai1", asset_tag: "AF-0012", asset_name: "Dell Laptop", location: "Desk B32", status: "Verified" },
    { id: "ai2", asset_tag: "AF-0121", asset_name: "Office Chair", location: "Desk B33", status: "Missing" },
    { id: "ai3", asset_tag: "AF-0822", asset_name: "Monitor", location: "Desk B34", status: "Damaged" },
    { id: "ai4", asset_tag: "AF-0911", asset_name: "Projector", location: "Meeting Room A", status: "Pending" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Asset Audit</h1>
          <p className="text-sm text-[#94A3B8]">Audit cycles and discrepancy reports</p>
        </div>
        <Button className="gap-2">New Audit Cycle</Button>
      </div>

      {loadingAudits ? <LoadingSkeleton /> : activeAudit ? (
        <Card className="border-[#22C55E]/30 bg-[#22C55E]/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-[#F8FAFC]">{activeAudit.name}</CardTitle>
              <CardDescription>Auditors: {activeAudit.auditor} | {activeAudit.date}</CardDescription>
            </div>
            <Badge variant="success" className="animate-pulse">Active Cycle</Badge>
          </CardHeader>
          <CardContent>
            <div className="bg-[#1A1A22] rounded-lg border border-[#2A2A38] mt-4 overflow-hidden">
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
                  {mockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <span className="font-mono text-xs text-[#94A3B8] block">{item.asset_tag}</span>
                        {item.asset_name}
                      </TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            item.status === "Verified" ? "success" : 
                            item.status === "Missing" ? "destructive" : 
                            item.status === "Damaged" ? "warning" : "default"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {item.status === "Pending" ? (
                          <>
                            <Button size="sm" variant="outline" className="border-green-500/30 hover:bg-green-500/20 text-green-500 h-8 px-2"><Check size={14}/></Button>
                            <Button size="sm" variant="outline" className="border-red-500/30 hover:bg-red-500/20 text-red-500 h-8 px-2"><X size={14}/></Button>
                            <Button size="sm" variant="outline" className="border-amber-500/30 hover:bg-amber-500/20 text-amber-500 h-8 px-2"><AlertTriangle size={14}/></Button>
                          </>
                        ) : (
                          <span className="text-xs text-[#64748B] italic">Logged</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-[#EF4444]" size={20} />
                <span className="text-[#EF4444] font-medium text-sm">2 assets flagged - discrepancy report generated automatically.</span>
              </div>
              <Button variant="destructive" size="sm">Close Audit Cycle</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-[#94A3B8]">No active audit cycles.</CardContent></Card>
      )}
    </div>
  );
};

export default AuditPage;
