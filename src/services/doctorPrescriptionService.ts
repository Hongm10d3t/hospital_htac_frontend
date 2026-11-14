import { api, type PageResponse } from './api';
import type {
  DoctorPrescriptionResponse,
} from './doctorWorklistService';

export interface MedicineSelectionResponse {
  id: number;
  code: string;
  name: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  baseUnit: string;
}

export interface PrescriptionLineRequest {
  medicineId: number;
  quantity: number;
  usageInstruction: string;
}

export interface CreatePrescriptionRequest {
  note?: string | null;
  items: PrescriptionLineRequest[];
}

export interface UpdatePrescriptionRequest {
  note?: string | null;
  items: PrescriptionLineRequest[];
}

export interface DoctorMedicineFilterParams {
  term?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const doctorPrescriptionService = {
  /**
   * Tra cứu danh mục thuốc dùng để kê đơn
   * GET /api/v1/doctor/medicines?term=...
   */
  async searchMedicines(params?: DoctorMedicineFilterParams): Promise<PageResponse<MedicineSelectionResponse>> {
    const query = new URLSearchParams();
    if (params?.term) query.set('term', params.term.trim());
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/doctor/medicines${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<MedicineSelectionResponse>>(endpoint);
  },

  /**
   * Tạo đơn thuốc mới cho lượt khám (ở trạng thái DRAFT)
   * POST /api/v1/doctor/visits/{visitId}/prescriptions
   */
  async createPrescription(visitId: number, data: CreatePrescriptionRequest): Promise<DoctorPrescriptionResponse> {
    return api.post<DoctorPrescriptionResponse>(`/api/v1/doctor/visits/${visitId}/prescriptions`, {
      note: data.note?.trim() || null,
      items: data.items,
    });
  },

  /**
   * Xem danh sách các đơn thuốc thuộc lượt khám
   * GET /api/v1/doctor/visits/{visitId}/prescriptions
   */
  async getVisitPrescriptions(visitId: number): Promise<DoctorPrescriptionResponse[]> {
    return api.get<DoctorPrescriptionResponse[]>(`/api/v1/doctor/visits/${visitId}/prescriptions`);
  },

  /**
   * Xem chi tiết 1 đơn thuốc
   * GET /api/v1/doctor/prescriptions/{prescriptionId}
   */
  async getPrescription(prescriptionId: number): Promise<DoctorPrescriptionResponse> {
    return api.get<DoctorPrescriptionResponse>(`/api/v1/doctor/prescriptions/${prescriptionId}`);
  },

  /**
   * Phát hành đơn thuốc (DRAFT -> ISSUED) để chuyển sang Quầy Dược
   * POST /api/v1/doctor/prescriptions/{prescriptionId}/issue
   */
  async issuePrescription(prescriptionId: number): Promise<DoctorPrescriptionResponse> {
    return api.post<DoctorPrescriptionResponse>(`/api/v1/doctor/prescriptions/${prescriptionId}/issue`);
  },

  /**
   * Cập nhật nội dung đơn thuốc nháp (chỉ khi đơn ở trạng thái DRAFT)
   * PUT /api/v1/doctor/prescriptions/{prescriptionId}
   */
  async updatePrescription(
    prescriptionId: number,
    data: UpdatePrescriptionRequest
  ): Promise<DoctorPrescriptionResponse> {
    return api.put<DoctorPrescriptionResponse>(`/api/v1/doctor/prescriptions/${prescriptionId}`, {
      note: data.note?.trim() || null,
      items: data.items,
    });
  },

  /**
   * Hủy đơn thuốc kèm lý do (DRAFT hoặc ISSUED nếu chưa cấp phát)
   * POST /api/v1/doctor/prescriptions/{prescriptionId}/cancel
   */
  async cancelPrescription(prescriptionId: number, reason: string): Promise<DoctorPrescriptionResponse> {
    return api.post<DoctorPrescriptionResponse>(`/api/v1/doctor/prescriptions/${prescriptionId}/cancel`, {
      reason: reason.trim(),
    });
  },
};
