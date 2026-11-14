import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  authService,
  type LoginRequest,
  type UpdateProfileRequest,
  type ChangePasswordRequest,
  type UserRole,
} from '../services/authService';
import { type AccountResponse, ApiError } from '../services/api';

export interface AuthContextType {
  user: AccountResponse | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<AccountResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AccountResponse | null>;
  updateProfile: (data: UpdateProfileRequest) => Promise<AccountResponse>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AccountResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Tải và làm mới thông tin tài khoản hiện tại từ session cookie
   */
  const refreshUser = useCallback(async (): Promise<AccountResponse | null> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch (err) {
      // 401 UNAUTHENTICATED là trạng thái bình thường khi người dùng chưa đăng nhập
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        console.warn('[AuthContext] Không thể lấy phiên người dùng:', err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Khởi tạo: kiểm tra phiên đăng nhập tự động khi tải trang
   */
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /**
   * Đăng nhập tài khoản
   */
  const login = useCallback(
    async (credentials: LoginRequest): Promise<AccountResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const loggedInUser = await authService.login(credentials);
        setUser(loggedInUser);
        return loggedInUser;
      } catch (err) {
        let message = 'Đăng nhập không thành công';
        if (err instanceof ApiError) {
          message = err.message || `Lỗi xác thực: [${err.code}]`;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Đăng xuất và dọn dẹp trạng thái
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.warn('[AuthContext] Lỗi khi gọi đăng xuất:', err);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Cập nhật thông tin tài khoản
   */
  const updateProfile = useCallback(
    async (data: UpdateProfileRequest): Promise<AccountResponse> => {
      const updated = await authService.updateProfile(data);
      setUser(updated);
      return updated;
    },
    []
  );

  /**
   * Đổi mật khẩu
   */
  const changePassword = useCallback(
    async (data: ChangePasswordRequest): Promise<void> => {
      await authService.changePassword(data);
      // Backend hủy phiên khi đổi mật khẩu thành công -> xóa thông tin người dùng
      setUser(null);
    },
    []
  );

  /**
   * Kiểm tra quyền hạn vai trò
   */
  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const roleList = Array.isArray(roles) ? roles : [roles];
      return roleList.includes(user.role);
    },
    [user]
  );

  const contextValue = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
      hasRole,
    }),
    [user, isLoading, error, login, logout, refreshUser, updateProfile, changePassword, hasRole]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

/**
 * Hook truy xuất trạng thái xác thực và phân quyền người dùng
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
