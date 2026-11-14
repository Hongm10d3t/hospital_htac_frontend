import { api } from './api';

export type PatientGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface RegisterPatientRequest {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  citizenId: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: PatientGender;
  address?: string;
  verificationToken?: string;
}

export interface PatientRegistrationResponse {
  accountId: number;
  patientId: number;
  status: string; // "ACTIVE"
}

export interface PatientProfileResponse {
  id: number;
  patientCode: string;
  userId: number;
  citizenId: string;
  fullName: string;
  dateOfBirth: string;
  gender: PatientGender;
  address: string | null;
}

export const patientAuthService = {
  /**
   * Đăng ký tài khoản bệnh nhân mới và tự động gắn hồ sơ y tế
   * POST /api/v1/public/auth/register
   */
  async register(data: RegisterPatientRequest): Promise<PatientRegistrationResponse> {
    return api.post<PatientRegistrationResponse>('/api/v1/public/auth/register', data);
  },

  /**
   * Lấy thông tin hồ sơ bệnh nhân của tài khoản hiện tại
   * GET /api/v1/patients/me
   */
  async getMyPatientProfile(): Promise<PatientProfileResponse> {
    return api.get<PatientProfileResponse>('/api/v1/patients/me');
  },
};
