import { api, type PageResponse } from './api';

export type PatientGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface PatientRecord {
  id: number;
  patientCode: string;
  userId: number | null;
  citizenId: string | null;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: PatientGender;
  address: string | null;
}

export interface CreatePatientPayload {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: PatientGender;
  citizenId?: string | null; // 12 chữ số nếu có
  address?: string | null;
}

export interface UpdatePatientPayload {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: PatientGender;
  citizenId?: string | null; // 12 chữ số nếu có
  address?: string | null;
}

export interface PatientSearchByCodeParams {
  patientCode: string;
  page?: number;
  size?: number;
}

export interface PatientSearchByCitizenParams {
  citizenId: string;
  page?: number;
  size?: number;
}

export interface PatientSearchByIdentityParams {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  page?: number;
  size?: number;
}

export interface RegistrationVerificationResponse {
  verificationToken: string;
  expiresAt: string;
}

export const receptionPatientService = {
  /**
   * Tra cứu hồ sơ bệnh nhân theo Mã bệnh nhân
   * Endpoint: GET /api/v1/reception/patients?patientCode=...
   */
  async searchByPatientCode(params: PatientSearchByCodeParams): Promise<PageResponse<PatientRecord>> {
    const query = new URLSearchParams();
    query.set('patientCode', params.patientCode.trim());
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    return api.get<PageResponse<PatientRecord>>(`/api/v1/reception/patients?${query.toString()}`);
  },

  /**
   * Tra cứu hồ sơ bệnh nhân theo Số CCCD / Định danh (12 chữ số)
   * Endpoint: GET /api/v1/reception/patients?citizenId=...
   */
  async searchByCitizenId(params: PatientSearchByCitizenParams): Promise<PageResponse<PatientRecord>> {
    const query = new URLSearchParams();
    query.set('citizenId', params.citizenId.trim());
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    return api.get<PageResponse<PatientRecord>>(`/api/v1/reception/patients?${query.toString()}`);
  },

  /**
   * Tra cứu hồ sơ bệnh nhân theo Họ tên và Ngày sinh
   * Endpoint: GET /api/v1/reception/patients?fullName=...&dateOfBirth=...
   */
  async searchByIdentity(params: PatientSearchByIdentityParams): Promise<PageResponse<PatientRecord>> {
    const query = new URLSearchParams();
    query.set('fullName', params.fullName.trim());
    query.set('dateOfBirth', params.dateOfBirth.trim());
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    return api.get<PageResponse<PatientRecord>>(`/api/v1/reception/patients?${query.toString()}`);
  },

  /**
   * Lấy chi tiết hồ sơ bệnh nhân theo ID
   * Endpoint: GET /api/v1/reception/patients/{id}
   */
  async getPatient(id: number): Promise<PatientRecord> {
    return api.get<PatientRecord>(`/api/v1/reception/patients/${id}`);
  },

  /**
   * Tạo mới hồ sơ bệnh nhân vãng lai (cấp patientCode mới)
   * Endpoint: POST /api/v1/reception/patients
   */
  async createPatient(payload: CreatePatientPayload): Promise<PatientRecord> {
    const body: Record<string, unknown> = {
      fullName: payload.fullName.trim(),
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      address: payload.address?.trim() || null,
    };
    if (payload.citizenId?.trim()) {
      body.citizenId = payload.citizenId.trim();
    }
    return api.post<PatientRecord>('/api/v1/reception/patients', body);
  },

  /**
   * Cập nhật thông tin hành chính hồ sơ bệnh nhân
   * Endpoint: PUT /api/v1/reception/patients/{id}
   */
  async updatePatient(id: number, payload: UpdatePatientPayload): Promise<PatientRecord> {
    const body: Record<string, unknown> = {
      fullName: payload.fullName.trim(),
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      address: payload.address?.trim() || null,
    };
    if (payload.citizenId?.trim()) {
      body.citizenId = payload.citizenId.trim();
    }
    return api.put<PatientRecord>(`/api/v1/reception/patients/${id}`, body);
  },

  /**
   * Cấp mã xác minh liên kết tài khoản cho hồ sơ cũ (thời hạn 15 phút)
   * Endpoint: POST /api/v1/reception/patients/{id}/registration-verification
   */
  async issueVerificationToken(patientId: number, citizenId: string): Promise<RegistrationVerificationResponse> {
    return api.post<RegistrationVerificationResponse>(
      `/api/v1/reception/patients/${patientId}/registration-verification`,
      { citizenId: citizenId.trim() }
    );
  },
};
