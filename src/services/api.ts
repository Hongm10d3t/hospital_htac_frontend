/**
 * API Client kết nối Backend Spring Boot HTAC
 * Xử lý tự động: Session Cookie, CSRF Token và định dạng lỗi chuẩn hóa.
 */

export interface ApiErrorResponse {
  code: string;
  message: string;
  timestamp?: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public fieldErrors?: Record<string, string>;
  public raw?: ApiErrorResponse;

  constructor(status: number, errorData: ApiErrorResponse) {
    super(errorData.message || `Lỗi HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = errorData.code || 'UNKNOWN_ERROR';
    this.fieldErrors = errorData.fieldErrors;
    this.raw = errorData;
  }
}

export interface CsrfResponse {
  headerName: string;
  token: string;
}

export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PHARMACIST' | 'PATIENT';

export interface AccountResponse {
  id: number;
  username: string;
  fullName: string;
  phone: string;
  role: UserRole;
  active?: boolean;
}


export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

class ApiService {
  private csrfToken: string | null = null;
  private csrfHeaderName: string = 'X-CSRF-TOKEN';
  private csrfPromise: Promise<string | null> | null = null;

  /**
   * Lấy CSRF token từ backend (/api/v1/public/csrf)
   */
  public async getCsrfToken(forceRefresh = false): Promise<string | null> {
    if (this.csrfToken && !forceRefresh) {
      return this.csrfToken;
    }

    if (this.csrfPromise && !forceRefresh) {
      return this.csrfPromise;
    }

    this.csrfPromise = (async () => {
      try {
        const response = await fetch('/api/v1/public/csrf', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('[API] Không thể lấy CSRF token, HTTP:', response.status);
          return null;
        }

        const data: CsrfResponse = await response.json();
        this.csrfHeaderName = data.headerName || 'X-CSRF-TOKEN';
        this.csrfToken = data.token;
        return this.csrfToken;
      } catch (err) {
        console.warn('[API] Lỗi kết nối khi lấy CSRF token:', err);
        return null;
      } finally {
        this.csrfPromise = null;
      }
    })();

    return this.csrfPromise;
  }

  /**
   * Làm mới CSRF token (bắt buộc gọi lại sau khi login hoặc logout)
   */
  public async refreshCsrfToken(): Promise<string | null> {
    this.csrfToken = null;
    return this.getCsrfToken(true);
  }

  /**
   * Gọi API tổng quát với đầy đủ headers, credentials và CSRF
   */
  public async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});

    // Đảm bảo nhận JSON
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    // Tự động set Content-Type nếu có body và không phải FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Với các phương thức thay đổi dữ liệu, bắt buộc gửi kèm CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const token = await this.getCsrfToken();
      if (token) {
        headers.set(this.csrfHeaderName, token);
      }
    }

    const config: RequestInit = {
      ...options,
      method,
      headers,
      credentials: 'same-origin', // Luôn gửi kèm cookie JSESSIONID
    };

    // Tự động chuẩn hóa tiền tố /api/v1 nếu endpoint gọi trực tiếp mô-đun
    let normalizedEndpoint = endpoint;
    if (normalizedEndpoint.startsWith('/') && !normalizedEndpoint.startsWith('/api/')) {
      normalizedEndpoint = `/api/v1${normalizedEndpoint}`;
    }

    const response = await fetch(normalizedEndpoint, config);

    // Xử lý status 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    // Đọc body trả về
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorData: ApiErrorResponse = await response.json();
        throw new ApiError(response.status, errorData);
      }
      const text = await response.text();
      throw new ApiError(response.status, {
        code: `HTTP_${response.status}`,
        message: text || `Lỗi yêu cầu với mã HTTP ${response.status}`,
      });
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    if (contentType.includes('text/html')) {
      throw new ApiError(502, {
        code: 'INVALID_API_RESPONSE',
        message: `Endpoint ${normalizedEndpoint} trả về HTML thay vì dữ liệu JSON hợp lệ.`,
      });
    }

    return (await response.text()) as T;
  }

  public get<T>(endpoint: string, options?: Omit<RequestInit, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public put<T>(endpoint: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public patch<T>(endpoint: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: Omit<RequestInit, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();
