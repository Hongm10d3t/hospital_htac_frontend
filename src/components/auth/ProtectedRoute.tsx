import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { type UserRole } from '../../services/authService';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Định tuyến bảo vệ theo phiên và vai trò (Role-based Protected Route)
 * Tự động chặn truy cập trái phép, chuyển hướng đăng nhập hoặc hiển thị cảnh báo 403
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  // Đang kiểm tra phiên với Backend qua /api/v1/auth/me
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-sm font-medium">Đang kiểm tra quyền truy cập hệ thống...</span>
      </div>
    );
  }

  // Chưa đăng nhập -> Chuyển hướng đến màn hình Đăng nhập kèm lưu lại trang muốn đến
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Đã đăng nhập nhưng không có vai trò hợp lệ được chỉ định
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Truy cập bị từ chối (403 Forbidden)</h1>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          Tài khoản của bạn mang vai trò <span className="font-semibold text-sky-600">[{role}]</span>, 
          không có thẩm quyền truy cập phân hệ nghiệp vụ này. Vui lòng liên hệ Quản trị viên nếu đây là sự nhầm lẫn.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            Quay lại trang trước
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (role === 'ADMIN') window.location.href = '/admin/dashboard';
              else if (role === 'DOCTOR') window.location.href = '/doctor/worklist';
              else if (role === 'RECEPTIONIST') window.location.href = '/reception/checkin';
              else if (role === 'PHARMACIST') window.location.href = '/pharmacy/dispense';
              else window.location.href = '/';
            }}
          >
            Về bàn làm việc chính
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
