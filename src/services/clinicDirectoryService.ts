import { api, type PageResponse } from './api';

export interface SpecialtyResponse {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface CreateSpecialtyRequest {
  code: string;
  name: string;
}

export interface UpdateSpecialtyRequest {
  code: string;
  name: string;
}

export interface ClinicRoomResponse {
  id: number;
  specialtyId: number;
  code: string;
  name: string;
  location: string | null;
  active: boolean;
}

export interface CreateClinicRoomRequest {
  specialtyId: number;
  code: string;
  name: string;
  location?: string | null;
}

export interface UpdateClinicRoomRequest {
  specialtyId: number;
  code: string;
  name: string;
  location?: string | null;
}

/**
 * Service quản lý Danh mục Chuyên khoa & Phòng khám (F01.03)
 * Kết nối các API:
 * - /api/v1/admin/specialties
 * - /api/v1/admin/clinic-rooms
 */
export const clinicDirectoryService = {
  // === 1. CHUYÊN KHOA (SPECIALTIES) ===

  async listSpecialties(params?: {
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<SpecialtyResponse>> {
    const query = new URLSearchParams();
    if (params?.active !== undefined) query.set('active', String(params.active));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/admin/specialties${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<SpecialtyResponse>>(endpoint);
  },

  async getSpecialty(id: number): Promise<SpecialtyResponse> {
    return api.get<SpecialtyResponse>(`/api/v1/admin/specialties/${id}`);
  },

  async createSpecialty(data: CreateSpecialtyRequest): Promise<SpecialtyResponse> {
    return api.post<SpecialtyResponse>('/api/v1/admin/specialties', {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
    });
  },

  async updateSpecialty(id: number, data: UpdateSpecialtyRequest): Promise<SpecialtyResponse> {
    return api.put<SpecialtyResponse>(`/api/v1/admin/specialties/${id}`, {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
    });
  },

  async activateSpecialty(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/specialties/${id}/activate`);
  },

  async deactivateSpecialty(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/specialties/${id}/deactivate`);
  },

  // === 2. PHÒNG KHÁM (CLINIC ROOMS) ===

  async listClinicRooms(params?: {
    specialtyId?: number;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PageResponse<ClinicRoomResponse>> {
    const query = new URLSearchParams();
    if (params?.specialtyId) query.set('specialtyId', String(params.specialtyId));
    if (params?.active !== undefined) query.set('active', String(params.active));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const endpoint = `/api/v1/admin/clinic-rooms${queryString ? `?${queryString}` : ''}`;
    return api.get<PageResponse<ClinicRoomResponse>>(endpoint);
  },

  async getClinicRoom(id: number): Promise<ClinicRoomResponse> {
    return api.get<ClinicRoomResponse>(`/api/v1/admin/clinic-rooms/${id}`);
  },

  async createClinicRoom(data: CreateClinicRoomRequest): Promise<ClinicRoomResponse> {
    return api.post<ClinicRoomResponse>('/api/v1/admin/clinic-rooms', {
      specialtyId: Number(data.specialtyId),
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      location: data.location?.trim() || null,
    });
  },

  async updateClinicRoom(id: number, data: UpdateClinicRoomRequest): Promise<ClinicRoomResponse> {
    return api.put<ClinicRoomResponse>(`/api/v1/admin/clinic-rooms/${id}`, {
      specialtyId: Number(data.specialtyId),
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      location: data.location?.trim() || null,
    });
  },

  async activateClinicRoom(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/clinic-rooms/${id}/activate`);
  },

  async deactivateClinicRoom(id: number): Promise<void> {
    return api.post<void>(`/api/v1/admin/clinic-rooms/${id}/deactivate`);
  },
};
