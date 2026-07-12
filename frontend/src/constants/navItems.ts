import { LayoutDashboard, Building2, Package, ArrowLeftRight, Calendar, Wrench, ClipboardList, BarChart3, Bell } from 'lucide-react';
import type { UserRole } from '../types';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string; path: string; icon: LucideIcon; roles: UserRole[] | 'all';
}
export const navItems: NavItem[] = [
  { label: 'Dashboard',        path: '/dashboard',    icon: LayoutDashboard, roles: 'all' },
  { label: 'Organization',     path: '/org',          icon: Building2,       roles: ['admin'] },
  { label: 'Assets',           path: '/assets',       icon: Package,         roles: 'all' },
  { label: 'Allocation',       path: '/allocations',  icon: ArrowLeftRight,  roles: 'all' },
  { label: 'Resource Booking', path: '/bookings',     icon: Calendar,        roles: 'all' },
  { label: 'Maintenance',      path: '/maintenance',  icon: Wrench,          roles: 'all' },
  { label: 'Audit',            path: '/audits',       icon: ClipboardList,   roles: ['admin', 'asset_manager'] },
  { label: 'Reports',          path: '/reports',      icon: BarChart3,       roles: ['admin', 'asset_manager', 'department_head'] },
  { label: 'Notifications',    path: '/notifications',icon: Bell,            roles: 'all' },
];
