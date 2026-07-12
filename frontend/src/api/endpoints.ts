import client from './client';

export const auth = {
  login: async (email: string, password: string) => await client.post('/auth/login', { email, password }),
  signup: async (data: any) => await client.post('/auth/signup', data),
  getMe: async () => await client.get('/auth/me'),
};

export const departments = {
  getDepartments: async () => await client.get('/departments'),
  createDepartment: async (data: any) => await client.post('/departments', data),
  updateDepartment: async (id: number | string, data: any) => await client.put(`/departments/${id}`, data),
};

export const categories = {
  getCategories: async () => await client.get('/categories'),
  createCategory: async (data: any) => await client.post('/categories', data),
};

export const employees = {
  getEmployees: async (params?: any) => await client.get('/employees', { params }),
  updateEmployeeRole: async (id: number | string, role: string) => await client.patch(`/employees/${id}/role`, { role }),
  updateEmployee: async (id: number | string, data: any) => await client.put(`/employees/${id}`, data),
};

export const assets = {
  getAssets: async (params?: any) => await client.get('/assets', { params }),
  createAsset: async (data: any) => await client.post('/assets', data),
  getAsset: async (id: number | string) => await client.get(`/assets/${id}`),
  getAssetHistory: async (id: number | string) => await client.get(`/assets/${id}/history`),
};

export const allocations = {
  getAllocations: async (params?: any) => await client.get('/allocations', { params }),
  createAllocation: async (data: any) => await client.post('/allocations', data),
  returnAllocation: async (id: number | string, notes?: string) => await client.patch(`/allocations/${id}/return`, { notes }),
};

export const transfers = {
  getTransfers: async (params?: any) => await client.get('/transfers', { params }),
  createTransfer: async (data: any) => await client.post('/transfers', data),
  approveTransfer: async (id: number | string) => await client.patch(`/transfers/${id}/approve`),
  rejectTransfer: async (id: number | string, reason: string) => await client.patch(`/transfers/${id}/reject`, { reason }),
};

export const resources = {
  getResources: async () => await client.get('/resources'),
  getBookings: async (params?: any) => await client.get('/bookings', { params }),
  createBooking: async (data: any) => await client.post('/bookings', data),
  cancelBooking: async (id: number | string) => await client.delete(`/bookings/${id}`),
};

export const maintenance = {
  getMaintenance: async (params?: any) => await client.get('/maintenance', { params }),
  createMaintenance: async (data: any) => await client.post('/maintenance', data),
  transitionMaintenance: async (id: number | string, to: string) => await client.patch(`/maintenance/${id}/transition`, { status: to }),
};

export const audits = {
  getAudits: async () => await client.get('/audits'),
  createAudit: async (data: any) => await client.post('/audits', data),
  getAudit: async (id: number | string) => await client.get(`/audits/${id}`),
  markAuditItem: async (id: number | string, data: any) => await client.post(`/audits/${id}/items`, data),
  closeAudit: async (id: number | string) => await client.post(`/audits/${id}/close`),
};

export const dashboard = {
  getDashboardKPIs: async () => await client.get('/dashboard'),
};

export const reports = {
  getReportsSummary: async () => await client.get('/reports/summary'),
};

export const notifications = {
  getNotifications: async (params?: any) => await client.get('/notifications', { params }),
  markNotificationRead: async (id: number | string) => await client.patch(`/notifications/${id}/read`),
  markAllRead: async () => await client.post('/notifications/mark-all-read'),
};

export const activityLogs = {
  getActivityLogs: async () => await client.get('/dashboard/activity'),
};
