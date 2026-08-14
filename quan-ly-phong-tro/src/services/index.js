/**
 * Thêm các API services cần thiết cho room detail, zone hierarchy, xe cộ, quyết toán hợp đồng & báo cáo
 */
import apiClient from './apiClient';

export const authService = {
  async login(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    const payload = data?.data || data;
    localStorage.setItem('accessToken', payload.accessToken);
    localStorage.setItem('refreshToken', payload.refreshToken);
    localStorage.setItem('user', JSON.stringify({
      id: payload.userId, role: payload.role,
      fullName: payload.fullName, email: payload.email, avatarUrl: payload.avatarUrl
    }));
    return payload;
  },
  async logout() {
    try { await apiClient.post('/auth/logout'); } catch {}
    localStorage.clear();
  },
  getCurrentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  isAuthenticated() { return !!localStorage.getItem('accessToken'); }
};

export const adminService = {
  getStats: () => apiClient.get('/admin/stats').then(r => r.data),
  getLandlords: (search, isActive) => apiClient.get('/admin/landlords', { params: { search, isActive } }).then(r => r.data),
  createLandlord: (data) => apiClient.post('/admin/landlords', data).then(r => r.data),
  updateLandlord: (id, data) => apiClient.put(`/admin/landlords/${id}`, data).then(r => r.data),
  toggleLock: (id) => apiClient.patch(`/admin/landlords/${id}/toggle-lock`).then(r => r.data),
  resetPassword: (id) => apiClient.patch(`/admin/landlords/${id}/reset-password`).then(r => r.data),
  getComplaints: () => apiClient.get('/admin/complaints').then(r => r.data),
  replyComplaint: (id, reply) => apiClient.post(`/admin/complaints/${id}/reply`, { reply }).then(r => r.data),
};

export const zoneService = {
  getZones: () => apiClient.get('/zones').then(r => r.data),
  createZone: (data) => apiClient.post('/zones', data).then(r => r.data),
  updateZone: (id, data) => apiClient.put(`/zones/${id}`, data).then(r => r.data),
  deleteZone: (id) => apiClient.delete(`/zones/${id}`).then(r => r.data),
};

export const roomService = {
  getRooms: (zoneId) => apiClient.get('/rooms', { params: zoneId ? { zoneId } : {} }).then(r => r.data),
  getRoom: (id) => apiClient.get(`/rooms/${id}`).then(r => r.data),
  getRoomDetail: (id) => apiClient.get(`/rooms/${id}/detail`).then(r => r.data),
  createRoom: (data) => apiClient.post('/rooms', data).then(r => r.data),
  updateRoom: (id, data) => apiClient.put(`/rooms/${id}`, data).then(r => r.data),
  deleteRoom: (id) => apiClient.delete(`/rooms/${id}`).then(r => r.data),
  addEquipment: (roomId, data) => apiClient.post(`/rooms/${roomId}/equipments`, data).then(r => r.data),
  updateEquipment: (equipmentId, data) => apiClient.put(`/rooms/equipments/${equipmentId}`, data).then(r => r.data),
  deleteEquipment: (equipmentId) => apiClient.delete(`/rooms/equipments/${equipmentId}`).then(r => r.data),
};

export const tenantService = {
  getTenants: () => apiClient.get('/tenants').then(r => r.data),
  getTenant: (id) => apiClient.get(`/tenants/${id}`).then(r => r.data),
  createTenant: (data) => apiClient.post('/tenants', data).then(r => r.data),
  updateTenant: (id, data) => apiClient.put(`/tenants/${id}`, data).then(r => r.data),
  deleteTenant: (id) => apiClient.delete(`/tenants/${id}`).then(r => r.data),
};

export const contractService = {
  getContracts: () => apiClient.get('/contracts').then(r => r.data),
  createContract: (data) => apiClient.post('/contracts', data).then(r => r.data),
  updateContract: (id, data) => apiClient.put(`/contracts/${id}`, data).then(r => r.data),
  deleteContract: (id) => apiClient.delete(`/contracts/${id}`).then(r => r.data),
  terminate: (id) => apiClient.patch(`/contracts/${id}/terminate`).then(r => r.data),
  renew: (id, data) => apiClient.post(`/contracts/${id}/renew`, data).then(r => r.data),
  settle: (id, data) => apiClient.post(`/contracts/${id}/settle`, data).then(r => r.data),
  checkExpiring: () => apiClient.post('/contracts/check-expiring').then(r => r.data),
};

export const utilityService = {
  getLogs: (roomId) => apiClient.get('/utilities', { params: roomId ? { roomId } : {} }).then(r => r.data),
  record: (data) => apiClient.post('/utilities', data).then(r => r.data),
  getRate: () => apiClient.get('/utilities/rate').then(r => r.data),
  updateRate: (data) => apiClient.put('/utilities/rate', data).then(r => r.data),
};

export const serviceMgmtService = {
  getServices: (zoneId) => apiClient.get('/services', { params: zoneId ? { zoneId } : {} }).then(r => r.data),
  createService: (data) => apiClient.post('/services', data).then(r => r.data),
  updateService: (id, data) => apiClient.put(`/services/${id}`, data).then(r => r.data),
  deleteService: (id) => apiClient.delete(`/services/${id}`).then(r => r.data),
};

export const invoiceService = {
  getInvoices: (params) => apiClient.get('/invoices', { params }).then(r => r.data),
  getInvoice: (id) => apiClient.get(`/invoices/${id}`).then(r => r.data),
  createInvoice: (data) => apiClient.post('/invoices', data).then(r => r.data),
  updateInvoice: (id, data) => apiClient.put(`/invoices/${id}`, data).then(r => r.data),
  updateStatus: (id, status) => apiClient.patch(`/invoices/${id}/status`, null, { params: { status } }).then(r => r.data),
};

export const paymentService = {
  getPayments: () => apiClient.get('/payments').then(r => r.data),
  submit: (data) => apiClient.post('/payments', data).then(r => r.data),
  submitPayment: (data) => apiClient.post('/payments', data).then(r => r.data),
  confirm: (id, data) => apiClient.patch(`/payments/${id}/confirm`, data).then(r => r.data),
};

export const maintenanceService = {
  getRequests: () => apiClient.get('/maintenance').then(r => r.data),
  create: (data) => apiClient.post('/maintenance', data).then(r => r.data),
  createRequest: (data) => apiClient.post('/maintenance', data).then(r => r.data),
  update: (id, data) => apiClient.put(`/maintenance/${id}`, data).then(r => r.data),
};

export const notificationService = {
  getNotifications: () => apiClient.get('/notifications').then(r => r.data),
  create: (data) => apiClient.post('/notifications', data).then(r => r.data),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then(r => r.data),
  delete: (id) => apiClient.delete(`/notifications/${id}`).then(r => r.data),
};

export const profileService = {
  getProfile: () => apiClient.get('/profile').then(r => r.data),
  updateProfile: (data) => apiClient.put('/profile', data).then(r => r.data),
  updateVehicle: (data) => apiClient.put('/profile/vehicle', data).then(r => r.data),
  changePassword: (data) => apiClient.post('/profile/change-password', data).then(r => r.data),
};

export const reportService = {
  getFinancialSummary: () => apiClient.get('/reports/financial-summary').then(r => r.data),
  exportExcel: () => apiClient.get('/reports/export-excel', { responseType: 'blob' }),
};

export const dashboardService = {
  getLandlordDashboard: () => apiClient.get('/dashboard/landlord').then(r => r.data),
  getTenantDashboard: () => apiClient.get('/dashboard/tenant').then(r => r.data),
};
