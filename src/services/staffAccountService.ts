import { api, type PageResponse } from './api';

export type StaffRole = 'RECEPTIONIST' | 'DOCTOR' | 'PHARMACIST';

export interface StaffAccountResponse {
  id: number;
  username: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  active: boolean;
}

export interface CreateStaffAccountRequest {
  username: string;
  password?: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  specialtyId?: number;
}

export interface UpdateStaffAccountRequest {
  username?: string;
  fullName?: string;
  phone?: string;
  role?: StaffRole;
  specialtyId?: number;
}

export type PasswordResetVerificationMethod = 'IN_PERSON' | 'PHONE_CALLBACK';

export interface AdminPasswordResetRequest {
  newPassword: string;
  verifiedVia: PasswordResetVerificationMethod;
}

/**
 * Service Quản lý Tài khoản Nhân viên Y tế (F01.04)
 * Kết nối:
 * - /api/v1/admin/staff-accounts
 * - /api/v1/admin/accounts/{id}/password-reset
 */
export const staffAccountService = {
  /**
   * Danh sách tài khoản nhân viên (phân trang, sắp xếp)
   */
  async listStaffAccounts(params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<StaffAccountResponse>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/admin/staff-accounts${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<StaffAccountResponse>>(endpoint);
  },

  /**
   * Chi tiết tài khoản nhân viên theo ID
   */
  async getStaffAccount(id: number): Promise<StaffAccountResponse> {
    return api.get<StaffAccountResponse>(`/api/v1/admin/staff-accounts/${id}`);
  },

  /**
   * Tạo tài khoản nhân viên mới (nếu là DOCTOR yêu cầu truyền specialtyId)
   */
  async createStaffAccount(data: CreateStaffAccountRequest): Promise<StaffAccountResponse> {
    const payload: CreateStaffAccountRequest = {
      username: data.username.trim(),
      password: data.password?.trim(),
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      role: data.role,
      specialtyId: data.role === 'DOCTOR' && data.specialtyId ? Number(data.specialtyId) : undefined,
    };

    return api.post<StaffAccountResponse>('/api/v1/admin/staff-accounts', payload);
  },

  /**
   * Chỉnh sửa thông tin tài khoản nhân viên
   */
  async updateStaffAccount(
    id: number,
    data: UpdateStaffAccountRequest
  ): Promise<StaffAccountResponse> {
    const payload: UpdateStaffAccountRequest = {};
    if (data.username) payload.username = data.username.trim();
    if (data.fullName) payload.fullName = data.fullName.trim();
    if (data.phone) payload.phone = data.phone.trim();
    if (data.role) {
      payload.role = data.role;
      if (data.role === 'DOCTOR' && data.specialtyId) {
        payload.specialtyId = Number(data.specialtyId);
      }
    }

    return api.patch<StaffAccountResponse>(`/api/v1/admin/staff-accounts/${id}`, payload);
  },

  /**
   * Khóa tài khoản nhân viên (is_active = false)
   */
  async lockAccount(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/staff-accounts/${id}/lock`);
  },

  /**
   * Mở khóa tài khoản nhân viên (is_active = true)
   */
  async unlockAccount(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/staff-accounts/${id}/unlock`);
  },

  /**
   * Quản trị viên đặt lại mật khẩu cho tài khoản
   * Yêu cầu đối chiếu danh tính ngoài hệ thống: IN_PERSON hoặc PHONE_CALLBACK
   */
  async resetPassword(id: number, data: AdminPasswordResetRequest): Promise<void> {
    return api.post<void>(`/api/v1/admin/accounts/${id}/password-reset`, data);
  },
};
