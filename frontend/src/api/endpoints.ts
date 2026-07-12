import { mockData } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const auth = {
  login: async (_email: string, _password: string) => { await delay(500); return { data: { user: mockData.users[0], token: 'mock-jwt-token' } }; },
  signup: async (_data: any) => { await delay(500); return { data: { user: mockData.users[0], token: 'mock-jwt-token' } }; },
  getMe: async () => { await delay(500); return { data: mockData.users[0] }; },
};

export const departments = {
  getDepartments: async () => { await delay(500); return { data: mockData.departments }; },
  createDepartment: async (data: any) => { await delay(500); return { data: { ...data, id: 'd-new' } }; },
  updateDepartment: async (id: number | string, data: any) => { await delay(500); return { data: { ...data, id } }; },
};

export const categories = {
  getCategories: async () => { await delay(500); return { data: mockData.categories }; },
  createCategory: async (data: any) => { await delay(500); return { data: { ...data, id: 'c-new' } }; },
};

export const employees = {
  getEmployees: async (_params?: any) => { await delay(500); return { data: mockData.users }; },
  updateEmployeeRole: async (id: number | string, role: string) => { await delay(500); return { data: { id, role } }; },
  updateEmployee: async (id: number | string, data: any) => { await delay(500); return { data: { id, ...data } }; },
};

export const assets = {
  getAssets: async (_params?: any) => { await delay(500); return { data: mockData.assets }; },
  createAsset: async (data: any) => { await delay(500); return { data: { ...data, id: 'a-new' } }; },
  getAsset: async (id: number | string) => { await delay(500); return { data: mockData.assets.find(a => a.id === id) || mockData.assets[0] }; },
  getAssetHistory: async (_id: number | string) => { await delay(500); return { data: [] }; },
};

export const allocations = {
  getAllocations: async (_params?: any) => { await delay(500); return { data: mockData.allocations }; },
  createAllocation: async (data: any) => { await delay(500); return { data: { ...data, id: 'al-new' } }; },
  returnAllocation: async (id: number | string, notes?: string) => { await delay(500); return { data: { id, notes, status: 'returned' } }; },
};

export const transfers = {
  getTransfers: async (_params?: any) => { await delay(500); return { data: mockData.transfers }; },
  createTransfer: async (data: any) => { await delay(500); return { data: { ...data, id: 't-new' } }; },
  approveTransfer: async (id: number | string) => { await delay(500); return { data: { id, status: 'approved' } }; },
  rejectTransfer: async (id: number | string, reason: string) => { await delay(500); return { data: { id, reason, status: 'rejected' } }; },
};

export const resources = {
  getResources: async () => { await delay(500); return { data: [] }; },
  getBookings: async (_params?: any) => { await delay(500); return { data: mockData.bookings }; },
  createBooking: async (data: any) => { await delay(500); return { data: { ...data, id: 'b-new' } }; },
  cancelBooking: async (id: number | string) => { await delay(500); return { data: { id, status: 'cancelled' } }; },
};

export const maintenance = {
  getMaintenance: async (_params?: any) => { await delay(500); return { data: mockData.maintenance }; },
  createMaintenance: async (data: any) => { await delay(500); return { data: { ...data, id: 'm-new' } }; },
  transitionMaintenance: async (id: number | string, to: string) => { await delay(500); return { data: { id, status: to } }; },
};

export const audits = {
  getAudits: async () => { await delay(500); return { data: mockData.audits }; },
  createAudit: async (data: any) => { await delay(500); return { data: { ...data, id: 'au-new' } }; },
  getAudit: async (id: number | string) => { await delay(500); return { data: mockData.audits.find(a => a.id === id) || mockData.audits[0] }; },
  markAuditItem: async (id: number | string, data: any) => { await delay(500); return { data: { id, ...data } }; },
  closeAudit: async (id: number | string) => { await delay(500); return { data: { id, status: 'closed' } }; },
};

export const dashboard = {
  getDashboardKPIs: async () => { await delay(500); return { data: mockData.dashboard }; },
};

export const reports = {
  getReportsSummary: async () => { await delay(500); return { data: mockData.reports }; },
};

export const notifications = {
  getNotifications: async (_params?: any) => { await delay(500); return { data: mockData.notifications }; },
  markNotificationRead: async (id: number | string) => { await delay(500); return { data: { id, read: true } }; },
  markAllRead: async () => { await delay(500); return { data: { success: true } }; },
};

export const activityLogs = {
  getActivityLogs: async () => { await delay(500); return { data: mockData.dashboard.recent_activity }; },
};
