import { api } from './api';

export interface HospitalConfig {
  name: string;
  address: string;
  phone: string;
  email: string | null;
  logoUrl: string | null;
  description: string | null;
  advanceBookingDays: number;
}

export interface UpsertHospitalConfigRequest {
  name: string;
  address: string;
  phone: string;
  email?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  advanceBookingDays: number;
}

/**
 * Service quản lý thông tin cấu hình Bệnh viện HTAC (F01.02)
 * Kết nối:
 * - GET /api/v1/public/hospital (Công khai)
 * - PUT /api/v1/admin/hospital-config (Chỉ ADMIN, cần CSRF)
 */
export const hospitalConfigService = {
  /**
   * Lấy thông tin cấu hình hiện tại của bệnh viện
   */
  async getHospitalConfig(): Promise<HospitalConfig> {
    return api.get<HospitalConfig>('/api/v1/public/hospital');
  },

  /**
   * Cập nhật thông tin cấu hình cơ sở y tế
   */
  async updateHospitalConfig(data: UpsertHospitalConfigRequest): Promise<HospitalConfig> {
    // Chuẩn hóa: nếu email, logoUrl, description là chuỗi rỗng thì chuyển thành null hoặc chuỗi hợp lệ
    const payload: UpsertHospitalConfigRequest = {
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      description: data.description?.trim() || null,
      advanceBookingDays: Number(data.advanceBookingDays),
    };

    return api.put<HospitalConfig>('/api/v1/admin/hospital-config', payload);
  },
};
