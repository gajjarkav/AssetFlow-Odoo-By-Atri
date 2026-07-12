export type UserRole = 'admin' | 'asset_manager' | 'department_head' | 'employee';
export type AssetStatus = 'available' | 'allocated' | 'reserved' | 'under_maintenance' | 'lost' | 'retired' | 'disposed';
export type TransferStatus = 'requested' | 'approved' | 'rejected';
export type BookingStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type MaintenanceStatus = 'pending' | 'approved' | 'rejected' | 'technician_assigned' | 'in_progress' | 'resolved';
export type AuditCycleStatus = 'open' | 'closed';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number; name: string; email: string; role: UserRole;
  department_id?: number; department?: Department;
  status: UserStatus; created_at: string;
}
export interface Department {
  id: number; name: string; head_id?: number; head?: User;
  parent_id?: number; parent?: Department; status: UserStatus;
}
export interface Category {
  id: number; name: string; description?: string;
  warranty_months?: number; status: UserStatus;
}
export interface Asset {
  id: number; tag: string; name: string;
  category_id: number; category?: Category; serial?: string;
  acquisition_date?: string; cost?: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  location?: string; department_id?: number; department?: Department;
  is_shared: boolean; status: AssetStatus;
  photo_url?: string; created_at: string;
}
export interface Allocation {
  id: number; asset_id: number; asset?: Asset;
  employee_id?: number; employee?: User;
  department_id?: number; department?: Department;
  allocated_by: number; allocated_at: string;
  expected_return?: string; returned_at?: string;
  return_notes?: string; status: 'active' | 'returned';
}
export interface Transfer {
  id: number; asset_id: number; asset?: Asset;
  from_user_id: number; from_user?: User;
  to_user_id: number; to_user?: User;
  reason: string; status: TransferStatus;
  requested_by: number; decided_by?: number; created_at: string;
}
export interface Booking {
  id: number; asset_id: number; asset?: Asset;
  user_id: number; user?: User;
  start_at: string; end_at: string;
  purpose: string; status: BookingStatus; created_at: string;
}
export interface MaintenanceRequest {
  id: number; asset_id: number; asset?: Asset;
  raised_by: number; raised_by_user?: User;
  description: string; priority: 'low' | 'medium' | 'high' | 'critical';
  status: MaintenanceStatus; technician?: string;
  photo_url?: string; created_at: string; resolved_at?: string;
}
export interface AuditCycle {
  id: number; title: string;
  scope_type: 'department' | 'location'; scope_value: string;
  start_date: string; end_date: string;
  status: AuditCycleStatus; created_by: number;
}
export interface Notification {
  id: number; user_id: number; type: string;
  title: string; message: string; is_read: boolean; created_at: string;
}
export interface DashboardKPIs {
  assets_available: number; assets_allocated: number;
  maintenance_today: number; active_bookings: number;
  pending_transfers: number; upcoming_returns: number;
}
export interface ApiError { detail: string; code?: string; holder_name?: string; }
