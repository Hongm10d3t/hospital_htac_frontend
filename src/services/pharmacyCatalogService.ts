import { api, type PageResponse } from './api';

export interface MedicineDto {
  id: number;
  code: string;
  name: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  baseUnit: string;
  minimumStock: number;
  leadTimeDays: number;
  active: boolean;
}

export interface MedicineWritePayload {
  code: string;
  name: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  baseUnit: string;
  minimumStock: number;
  leadTimeDays: number;
  active: boolean;
}

export interface SupplierDto {
  id: number;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
}

export interface SupplierWritePayload {
  code: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  active: boolean;
}

export interface MedicineBatchDto {
  id: number;
  medicineId: number;
  medicineCode: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'BLOCKED';
  blockReason: string | null;
}

export interface MedicineBatchWritePayload {
  medicineId: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'BLOCKED';
  blockReason?: string | null;
}

export interface CatalogFilterParams {
  term?: string;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface BatchFilterParams {
  medicineId?: number;
  status?: string;
  term?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export type MedicineItem = MedicineDto;
export type SupplierItem = SupplierDto;
export type MedicineBatchItem = MedicineBatchDto;

export const pharmacyCatalogService = {
  // Aliases for convenience
  getMedicines: async (params?: CatalogFilterParams): Promise<PageResponse<MedicineDto>> =>
    pharmacyCatalogService.listMedicines(params),
  getSuppliers: async (params?: CatalogFilterParams): Promise<PageResponse<SupplierDto>> =>
    pharmacyCatalogService.listSuppliers(params),
  getBatches: async (medicineId?: number): Promise<MedicineBatchDto[]> => {
    const res = await pharmacyCatalogService.listBatches({ medicineId, size: 100 });
    return res.items || [];
  },

  // === 1. THUỐC (MEDICINES) ===
  async listMedicines(params?: CatalogFilterParams): Promise<PageResponse<MedicineDto>> {
    const query = new URLSearchParams();
    if (params?.term) query.set('term', params.term.trim());
    if (params?.active !== undefined) query.set('active', String(params.active));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<PageResponse<MedicineDto>>(`/api/v1/pharmacy/medicines${queryString ? `?${queryString}` : ''}`);
  },

  async getMedicine(id: number): Promise<MedicineDto> {
    return api.get<MedicineDto>(`/api/v1/pharmacy/medicines/${id}`);
  },

  async createMedicine(data: MedicineWritePayload): Promise<MedicineDto> {
    return api.post<MedicineDto>('/api/v1/pharmacy/medicines', data);
  },

  async updateMedicine(id: number, data: MedicineWritePayload): Promise<MedicineDto> {
    return api.put<MedicineDto>(`/api/v1/pharmacy/medicines/${id}`, data);
  },

  // === 2. NHÀ CUNG CẤP (SUPPLIERS) ===
  async listSuppliers(params?: CatalogFilterParams): Promise<PageResponse<SupplierDto>> {
    const query = new URLSearchParams();
    if (params?.term) query.set('term', params.term.trim());
    if (params?.active !== undefined) query.set('active', String(params.active));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<PageResponse<SupplierDto>>(`/api/v1/pharmacy/suppliers${queryString ? `?${queryString}` : ''}`);
  },

  async getSupplier(id: number): Promise<SupplierDto> {
    return api.get<SupplierDto>(`/api/v1/pharmacy/suppliers/${id}`);
  },

  async createSupplier(data: SupplierWritePayload): Promise<SupplierDto> {
    return api.post<SupplierDto>('/api/v1/pharmacy/suppliers', data);
  },

  async updateSupplier(id: number, data: SupplierWritePayload): Promise<SupplierDto> {
    return api.put<SupplierDto>(`/api/v1/pharmacy/suppliers/${id}`, data);
  },

  // === 3. LÔ THUỐC (BATCHES) ===
  async listBatches(params?: BatchFilterParams): Promise<PageResponse<MedicineBatchDto>> {
    const query = new URLSearchParams();
    if (params?.medicineId) query.set('medicineId', String(params.medicineId));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.term) query.set('term', params.term.trim());
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return api.get<PageResponse<MedicineBatchDto>>(`/api/v1/pharmacy/batches${queryString ? `?${queryString}` : ''}`);
  },

  async getBatch(id: number): Promise<MedicineBatchDto> {
    return api.get<MedicineBatchDto>(`/api/v1/pharmacy/batches/${id}`);
  },

  async createBatch(data: MedicineBatchWritePayload): Promise<MedicineBatchDto> {
    return api.post<MedicineBatchDto>('/api/v1/pharmacy/batches', data);
  },

  async updateBatch(id: number, data: MedicineBatchWritePayload): Promise<MedicineBatchDto> {
    return api.put<MedicineBatchDto>(`/api/v1/pharmacy/batches/${id}`, data);
  },
};
