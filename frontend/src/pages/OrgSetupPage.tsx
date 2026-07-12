import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { departments as deptApi, categories as catApi, employees as empApi } from "../api/endpoints";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

const OrgSetupPage: React.FC = () => {
  const { data: departments, isLoading: deptsLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await deptApi.getDepartments()).data
  });

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await catApi.getCategories()).data
  });

  const { data: employees, isLoading: empsLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await empApi.getEmployees()).data
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Organization Setup</h1>
        <Button className="gap-2"><Plus size={16} /> Add New</Button>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="departments" className="px-6 py-2">Departments</TabsTrigger>
          <TabsTrigger value="categories" className="px-6 py-2">Categories</TabsTrigger>
          <TabsTrigger value="employees" className="px-6 py-2">Employee Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          {deptsLoading ? <LoadingSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department Head</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments?.map((dept: any) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.head || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={dept.status === "Active" ? "success" : "secondary"}>{dept.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="categories">
          {catsLoading ? <LoadingSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="employees">
          {empsLoading ? <LoadingSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-[#94A3B8]">{emp.email}</TableCell>
                    <TableCell>
                      <Badge variant={emp.role === "ADMIN" ? "destructive" : emp.role === "ASSET_MANAGER" ? "warning" : "info"}>
                        {emp.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "Active" ? "success" : "secondary"}>{emp.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Manage Role</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrgSetupPage;
