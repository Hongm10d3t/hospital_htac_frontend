import { api, type PageResponse } from './api';

export interface DoctorProfileAdminResponse {
  userId: number;
  specialtyId: number;
  avatarUrl: string | null;
  professionalTitle: string | null;
  position: string | null;
  practiceStartYear: number | null;
  introduction: string | null;
  clinicalExpertise: string | null;
  certifications: string | null;
  publicProfile: boolean;
}

export interface UpdateDoctorProfileRequest {
  specialtyId: number;
  avatarUrl?: string | null;
  professionalTitle?: string | null;
  position?: string | null;
  practiceStartYear?: number | null;
  introduction?: string | null;
  clinicalExpertise?: string | null;
  certifications?: string | null;
}

/**
 * Service quản lý Hồ sơ chuyên môn 62 Bác sĩ (F01.05)
 * Kết nối:
 * - GET /api/v1/admin/doctor-profiles
 * - GET /api/v1/admin/doctor-profiles/{userId}
 * - PUT /api/v1/admin/doctor-profiles/{userId}
 * - POST /api/v1/admin/doctor-profiles/{userId}/publish
 * - POST /api/v1/admin/doctor-profiles/{userId}/unpublish
 */
export const doctorProfileService = {
  /**
   * Danh sách hồ sơ bác sĩ (phân trang, lọc theo chuyên khoa)
   */
  async listProfiles(params?: {
    specialtyId?: number;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<DoctorProfileAdminResponse>> {
    const query = new URLSearchParams();
    if (params?.specialtyId) query.set('specialtyId', String(params.specialtyId));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/admin/doctor-profiles${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<DoctorProfileAdminResponse>>(endpoint);
  },

  /**
   * Xem chi tiết hồ sơ bác sĩ theo userId
   */
  async getProfile(userId: number): Promise<DoctorProfileAdminResponse> {
    return api.get<DoctorProfileAdminResponse>(`/api/v1/admin/doctor-profiles/${userId}`);
  },

  /**
   * Cập nhật toàn bộ thông tin hồ sơ chuyên môn của bác sĩ
   */
  async updateProfile(
    userId: number,
    data: UpdateDoctorProfileRequest
  ): Promise<DoctorProfileAdminResponse> {
    const payload: UpdateDoctorProfileRequest = {
      specialtyId: Number(data.specialtyId),
      avatarUrl: data.avatarUrl?.trim() || null,
      professionalTitle: data.professionalTitle?.trim() || null,
      position: data.position?.trim() || null,
      practiceStartYear: data.practiceStartYear ? Number(data.practiceStartYear) : null,
      introduction: data.introduction?.trim() || null,
      clinicalExpertise: data.clinicalExpertise?.trim() || null,
      certifications: data.certifications?.trim() || null,
    };

    return api.put<DoctorProfileAdminResponse>(`/api/v1/admin/doctor-profiles/${userId}`, payload);
  },

  /**
   * Bật công khai hồ sơ bác sĩ ra Cổng Bệnh nhân (M02.03)
   */
  async publish(userId: number): Promise<DoctorProfileAdminResponse> {
    return api.post<DoctorProfileAdminResponse>(`/api/v1/admin/doctor-profiles/${userId}/publish`);
  },

  /**
   * Tắt công khai hồ sơ bác sĩ
   */
  async unpublish(userId: number): Promise<DoctorProfileAdminResponse> {
    return api.post<DoctorProfileAdminResponse>(`/api/v1/admin/doctor-profiles/${userId}/unpublish`);
  },
};
