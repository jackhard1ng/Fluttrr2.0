import client from './client';

interface AdminStatsResponse {
  totalUsers: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  verifiedBusinesses: number;
  totalEvents: number;
  activeEvents: number;
  totalReports: number;
  pendingReports: number;
}

interface AdminBusinessItem {
  id: string;
  email: string;
  businessName: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  logo: string;
  verified: boolean;
  status: string;
  createdAt: string;
  eventCount: number;
}

interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  displayName: string;
  profilePhoto: string;
  city: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminReportItem {
  id: string;
  reportType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reportedBy: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface PaginatedList<T> {
  total: number;
  page: number;
  totalPages: number;
}

interface BusinessListResponse extends PaginatedList<AdminBusinessItem> {
  businesses: AdminBusinessItem[];
}

interface UserListResponse extends PaginatedList<AdminUserItem> {
  users: AdminUserItem[];
}

interface ReportListResponse extends PaginatedList<AdminReportItem> {
  reports: AdminReportItem[];
}

export type {
  AdminStatsResponse,
  AdminBusinessItem,
  AdminUserItem,
  AdminReportItem,
  BusinessListResponse,
  UserListResponse,
  ReportListResponse,
};

export const adminApi = {
  getStats() {
    return client.get<AdminStatsResponse>('/api/admin/stats');
  },

  // Businesses
  getBusinesses(params?: { status?: string; verified?: string; page?: number; limit?: number }) {
    return client.get<BusinessListResponse>('/api/admin/businesses', { params });
  },
  verifyBusiness(id: string) {
    return client.put(`/api/admin/businesses/${id}/verify`);
  },
  unverifyBusiness(id: string) {
    return client.put(`/api/admin/businesses/${id}/unverify`);
  },
  suspendBusiness(id: string) {
    return client.put(`/api/admin/businesses/${id}/suspend`);
  },
  reinstateBusiness(id: string) {
    return client.put(`/api/admin/businesses/${id}/reinstate`);
  },

  // Users
  getUsers(params?: { status?: string; page?: number; limit?: number }) {
    return client.get<UserListResponse>('/api/admin/users', { params });
  },
  suspendUser(id: string) {
    return client.put(`/api/admin/users/${id}/suspend`);
  },
  reinstateUser(id: string) {
    return client.put(`/api/admin/users/${id}/reinstate`);
  },

  // Reports
  getReports(params?: { status?: string; type?: string; page?: number; limit?: number }) {
    return client.get<ReportListResponse>('/api/admin/reports', { params });
  },
  updateReport(id: string, status: string) {
    return client.put(`/api/admin/reports/${id}`, { status });
  },

  // Messages
  sendMessage(data: { targetType: string; targetId?: string; subject: string; body: string }) {
    return client.post('/api/admin/messages', data);
  },
};
