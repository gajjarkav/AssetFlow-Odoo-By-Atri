import apiClient from './client';

export const auth = {
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  signup: (data: any) => apiClient.post('/auth/signup', data),
  getMe: () => apiClient.get('/auth/me'),
};

export const departments = {
  getDepartments: () => apiClient.get('/departments'),
  createDepartment: (data: any) => apiClient.post('/departments', data),
  updateDepartment: (id: number, data: any) => apiClient.put(`/departments/${id}`, data),
};

export const categories = {
  getCategories: () => apiClient.get('/categories'),
  createCategory: (data: any) => apiClient.post('/categories', data),
};

export const employees = {
  getEmployees: (params?: any) => apiClient.get('/employees', { params }),
  updateEmployeeRole: (id: number, role: string) => apiClient.patch(`/employees/${id}/role`, { role }),
  updateEmployee: (id: number, data: any) => apiClient.put(`/employees/${id}`, data),
};

export const assets = {
  getAssets: (params?: any) => apiClient.get('/assets', { params }),
  createAsset: (data: any) => apiClient.post('/assets', data),
  getAsset: (id: number) => apiClient.get(`/assets/${id}`),
  getAssetHistory: (id: number) => apiClient.get(`/assets/${id}/history`),
};

export const allocations = {
  getAllocations: (params?: any) => apiClient.get('/allocations', { params }),
  createAllocation: (data: any) => apiClient.post('/allocations', data),
  returnAllocation: (id: number, notes?: string) => apiClient.post(`/allocations/${id}/return`, { notes }),
};

export const transfers = {
  getTransfers: (params?: any) => apiClient.get('/transfers', { params }),
  createTransfer: (data: any) => apiClient.post('/transfers', data),
  approveTransfer: (id: number) => apiClient.post(`/transfers/${id}/approve`),
  rejectTransfer: (id: number, reason: string) => apiClient.post(`/transfers/${id}/reject`, { reason }),
};

export const resources = {
  getResources: () => apiClient.get('/resources'),
  getBookings: (params?: any) => apiClient.get('/bookings', { params }),
  createBooking: (data: any) => apiClient.post('/bookings', data),
  cancelBooking: (id: number) => apiClient.post(`/bookings/${id}/cancel`),
};

export const maintenance = {
  getMaintenance: (params?: any) => apiClient.get('/maintenance', { params }),
  createMaintenance: (data: any) => apiClient.post('/maintenance', data),
  transitionMaintenance: (id: number, to: string) => apiClient.post(`/maintenance/${id}/transition`, { to }),
};

export const audits = {
  getAudits: () => apiClient.get('/audits'),
  createAudit: (data: any) => apiClient.post('/audits', data),
  getAudit: (id: number) => apiClient.get(`/audits/${id}`),
  markAuditItem: (id: number, data: any) => apiClient.post(`/audits/items/${id}`, data),
  closeAudit: (id: number) => apiClient.post(`/audits/${id}/close`),
};

export const dashboard = {
  getDashboardKPIs: () => apiClient.get('/dashboard/kpis'),
};

export const reports = {
  getReportsSummary: () => apiClient.get('/reports/summary'),
};

export const notifications = {
  getNotifications: (params?: any) => apiClient.get('/notifications', { params }),
  markNotificationRead: (id: number) => apiClient.post(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
};

export const activityLogs = {
  getActivityLogs: () => apiClient.get('/activity-logs'),
};
