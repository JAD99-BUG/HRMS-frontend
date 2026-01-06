import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://hrms-backend-9blo.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data)
};

export const employeesAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`)
};

export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  getEmployees: (id) => api.get(`/departments/${id}/employees`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`)
};

export const positionsAPI = {
  getAll: () => api.get('/positions'),
  create: (data) => api.post('/positions', data)
};

export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  importFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/attendance/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export const leaveAPI = {
  getRequests: (params) => api.get('/leave/requests', { params }),
  getById: (id) => api.get(`/leave/requests/${id}`),
  create: (data) => api.post('/leave/requests', data),
  update: (id, data) => api.put(`/leave/requests/${id}`, data),
  getTypes: () => api.get('/leave/types')
};

export const payrollAPI = {
  getEmployees: (params) => api.get('/payroll/employees', { params }),
  bulkUpdateEntries: (data) => api.post('/payroll/entries', data),
  payIndividual: (data) => api.post('/payroll/pay-individual', data),
  payAll: (data) => api.post('/payroll/pay-all', data),
  getDeductionTypes: () => api.get('/payroll/deduction-types')
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getDepartments: () => api.get('/dashboard/departments')
};

export const reportsAPI = {
  getAttendance: () => api.get('/reports/attendance'),
  getPayroll: () => api.get('/reports/payroll'),
  getDepartments: () => api.get('/reports/departments')
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles')
};

export default api;
