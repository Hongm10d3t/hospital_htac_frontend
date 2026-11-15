import { api } from './api';

export interface InboundStockLineRequest {
  batchId: number;
  quantity: number;
  unitCost?: number;
  note?: string;
}

export interface OpeningStockRequest {
  occurredAt: string;
  stockLocation: string; // 'MAIN' | 'COUNTER'
  stockBucket: string; // 'AVAILABLE' | 'QUARANTINE'
  note?: string;
  items: InboundStockLineRequest[];
}

export interface ReceiptStockRequest {
  occurredAt: string;
  stockLocation: string;
  stockBucket: string;
  supplierId: number;
  purchaseRequestId?: number | null;
  note?: string;
  items: InboundStockLineRequest[];
}

export interface TransferStockRequest {
  occurredAt: string;
  stockLocation: string;
  stockBucket: string;
  destinationLocation: string;
  destinationBucket: string;
  note?: string;
  releaseConfirmed: boolean;
  items: InboundStockLineRequest[];
}

export interface StockExitLineRequest {
  batchId: number;
  quantity: number;
  note?: string;
}

export interface StockExitRequest {
  occurredAt: string;
  stockLocation: string;
  stockBucket: string;
  supplierId?: number | null;
  reason: string;
  items: StockExitLineRequest[];
}

export interface AdjustmentLineRequest {
  batchId: number;
  bookQuantity: number;
  countedQuantity: number;
  note?: string;
}

export interface AdjustmentRequest {
  occurredAt: string;
  stockLocation: string;
  stockBucket: string;
  reason: string;
  items: AdjustmentLineRequest[];
}

export interface CancelStockDocumentRequest {
  reason: string;
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
  type: 'OPENING' | 'RECEIPT' | 'TRANSFER' | 'DISPENSE' | 'PATIENT_RETURN' | 'SUPPLIER_RETURN' | 'DISPOSAL' | 'ADJUSTMENT';
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

export interface StockMovementReportLine {
  documentId: number;
  documentCode: string;
  itemId: number;
  batchId: number;
  type: string;
  occurredAt: string;
  stockLocation: string;
  stockBucket: string;
  quantity: number;
}

export interface StockMovementReportPage {
  items: StockMovementReportLine[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const pharmacyStockDocumentService = {
  // 1. Chi tiết phiếu kho
  get: async (id: number): Promise<StockDocumentResponse> => {
    return api.get<StockDocumentResponse>(`/api/v1/pharmacy/stock-documents/${id}`);
  },

  // 2. Tạo phiếu tồn đầu kỳ (OPENING)
  createOpening: async (body: OpeningStockRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/openings', body);
  },

  // 3. Tạo phiếu nhập kho mua hàng (RECEIPT)
  createReceipt: async (body: ReceiptStockRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/receipts', body);
  },

  // 4. Tạo phiếu chuyển kho nội bộ (TRANSFER)
  createTransfer: async (body: TransferStockRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/transfers', body);
  },

  // 5. Tạo phiếu xuất hủy (DISPOSAL)
  createDisposal: async (body: StockExitRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/disposals', body);
  },

  // 6. Tạo phiếu xuất trả nhà cung cấp (SUPPLIER_RETURN)
  createSupplierReturn: async (body: StockExitRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/supplier-returns', body);
  },

  // 7. Tạo phiếu kiểm kê điều chỉnh (ADJUSTMENT)
  createAdjustment: async (body: AdjustmentRequest): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>('/api/v1/pharmacy/stock-documents/adjustments', body);
  },

  // 8. Ghi sổ phiếu kho (POST)
  post: async (id: number): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>(`/api/v1/pharmacy/stock-documents/${id}/post`);
  },

  // 9. Hủy phiếu kho nháp (CANCEL)
  cancel: async (id: number, reason: string): Promise<StockDocumentResponse> => {
    return api.post<StockDocumentResponse>(`/api/v1/pharmacy/stock-documents/${id}/cancel`, { reason });
  },

  // 10. Tra cứu biến động / lịch sử dòng phiếu kho từ báo cáo
  searchMovementLines: async (params?: {
    from?: string;
    to?: string;
    medicineId?: number;
    batchId?: number;
    location?: string;
    bucket?: string;
    type?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<StockMovementReportPage> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.medicineId) query.set('medicineId', String(params.medicineId));
    if (params?.batchId) query.set('batchId', String(params.batchId));
    if (params?.location) query.set('location', params.location);
    if (params?.bucket) query.set('bucket', params.bucket);
    if (params?.type) query.set('type', params.type);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<StockMovementReportPage>(`/api/v1/reports/stock-movement-lines${queryString ? `?${queryString}` : ''}`);
  },
};
