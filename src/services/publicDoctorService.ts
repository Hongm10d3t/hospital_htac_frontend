import { api, type PageResponse } from './api';

export interface DoctorPublicResponse {
  userId: number;
  fullName: string;
  specialtyId: number;
  specialtyName: string;
  avatarUrl: string | null;
  professionalTitle: string | null;
  position: string | null;
  practiceStartYear: number | null;
  introduction: string | null;
  clinicalExpertise: string | null;
  certifications: string | null;
  availableSlotsUrl: string;
}

export interface PublicDoctorFilterParams {
  specialtyId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PublicClinicSlotResponse {
  id: number;
  roomId: number;
  roomName: string;
  doctorId: number;
  specialtyId: number;
  specialtyName: string;
  startAt: string; // ISO Instant
  endAt: string;   // ISO Instant
  capacity: number;
  available: number;
}

export interface PublicSlotFilterParams {
  date?: string; // "YYYY-MM-DD"
  specialtyId?: number;
  doctorId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Service Cổng thông tin Công khai dành cho Bệnh nhân (Public Portal - F02)
 * Kết nối:
 * - GET /api/v1/public/doctors
 * - GET /api/v1/public/doctors/{userId}
 * - GET /api/v1/public/clinic-slots
 */
export const publicDoctorService = {
  /**
   * Danh bạ bác sĩ công khai (chỉ những bác sĩ có publicProfile = true)
   */
  async listDoctors(params?: PublicDoctorFilterParams): Promise<PageResponse<DoctorPublicResponse>> {
    const query = new URLSearchParams();
    if (params?.specialtyId) query.set('specialtyId', String(params.specialtyId));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/public/doctors${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<DoctorPublicResponse>>(endpoint);
  },

  /**
   * Xem hồ sơ chi tiết 1 bác sĩ công khai theo userId
   */
  async getDoctor(userId: number): Promise<DoctorPublicResponse> {
    return api.get<DoctorPublicResponse>(`/api/v1/public/doctors/${userId}`);
  },

  /**
   * Tìm kiếm các khung giờ khám khả dụng cho bệnh nhân đặt lịch
   */
  async searchSlots(params?: PublicSlotFilterParams): Promise<PageResponse<PublicClinicSlotResponse>> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.specialtyId) query.set('specialtyId', String(params.specialtyId));
    if (params?.doctorId) query.set('doctorId', String(params.doctorId));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/public/clinic-slots${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<PublicClinicSlotResponse>>(endpoint);
  },
};
