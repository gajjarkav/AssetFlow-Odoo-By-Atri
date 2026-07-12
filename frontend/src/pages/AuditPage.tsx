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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Audit</h1>
          <p className="text-sm text-slate-500">Audit cycles and discrepancy reports</p>
        </div>
        <Button className="gap-2">New Audit Cycle</Button>
      </div>

      {loadingAudits ? <LoadingSkeleton /> : activeAudit ? (
        <Card className="border-emerald-300 bg-emerald-50/30 shadow-emerald-500/10 shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">{activeAudit.name}</CardTitle>
              <CardDescription>Auditors: {activeAudit.auditor} | {activeAudit.date}</CardDescription>
            </div>
            <Badge variant="success" className="animate-pulse">Active Cycle</Badge>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-xl border border-slate-200 mt-4 overflow-hidden shadow-sm">
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
                        <span className="font-mono text-xs font-medium text-slate-500 block">{item.asset_tag}</span>
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
                          <span className="text-xs font-medium text-slate-400 italic">Logged</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={20} />
                <span className="text-red-700 font-bold text-sm">2 assets flagged - discrepancy report generated automatically.</span>
              </div>
              <Button variant="destructive" size="sm">Close Audit Cycle</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-slate-500 font-medium">No active audit cycles.</CardContent></Card>
      )}
    </div>
  );
};

export default AuditPage;
