import { api, type PageResponse } from './api';

export interface PublicClinicSlot {
  id: number;
  roomId: number;
  roomName: string;
  doctorId: number;
  specialtyId: number;
  specialtyName: string;
  startAt: string; // ISO Instant string
  endAt: string;   // ISO Instant string
  capacity: number;
  available: number;
}

export interface SearchPublicSlotsParams {
  date?: string; // YYYY-MM-DD
  specialtyId?: number;
  doctorId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface BookAppointmentRequest {
  slotId: number;
  reason: string;
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'NOT_COMPLETED';

export interface AppointmentDetailResponse {
  id: number;
  appointmentCode: string;
  slotId: number;
  doctorId: number;
  roomId: number;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  confirmedAt: string | null;
  closedAt: string | null;
  nonCompletionReason: string | null;
}

export const bookingService = {
  /**
   * Tra cứu danh sách khung khám công khai còn mở
   * GET /api/v1/public/clinic-slots
   */
  async searchPublicSlots(
    params: SearchPublicSlotsParams = {}
  ): Promise<PageResponse<PublicClinicSlot>> {
    const query = new URLSearchParams();
    if (params.date) query.append('date', params.date);
    if (params.specialtyId) query.append('specialtyId', params.specialtyId.toString());
    if (params.doctorId) query.append('doctorId', params.doctorId.toString());
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.size !== undefined) query.append('size', params.size.toString());
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/public/clinic-slots${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<PublicClinicSlot>>(endpoint);
  },

  /**
   * Đặt lịch hẹn khám bệnh trực tuyến (Yêu cầu vai trò PATIENT)
   * POST /api/v1/appointments
   */
  async bookAppointment(
    payload: BookAppointmentRequest
  ): Promise<AppointmentDetailResponse> {
    return api.post<AppointmentDetailResponse>('/api/v1/appointments', payload);
  },

  /**
   * Lấy danh sách lịch hẹn của chính bệnh nhân đang đăng nhập
   * GET /api/v1/appointments
   */
  async getMyAppointments(
    params: { page?: number; size?: number; sort?: string } = {}
  ): Promise<PageResponse<AppointmentDetailResponse>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.size !== undefined) query.append('size', params.size.toString());
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/appointments${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<AppointmentDetailResponse>>(endpoint);
  },

  /**
   * Lấy chi tiết lịch hẹn theo ID
   * GET /api/v1/appointments/{id}
   */
  async getAppointmentDetail(id: number): Promise<AppointmentDetailResponse> {
    return api.get<AppointmentDetailResponse>(`/api/v1/appointments/${id}`);
  },
};
