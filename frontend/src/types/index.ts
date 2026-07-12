export type UserRole = "ADMIN" | "ASSET_MANAGER" | "DEPARTMENT_HEAD" | "EMPLOYEE";
export type AssetStatus = "available" | "allocated" | "reserved" | "under_maintenance" | "lost" | "retired" | "disposed";
export type BookingStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type MaintenanceStatus = "pending" | "approved" | "rejected" | "technician_assigned" | "in_progress" | "resolved";
export type TransferStatus = "requested" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  phone?: string;
  department_id?: string;
  last_login_at?: string;
  must_reset_password?: boolean;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  status: AssetStatus;
  category_id: string;
}

export interface Allocation {
  id: string;
  asset_id: string;
  user_id: string;
}

export interface Transfer {
  id: string;
  status: TransferStatus;
}

export interface Booking {
  id: string;
  status: BookingStatus;
}

export interface MaintenanceRequest {
  id: string;
  status: MaintenanceStatus;
}

export interface Department {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Notification {
  id: string;
  message: string;
}

export interface DashboardStats {
  available_assets: number;
  allocated_assets: number;
  active_bookings: number;
  pending_transfers: number;
  upcoming_returns: number;
  overdue_returns: number;
}
