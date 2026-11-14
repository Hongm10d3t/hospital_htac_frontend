import { api, type PageResponse } from './api';

export type VisitStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_COMPLETED' | 'VOIDED';

export interface PatientVisitSummary {
  id: number;
  visitCode: string;
  appointmentId: number | null;
  slotId: number | null;
  roomId: number;
  queueDate: string; // YYYY-MM-DD
  queueNumber: number;
  arrivedAt: string; // ISO Instant
  status: VisitStatus;
  diagnosis: string | null;
  followUpDate: string | null; // YYYY-MM-DD
}

export interface PatientPrescriptionSummary {
  id: number;
  prescriptionCode: string;
  visitId: number;
  status: 'ISSUED' | 'CANCELLED' | string;
  issuedAt: string; // ISO Instant
  note: string | null;
}

export interface PatientPrescriptionItem {
  medicineId: number;
  medicineName: string;
  baseUnit: string;
  quantity: number;
  usageInstruction: string;
}

export interface PatientPrescriptionDetail {
  prescription: PatientPrescriptionSummary;
  items: PatientPrescriptionItem[];
}

export interface PatientVisitDetail {
  visit: PatientVisitSummary;
  diagnosisCode: string | null;
  clinicalNotes: string | null;
  treatmentPlan: string | null;
  followUpDate: string | null;
  prescriptions: PatientPrescriptionSummary[];
}

export interface PatientVisitsQuery {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  sort?: string;
}

export const patientHistoryService = {
  /**
   * Lấy danh sách lượt khám bệnh cá nhân của bệnh nhân đang đăng nhập
   * Endpoint: GET /api/v1/patients/me/visits
   */
  async getMyVisits(params?: PatientVisitsQuery): Promise<PageResponse<PatientVisitSummary>> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/patients/me/visits${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<PatientVisitSummary>>(endpoint);
  },

  /**
   * Lấy chi tiết một lượt khám bệnh (kèm chẩn đoán, ghi nhận lâm sàng, đơn thuốc)
   * Endpoint: GET /api/v1/patients/me/visits/{visitId}
   */
  async getMyVisitDetail(visitId: number): Promise<PatientVisitDetail> {
    return api.get<PatientVisitDetail>(`/api/v1/patients/me/visits/${visitId}`);
  },

  /**
   * Lấy danh sách các đơn thuốc đã công bố của bệnh nhân
   * Endpoint: GET /api/v1/patients/me/prescriptions
   */
  async getMyPrescriptions(params?: PatientVisitsQuery): Promise<PageResponse<PatientPrescriptionSummary>> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/patients/me/prescriptions${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<PatientPrescriptionSummary>>(endpoint);
  },

  /**
   * Lấy chi tiết đơn thuốc và các dòng danh mục thuốc được kê
   * Endpoint: GET /api/v1/patients/me/prescriptions/{prescriptionId}
   */
  async getMyPrescriptionDetail(prescriptionId: number): Promise<PatientPrescriptionDetail> {
    return api.get<PatientPrescriptionDetail>(`/api/v1/patients/me/prescriptions/${prescriptionId}`);
  },
};
