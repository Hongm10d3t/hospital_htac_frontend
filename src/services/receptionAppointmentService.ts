import { api, type PageResponse } from './api';

export type ReceptionAppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NOT_COMPLETED';

export interface InternalAppointmentData {
  id: number;
  appointmentCode: string;
  slotId: number;
  doctorId: number;
  roomId: number;
  startAt: string; // ISO Instant
  endAt: string; // ISO Instant
  status: ReceptionAppointmentStatus;
  confirmedAt: string | null; // ISO Instant
  closedAt: string | null; // ISO Instant
  nonCompletionReason: string | null;
}

export interface ReceptionAppointmentResponse {
  appointment: InternalAppointmentData;
  patientId: number;
  patientName: string;
  phone: string;
  reason: string;
}

export interface ReceptionAppointmentsQuery {
  status?: ReceptionAppointmentStatus | string;
  date?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  sort?: string; // "id" hoặc "createdAt" (ví dụ "createdAt,DESC")
}

export interface CheckinVisitResponse {
  id: number;
  visitCode: string;
  patientId: number;
  appointmentId: number | null;
  slotId: number;
  roomId: number;
  queueDate: string;
  queueNumber: number;
  arrivedAt: string;
  status: string;
  reason: string | null;
}

export const receptionAppointmentService = {
  /**
   * Danh sách lịch hẹn trực tuyến phục vụ Tiếp đón
   * Endpoint: GET /api/v1/reception/appointments
   */
  async getAppointments(params?: ReceptionAppointmentsQuery): Promise<PageResponse<ReceptionAppointmentResponse>> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.date) query.set('date', params.date);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/reception/appointments${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<ReceptionAppointmentResponse>>(endpoint);
  },

  /**
   * Chi tiết lịch hẹn
   * Endpoint: GET /api/v1/reception/appointments/{id}
   */
  async getAppointment(id: number): Promise<ReceptionAppointmentResponse> {
    return api.get<ReceptionAppointmentResponse>(`/api/v1/reception/appointments/${id}`);
  },

  /**
   * Xác nhận lịch hẹn (PENDING -> CONFIRMED)
   * Endpoint: POST /api/v1/reception/appointments/{id}/confirm
   */
  async confirmAppointment(id: number): Promise<ReceptionAppointmentResponse> {
    return api.post<ReceptionAppointmentResponse>(`/api/v1/reception/appointments/${id}/confirm`);
  },

  /**
   * Đóng lịch hẹn không hoàn thành / Báo vắng mặt / Hủy hẹn
   * Endpoint: POST /api/v1/reception/appointments/{id}/not-complete
   */
  async notCompleteAppointment(id: number, reason: string): Promise<ReceptionAppointmentResponse> {
    return api.post<ReceptionAppointmentResponse>(`/api/v1/reception/appointments/${id}/not-complete`, {
      reason: reason.trim(),
    });
  },

  /**
   * Hoàn thành lịch hẹn (nếu lượt khám đã xong)
   * Endpoint: POST /api/v1/reception/appointments/{id}/complete
   */
  async completeAppointment(id: number): Promise<ReceptionAppointmentResponse> {
    return api.post<ReceptionAppointmentResponse>(`/api/v1/reception/appointments/${id}/complete`);
  },

  /**
   * Tiếp đón vào khám ngay từ lịch hẹn đã có (chuyển thành lượt khám thực tế, cấp số thứ tự)
   * Endpoint: POST /api/v1/reception/visits/appointments/{appointmentId}
   */
  async checkinAppointment(appointmentId: number): Promise<CheckinVisitResponse> {
    return api.post<CheckinVisitResponse>(`/api/v1/reception/visits/appointments/${appointmentId}`);
  },
};
