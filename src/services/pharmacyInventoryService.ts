import { api } from './api';

export interface ExpiryAlertResponse {
  batchId: number;
  batchNumber: string;
  expiryDate: string; // "YYYY-MM-DD"
  daysUntilExpiry: number;
  expired: boolean;
  physicalQuantity: number;
}

export interface InventoryPositionResponse {
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  batchStatus: string; // 'ACTIVE' | 'BLOCKED'
  stockLocation: string; // 'MAIN' | 'COUNTER'
  stockBucket: string; // 'AVAILABLE' | 'QUARANTINE'
  physicalQuantity: number;
  dispensableQuantity: number;
}

export interface MedicineInventoryResponse {
  medicineId: number;
  code: string;
  name: string;
  baseUnit: string;
  active: boolean;
  minimumStock: number;
  physicalQuantity: number;
  dispensableQuantity: number;
  belowMinimum: boolean;
  expiryWarningDays: number;
  expiryAlerts: ExpiryAlertResponse[];
  positions: InventoryPositionResponse[];
}

export interface StockMovementResponse {
  documentId: number;
  documentCode: string;
  itemId: number;
  type: string;
  occurredAt: string; // ISO Instant
  stockLocation: string;
  stockBucket: string;
  deltaQuantity: number;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const pharmacyInventoryService = {
  // 1. Danh sách tồn kho tổng hợp theo từng loại thuốc (kèm cảnh báo mức tồn & hạn dùng)
  searchInventory: async (params?: {
    term?: string;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<MedicineInventoryResponse>> => {
    const query = new URLSearchParams();
    if (params?.term) query.set('term', params.term);
    if (params?.active !== undefined) query.set('active', String(params.active));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<PageResponse<MedicineInventoryResponse>>(
      `/api/v1/pharmacy/inventory${queryString ? `?${queryString}` : ''}`
    );
  },

  // 2. Chi tiết vị trí tồn & lô của một loại thuốc
  getMedicineInventory: async (medicineId: number): Promise<MedicineInventoryResponse> => {
    return api.get<MedicineInventoryResponse>(`/api/v1/pharmacy/inventory/medicines/${medicineId}`);
  },

  // 3. Thẻ kho chi tiết một lô thuốc (Lịch sử biến động xuất - nhập - chuyển)
  getBatchMovements: async (
    batchId: number,
    params?: {
      location?: string;
      bucket?: string;
      page?: number;
      size?: number;
      sort?: string;
    }
  ): Promise<PageResponse<StockMovementResponse>> => {
    const query = new URLSearchParams();
    if (params?.location) query.set('location', params.location);
    if (params?.bucket) query.set('bucket', params.bucket);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<PageResponse<StockMovementResponse>>(
      `/api/v1/pharmacy/inventory/batches/${batchId}/movements${queryString ? `?${queryString}` : ''}`
    );
  },
};
