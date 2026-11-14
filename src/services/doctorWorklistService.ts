import { api, type PageResponse } from './api';
import type { ReceptionVisitStatus } from './receptionCheckinService';

export interface ClinicalPatientIdentity {
  id: number;
  patientCode: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface DoctorSlotResponse {
  id: number;
  roomId: number;
  doctorId: number;
  startAt: string; // ISO Instant
  endAt: string;   // ISO Instant
  capacity: number;
  status: 'OPEN' | 'CLOSED';
}

export interface DoctorVisitResponse {
  id: number;
  visitCode: string;
  patient: ClinicalPatientIdentity;
  appointmentId: number | null;
  slotId: number;
  roomId: number;
  queueDate: string; // YYYY-MM-DD
  queueNumber: number;
  arrivedAt: string; // ISO Instant
  startedAt: string | null;
  completedAt: string | null;
  status: ReceptionVisitStatus;
  reason: string | null;
  clinicalNotes: string | null;
  diagnosisCode: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  followUpDate: string | null;
  outcomeReason: string | null;
}

export interface PatientVisitSummary {
  id: number;
  visitCode: string;
  appointmentId: number | null;
  slotId: number;
  roomId: number;
  queueDate: string;
  queueNumber: number;
  arrivedAt: string;
  status: ReceptionVisitStatus;
  diagnosis: string | null;
  followUpDate: string | null;
}

export interface PatientPrescriptionItem {
  id: number;
  medicineId: number;
  medicineName?: string;
  quantity: number;
  unit?: string;
  instructions: string;
}

export interface PatientPrescriptionSummary {
  id: number;
  prescriptionCode: string;
  status: string;
  issuedAt: string;
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

export interface UpdateClinicalVisitPayload {
  clinicalNotes?: string | null;
  diagnosisCode?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  followUpDate?: string | null; // YYYY-MM-DD
}

export interface PrescriptionLineItem {
  id: number;
  medicineId: number;
  medicineName?: string;
  baseUnit?: string;
  quantity: number;
  usageInstruction: string;
  unfilledQuantity?: number;
  unfilledReason?: string | null;
  unfilledNote?: string | null;
}

export interface DoctorPrescriptionResponse {
  id: number;
  prescriptionCode: string;
  visitId: number;
  doctorId: number;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  issuedAt: string | null;
  note: string | null;
  dispensingCheckedAt: string | null;
  items: PrescriptionLineItem[];
}

export interface DoctorSlotsQuery {
  date?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  sort?: string;
}

export interface WaitingQuery {
  page?: number;
  size?: number;
  sort?: string;
}

export const doctorWorklistService = {
  /**
   * Lấy danh sách khung ca khám được phân công cho bác sĩ trong ngày
   * GET /api/v1/doctor/slots?date=YYYY-MM-DD
   */
  async getDoctorSlots(params?: DoctorSlotsQuery): Promise<PageResponse<DoctorSlotResponse>> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/doctor/slots${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<DoctorSlotResponse>>(endpoint);
  },

  /**
   * Lấy danh sách bệnh nhân WAITING trong đúng ca khám của bác sĩ
   * GET /api/v1/doctor/slots/{slotId}/waiting
   */
  async getSlotWaitingVisits(slotId: number, params?: WaitingQuery): Promise<PageResponse<DoctorVisitResponse>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/doctor/slots/${slotId}/waiting${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<DoctorVisitResponse>>(endpoint);
  },

  /**
   * Lấy chi tiết lượt khám của bác sĩ (bao gồm ghi chép chuyên môn hiện có)
   * GET /api/v1/doctor/visits/{visitId}
   */
  async getVisit(visitId: number): Promise<DoctorVisitResponse> {
    return api.get<DoctorVisitResponse>(`/api/v1/doctor/visits/${visitId}`);
  },

  /**
   * Bắt đầu ca khám: chuyển WAITING -> IN_PROGRESS
   * POST /api/v1/doctor/visits/{visitId}/start
   */
  async startVisit(visitId: number): Promise<DoctorVisitResponse> {
    return api.post<DoctorVisitResponse>(`/api/v1/doctor/visits/${visitId}/start`);
  },

  /**
   * Xem tóm tắt lịch sử các lần khám trước của bệnh nhân
   * GET /api/v1/doctor/visits/{visitId}/history
   */
  async getPatientHistory(visitId: number, params?: WaitingQuery): Promise<PageResponse<PatientVisitSummary>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/doctor/visits/${visitId}/history${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<PatientVisitSummary>>(endpoint);
  },

  /**
   * Xem chi tiết 1 lần khám quá khứ của bệnh nhân (bệnh án, đơn thuốc cũ)
   * GET /api/v1/doctor/visits/{visitId}/history/{pastVisitId}
   */
  async getPatientHistoryDetail(visitId: number, pastVisitId: number): Promise<PatientVisitDetail> {
    return api.get<PatientVisitDetail>(`/api/v1/doctor/visits/${visitId}/history/${pastVisitId}`);
  },

  /**
   * Đóng ca khám không hoàn thành / bỏ dở
   * POST /api/v1/doctor/visits/{visitId}/not-complete
   */
  async notCompleteVisit(visitId: number, reason: string): Promise<DoctorVisitResponse> {
    return api.post<DoctorVisitResponse>(`/api/v1/doctor/visits/${visitId}/not-complete`, {
      reason: reason.trim(),
    });
  },

  /**
   * Cập nhật ghi chép chuyên môn của lượt khám (triệu chứng, chẩn đoán, phác đồ, ngày hẹn)
   * PUT /api/v1/doctor/visits/{visitId}/clinical
   */
  async updateClinical(visitId: number, data: UpdateClinicalVisitPayload): Promise<DoctorVisitResponse> {
    return api.put<DoctorVisitResponse>(`/api/v1/doctor/visits/${visitId}/clinical`, {
      clinicalNotes: data.clinicalNotes?.trim() || null,
      diagnosisCode: data.diagnosisCode?.trim() || null,
      diagnosis: data.diagnosis?.trim() || null,
      treatmentPlan: data.treatmentPlan?.trim() || null,
      followUpDate: data.followUpDate || null,
    });
  },

  /**
   * Hoàn tất lượt khám bệnh (chuyển sang COMPLETED)
   * POST /api/v1/doctor/visits/{visitId}/complete
   */
  async completeVisit(visitId: number): Promise<DoctorVisitResponse> {
    return api.post<DoctorVisitResponse>(`/api/v1/doctor/visits/${visitId}/complete`);
  },

  /**
   * Lấy danh sách các đơn thuốc đã tạo trong lượt khám hiện tại
   * GET /api/v1/doctor/visits/{visitId}/prescriptions
   */
  async getVisitPrescriptions(visitId: number): Promise<DoctorPrescriptionResponse[]> {
    return api.get<DoctorPrescriptionResponse[]>(`/api/v1/doctor/visits/${visitId}/prescriptions`);
  },
};
