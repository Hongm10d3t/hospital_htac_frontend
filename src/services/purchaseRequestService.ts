import { api, type PageResponse } from './api';

export type PurchaseRequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface PurchaseRequestLineResponse {
  id: number;
  medicineId: number;
  quantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  note: string | null;
}

export interface PurchaseRequestResponse {
  id: number;
  requestCode: string;
  supplierId: number | null;
  status: PurchaseRequestStatus;
  createdBy: number;
  createdAt: string; // ISO Instant
  reviewedBy: number | null;
  reviewedAt: string | null; // ISO Instant
  reviewNote: string | null;
  orderedAt: string | null; // ISO Instant
  expectedDeliveryDate: string | null; // "YYYY-MM-DD"
  closedAt: string | null; // ISO Instant
  closeNote: string | null;
  note: string | null; // Căn cứ / ghi chú lập đề xuất
  items: PurchaseRequestLineResponse[];
}

export interface PurchaseRequestLineWrite {
  medicineId: number;
  quantity: number;
  note?: string;
}

export interface PurchaseRequestWrite {
  supplierId: number;
  note?: string;
  items: PurchaseRequestLineWrite[];
}

export interface PurchaseOrderRequest {
  orderedAt: string; // ISO OffsetDateTime
  expectedDeliveryDate: string; // "YYYY-MM-DD"
}

export interface PurchaseDecisionRequest {
  reason?: string;
}

export interface PurchaseRequestFilterParams {
  status?: string;
  supplierId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Service Quản lý & Phê duyệt Đề xuất Nhập thuốc (F01.07 & F05.04 - M07 Procurement)
 */
export const purchaseRequestService = {
  /**
   * Danh sách đề xuất nhập thuốc (phân trang, lọc theo trạng thái và nhà cung cấp)
   */
  async listRequests(params?: PurchaseRequestFilterParams): Promise<PageResponse<PurchaseRequestResponse>> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.supplierId) query.set('supplierId', String(params.supplierId));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/procurement/purchase-requests${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<PurchaseRequestResponse>>(endpoint);
  },

  /**
   * Xem chi tiết một đề xuất nhập thuốc theo ID
   */
  async getRequest(id: number): Promise<PurchaseRequestResponse> {
    return api.get<PurchaseRequestResponse>(`/api/v1/procurement/purchase-requests/${id}`);
  },

  /**
   * Tạo mới đề xuất mua thuốc (chuyển sang trạng thái DRAFT)
   */
  async createRequest(body: PurchaseRequestWrite): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>('/api/v1/procurement/purchase-requests', body);
  },

  /**
   * Sửa đề xuất mua thuốc khi còn là DRAFT
   */
  async updateRequest(id: number, body: PurchaseRequestWrite): Promise<PurchaseRequestResponse> {
    return api.put<PurchaseRequestResponse>(`/api/v1/procurement/purchase-requests/${id}`, body);
  },

  /**
   * Gửi đề xuất mua thuốc lên Ban Giám đốc duyệt (DRAFT -> PENDING)
   */
  async submitRequest(id: number): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>(`/api/v1/procurement/purchase-requests/${id}/submit`);
  },

  /**
   * Hủy đề xuất mua thuốc (DRAFT/PENDING -> CANCELLED)
   */
  async cancelRequest(id: number): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>(`/api/v1/procurement/purchase-requests/${id}/cancel`);
  },

  /**
   * Đặt hàng nhà cung cấp (sau khi được duyệt APPROVED)
   */
  async orderRequest(id: number, body: PurchaseOrderRequest): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>(`/api/v1/procurement/purchase-requests/${id}/order`, body);
  },

  /**
   * Đóng đề xuất mua thuốc (sau khi đã nhận đủ hàng)
   */
  async closeRequest(id: number, reason?: string): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>(
      `/api/v1/procurement/purchase-requests/${id}/close`,
      reason ? { reason: reason.trim() } : {}
    );
  },

  /**
   * Phê duyệt đề xuất nhập thuốc (chỉ dành cho ADMIN, chuyển PENDING -> APPROVED)
   */
  async approveRequest(id: number, reason?: string): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>(
      `/api/v1/procurement/purchase-requests/${id}/approve`,
      reason ? { reason: reason.trim() } : {}
    );
  },

  /**
   * Từ chối đề xuất nhập thuốc (chỉ dành cho ADMIN, chuyển PENDING -> REJECTED, bắt buộc có lý do)
   */
  async rejectRequest(id: number, reason: string): Promise<PurchaseRequestResponse> {
    return api.post<PurchaseRequestResponse>(
      `/api/v1/procurement/purchase-requests/${id}/reject`,
      { reason: reason.trim() }
    );
  },
};
