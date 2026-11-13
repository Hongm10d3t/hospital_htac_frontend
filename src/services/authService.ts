import { api, type AccountResponse, type CsrfResponse } from './api';

export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PHARMACIST' | 'PATIENT';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface HospitalConfig {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  logoUrl: string | null;
  description: string | null;
  advanceBookingDays: number;
}

export interface PingResponse {
  status: string;
}

export const authService = {
  /**
   * Kiểm tra backend liveness
   */
  async ping(): Promise<PingResponse> {
    return api.get<PingResponse>('/api/v1/public/ping');
  },

  /**
   * Lấy CSRF token hiện tại
   */
  async getCsrf(): Promise<CsrfResponse> {
    return api.get<CsrfResponse>('/api/v1/public/csrf');
  },

  /**
   * Lấy thông tin cấu hình bệnh viện
   */
  async getHospitalConfig(): Promise<HospitalConfig> {
    return api.get<HospitalConfig>('/api/v1/public/hospital-config');
  },

  /**
   * Đăng nhập tài khoản
   */
  async login(credentials: LoginRequest): Promise<AccountResponse> {
    const user = await api.post<AccountResponse>('/api/v1/public/auth/login', credentials);
    // Sau khi đăng nhập, session ID đổi -> cần làm mới CSRF token
    await api.refreshCsrfToken();
    return user;
  },

  /**
   * Lấy thông tin tài khoản đang đăng nhập hiện tại
   */
  async getCurrentUser(): Promise<AccountResponse> {
    return api.get<AccountResponse>('/api/v1/auth/me');
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    await api.post<void>('/api/v1/auth/logout');
    // Làm mới CSRF token sau khi hủy phiên
    await api.refreshCsrfToken();
  },
};
