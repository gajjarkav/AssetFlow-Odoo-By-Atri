import {
  LayoutDashboard,
  Building2,
  Box,
  ClipboardList,
  CalendarDays,
  Wrench,
  ShieldCheck,
  FileBarChart,
  Bell,
  ArrowRightLeft
} from "lucide-react";
import { UserRole } from "../types";

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  allowedRoles: UserRole[] | "all";
}

export const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, allowedRoles: "all" },
  { label: "Organization", path: "/org", icon: Building2, allowedRoles: ["ADMIN"] },
  { label: "Assets", path: "/assets", icon: Box, allowedRoles: "all" },
  { label: "Allocations", path: "/allocations", icon: ClipboardList, allowedRoles: "all" },
  { label: "Bookings", path: "/bookings", icon: CalendarDays, allowedRoles: "all" },
  { label: "Transfers", path: "/transfers", icon: ArrowRightLeft, allowedRoles: "all" },
  { label: "Maintenance", path: "/maintenance", icon: Wrench, allowedRoles: "all" },
  { label: "Audits", path: "/audits", icon: ShieldCheck, allowedRoles: ["ADMIN", "ASSET_MANAGER"] },
  { label: "Reports", path: "/reports", icon: FileBarChart, allowedRoles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"] },
  { label: "Notifications", path: "/notifications", icon: Bell, allowedRoles: "all" }
];
