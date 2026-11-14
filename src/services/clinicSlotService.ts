import { api, type PageResponse } from './api';

export type ClinicSlotStatus = 'OPEN' | 'CLOSED';

export interface ClinicSlotResponse {
  id: number;
  roomId: number;
  doctorId: number;
  startAt: string; // ISO Instant e.g. "2026-11-17T01:00:00Z"
  endAt: string;   // ISO Instant e.g. "2026-11-17T01:30:00Z"
  capacity: number;
  status: ClinicSlotStatus;
}

export interface CreateClinicSlotRequest {
  roomId: number;
  doctorId: number;
  startAt: string; // ISO with offset, e.g. "2026-11-17T08:00:00+07:00"
  endAt: string;   // ISO with offset, e.g. "2026-11-17T08:30:00+07:00"
  capacity: number;
}

export interface CreateClinicSessionRequest {
  roomId: number;
  doctorId: number;
  dates: string[]; // Mảng các ngày "YYYY-MM-DD", 1-7 ngày trong cùng 1 tuần (T2 - CN)
  startTime: string; // "HH:mm", ví dụ "08:00"
  endTime: string;   // "HH:mm", ví dụ "11:30"
  durationMinutes: number; // 1-240 phút (phải chia hết cho khoảng thời gian)
  capacity: number; // Sức chứa mỗi khung (>= 1)
}

export interface UpdateClinicSlotRequest {
  startAt: string; // ISO with offset
  endAt: string;   // ISO with offset
  capacity: number;
}

export interface ClinicSlotFilterParams {
  roomId?: number;
  doctorId?: number;
  from?: string; // ISO with offset (inclusive)
  to?: string;   // ISO with offset (exclusive)
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Service Quản lý Lịch làm việc & Phân ca khám bệnh viện (F01.06 - M03.01 & M03.02)
 * Kết nối các API Admin:
 * - GET /api/v1/admin/clinic-slots
 * - GET /api/v1/admin/clinic-slots/{id}
 * - POST /api/v1/admin/clinic-slots
 * - POST /api/v1/admin/clinic-slots/sessions
 * - PUT /api/v1/admin/clinic-slots/{id}
 * - POST /api/v1/admin/clinic-slots/{id}/close
 */
export const clinicSlotService = {
  /**
   * Danh sách khung giờ khám phân trang và lọc theo phòng, bác sĩ, khoảng thời gian
   */
  async listSlots(params?: ClinicSlotFilterParams): Promise<PageResponse<ClinicSlotResponse>> {
    const query = new URLSearchParams();
    if (params?.roomId) query.set('roomId', String(params.roomId));
    if (params?.doctorId) query.set('doctorId', String(params.doctorId));
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const url = `/api/v1/admin/clinic-slots${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<ClinicSlotResponse>>(url);
  },

  /**
   * Xem chi tiết 1 khung giờ khám theo ID
   */
  async getSlot(id: number): Promise<ClinicSlotResponse> {
    return api.get<ClinicSlotResponse>(`/api/v1/admin/clinic-slots/${id}`);
  },

  /**
   * Tạo 1 khung giờ khám đơn lẻ
   */
  async createSlot(data: CreateClinicSlotRequest): Promise<ClinicSlotResponse> {
    return api.post<ClinicSlotResponse>('/api/v1/admin/clinic-slots', data);
  },

  /**
   * Tạo nhiều khung giờ khám hàng loạt theo tuần (Batch Session)
   */
  async createSession(data: CreateClinicSessionRequest): Promise<ClinicSlotResponse[]> {
    return api.post<ClinicSlotResponse[]>('/api/v1/admin/clinic-slots/sessions', data);
  },

  /**
   * Cập nhật thời gian hoặc sức chứa khung giờ khám
   */
  async updateSlot(id: number, data: UpdateClinicSlotRequest): Promise<ClinicSlotResponse> {
    return api.put<ClinicSlotResponse>(`/api/v1/admin/clinic-slots/${id}`, data);
  },

  /**
   * Đóng nhận đăng ký cho khung giờ khám (trạng thái chuyển sang CLOSED)
   */
  async closeSlot(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/clinic-slots/${id}/close`);
  },
};
