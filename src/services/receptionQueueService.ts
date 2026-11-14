import { api, type PageResponse } from './api';
import type { ReceptionVisit, WaitingVisitsQuery } from './receptionCheckinService';

export interface VisitReportRow {
  date: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_COMPLETED' | 'VOIDED';
  doctorId: number | null;
  roomId: number | null;
  specialtyId: number | null;
  count: number;
}

export interface ReportPage<T> {
  from: string;
  to: string;
  timeBasis?: string;
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface VisitsReportQuery {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  doctorId?: number;
  roomId?: number;
  specialtyId?: number;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const receptionQueueService = {
  /**
   * Lấy danh sách bệnh nhân đang đợi khám (WAITING)
   * GET /api/v1/reception/visits/waiting
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
   * Lấy báo cáo thống kê lượt khám tổng thể toàn viện / theo phòng
   * GET /api/v1/reports/visits
   */
  async getVisitsReport(params: VisitsReportQuery): Promise<ReportPage<VisitReportRow>> {
    const query = new URLSearchParams();
    query.set('from', params.from);
    query.set('to', params.to);
    if (params.doctorId) query.set('doctorId', String(params.doctorId));
    if (params.roomId) query.set('roomId', String(params.roomId));
    if (params.specialtyId) query.set('specialtyId', String(params.specialtyId));
    if (params.status) query.set('status', params.status);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<ReportPage<VisitReportRow>>(`/api/v1/reports/visits?${queryString}`);
  },

  /**
   * Báo vắng bệnh nhân (WAITING -> NOT_COMPLETED)
   * POST /api/v1/reception/visits/{visitId}/not-complete
   */
  async notCompleteVisit(visitId: number, reason: string): Promise<ReceptionVisit> {
    return api.post<ReceptionVisit>(`/api/v1/reception/visits/${visitId}/not-complete`, {
      reason: reason.trim(),
    });
  },

  /**
   * Vô hiệu hóa lượt tiếp nhận nhập nhầm (WAITING -> VOIDED)
   * POST /api/v1/reception/visits/{visitId}/void
   */
  async voidVisit(visitId: number, reason: string): Promise<ReceptionVisit> {
    return api.post<ReceptionVisit>(`/api/v1/reception/visits/${visitId}/void`, {
      reason: reason.trim(),
    });
  },
};
