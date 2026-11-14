import { api, type PageResponse } from './api';

export type ReceptionVisitStatus =
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NOT_COMPLETED'
  | 'VOIDED';

export interface ReceptionVisit {
  id: number;
  visitCode: string;
  patientId: number;
  appointmentId: number | null;
  slotId: number;
  roomId: number;
  queueDate: string; // YYYY-MM-DD
  queueNumber: number;
  arrivedAt: string; // ISO Instant
  status: ReceptionVisitStatus;
  reason: string | null;
  outcomeReason: string | null;
}

export interface DirectReceptionRequest {
  patientId: number;
  slotId: number;
  reason?: string;
}

export interface WaitingVisitsQuery {
  date?: string; // YYYY-MM-DD (mặc định hôm nay)
  roomId?: number;
  slotId?: number;
  page?: number;
  size?: number;
  sort?: string; // queueNumber,ASC | id
}

export const receptionCheckinService = {
  /**
   * Tiếp đón lượt khám có hẹn trước
   * Endpoint: POST /api/v1/reception/visits/appointments/{appointmentId}
   */
  async receiveBooked(appointmentId: number): Promise<ReceptionVisit> {
    return api.post<ReceptionVisit>(`/api/v1/reception/visits/appointments/${appointmentId}`);
  },

  /**
   * Tiếp đón lượt khám trực tiếp (vãng lai)
   * Endpoint: POST /api/v1/reception/visits/direct
   */
  async receiveDirect(data: DirectReceptionRequest): Promise<ReceptionVisit> {
    return api.post<ReceptionVisit>('/api/v1/reception/visits/direct', {
      patientId: data.patientId,
      slotId: data.slotId,
      reason: data.reason?.trim() || null,
    });
  },

  /**
   * Lấy danh sách bệnh nhân đang chờ khám (WAITING)
   * Endpoint: GET /api/v1/reception/visits/waiting
   */
  async getWaitingVisits(params?: WaitingVisitsQuery): Promise<PageResponse<ReceptionVisit>> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.roomId) query.set('roomId', String(params.roomId));
    if (params?.slotId) query.set('slotId', String(params.slotId));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/reception/visits/waiting${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<ReceptionVisit>>(endpoint);
  },

  /**
   * Đóng lượt khám không hoàn thành (bỏ dở / không đến sau khi tiếp nhận)
   * Endpoint: POST /api/v1/reception/visits/{visitId}/not-complete
   */
  async notCompleteVisit(visitId: number, reason: string): Promise<ReceptionVisit> {
    return api.post<ReceptionVisit>(`/api/v1/reception/visits/${visitId}/not-complete`, {
      reason: reason.trim(),
    });
  },

  /**
   * Hủy bỏ lượt tiếp nhận do thao tác nhầm (VOID)
   * Endpoint: POST /api/v1/reception/visits/{visitId}/void
   */
  async voidVisit(visitId: number, reason: string): Promise<ReceptionVisit> {
    return api.post<ReceptionVisit>(`/api/v1/reception/visits/${visitId}/void`, {
      reason: reason.trim(),
    });
  },
};
