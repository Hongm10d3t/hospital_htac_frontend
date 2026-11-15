import { api } from './api';

export interface DispensingLineResponse {
  prescriptionItemId: number;
  medicineId: number;
  medicineName: string;
  baseUnit: string;
  prescribedQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  unfilledQuantity: number;
  unfilledReason: string | null;
  unfilledNote: string | null;
}

export interface DispensingSnapshotResponse {
  prescriptionId: number;
  dispensingCheckedAt: string | null;
  reviewed: boolean;
  items: DispensingLineResponse[];
}

export interface DispenseLineRequest {
  prescriptionItemId: number;
  batchId: number;
  quantity: number;
}

export interface DispenseStockRequest {
  prescriptionId: number;
  occurredAt: string; // ISO string
  items: DispenseLineRequest[];
}

export interface UnfilledLineRequest {
  prescriptionItemId: number;
  unfilledQuantity: number;
  reason: string;
  note?: string;
}

export interface ReviewUnfilledRequest {
  items: UnfilledLineRequest[];
}

export interface PatientReturnLineRequest {
  sourceItemId: number;
  prescriptionItemId: number;
  batchId: number;
  quantity: number;
  condition: string;
  note?: string;
}

export interface PatientReturnRequest {
  prescriptionId: number;
  occurredAt: string;
  reason: string;
  items: PatientReturnLineRequest[];
}

export interface StockDocumentItemResponse {
  id: number;
  batchId: number;
  quantity: number;
  unitCost: number | null;
  prescriptionItemId: number | null;
  sourceItemId: number | null;
  bookQuantity: number | null;
  countedQuantity: number | null;
  note: string | null;
}

export interface StockDocumentResponse {
  id: number;
  documentCode: string;
  type: string;
  occurredAt: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  stockLocation: string;
  stockBucket: string;
  destinationLocation: string | null;
  destinationBucket: string | null;
  supplierId: number | null;
  prescriptionId: number | null;
  purchaseRequestId: number | null;
  postedAt: string | null;
  postedBy: number | null;
  note: string | null;
  items: StockDocumentItemResponse[];
}

export interface PrescriptionDetailResponse {
  id: number;
  visitId: number;
  prescriptionCode: string;
  status: string;
  note: string | null;
  doctorName?: string;
  patientName?: string;
  createdAt: string;
  items: Array<{
    id: number;
    medicineId: number;
    medicineName: string;
    quantity: number;
    usageInstructions?: string;
  }>;
}

export interface DispenseReportLine {
  documentId: number;
  documentCode: string;
  itemId: number;
  batchId: number;
  batchNumber?: string;
  occurredAt: string;
  quantity: number;
}

export const pharmacyDispenseService = {
  // 1. Lấy snapshot cấp phát của đơn thuốc
  getDispensingSnapshot: async (prescriptionId: number): Promise<DispensingSnapshotResponse> => {
    return api.get<DispensingSnapshotResponse>(`/api/v1/pharmacy/prescriptions/${prescriptionId}/dispensing`);
  },

  // 2. Ghi nhận thuốc chưa nhận (Unfilled Review)
  reviewUnfilled: async (prescriptionId: number, body: ReviewUnfilledRequest): Promise<DispensingSnapshotResponse> => {
    return api.post<DispensingSnapshotResponse>(
      `/api/v1/pharmacy/prescriptions/${prescriptionId}/dispensing-review`,
      body
    );
  },

  // 3. Tạo phiếu cấp phát nháp (DISPENSE - DRAFT)
  createDispensation: async (body: DispenseStockRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/dispensations', body);
  },

  // 4. Ghi sổ phiếu xuất kho cấp phát
  postStockDocument: async (documentId: number): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>(`/api/v1/pharmacy/stock-documents/${documentId}/post`);
  },

  // 5. Bệnh nhân trả lại thuốc (Patient Return)
  createPatientReturn: async (body: PatientReturnRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/patient-returns', body);
  },

  // 6. Lấy thông tin chi tiết đơn thuốc (để hiển thị thông tin bệnh nhân & bác sĩ kê)
  getPrescriptionDetail: async (prescriptionId: number): Promise<PrescriptionDetailResponse> => {
    try {
      return await api.get<PrescriptionDetailResponse>(`/api/v1/doctor/prescriptions/${prescriptionId}`);
    } catch {
      // Fallback sang endpoint reporting nếu role PHARMACIST bị chặn với doctor API
      const reportRes = await api.get<{
        id: number;
        prescriptionCode: string;
        issuedAt: string;
        reviewed: boolean;
        items: Array<{ id: number; medicineId: number; prescribedQuantity: number }>;
      }>(`/api/v1/reports/prescriptions/${prescriptionId}`);
      return {
        id: reportRes.id,
        visitId: 0,
        prescriptionCode: reportRes.prescriptionCode,
        status: 'ISSUED',
        note: null,
        createdAt: reportRes.issuedAt,
        items: reportRes.items.map((i) => ({
          id: i.id,
          medicineId: i.medicineId,
          medicineName: '',
          quantity: i.prescribedQuantity,
        })),
      };
    }
  },

  // 7. Lấy lịch sử dòng cấp phát của đơn
  getDispenseLinesHistory: async (prescriptionId: number): Promise<DispenseReportLine[]> => {
    try {
      const res = await api.get<{ items: DispenseReportLine[] }>(
        `/api/v1/reports/prescriptions/${prescriptionId}/dispense-lines`
      );
      return res.items || [];
    } catch {
      return [];
    }
  },
};
