import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Activity,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Settings,
  Stethoscope,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Khung giao diện nghiệp vụ nội bộ (Internal Layout)
 * Dành cho ADMIN, RECEPTIONIST, DOCTOR, PHARMACIST với chế độ OPERATE tối ưu tốc độ và không gian thao tác.
 */
export const InternalLayout: React.FC = () => {
  const { user, role, logout, changePassword, hospitalConfig } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Trạng thái modal đổi mật khẩu
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Danh sách menu phân hệ theo vai trò
  const navItems: NavItem[] = React.useMemo(() => {
    if (role === 'ADMIN') {
      return [
        { to: '/admin/dashboard', label: 'Tổng quan hệ thống', icon: <LayoutDashboard className="w-5 h-5" /> },
        { to: '/admin/hospital-config', label: 'Cấu hình bệnh viện', icon: <Settings className="w-5 h-5" /> },
        { to: '/admin/specialties-rooms', label: 'Chuyên khoa & Phòng', icon: <Activity className="w-5 h-5" /> },
        { to: '/admin/staff-accounts', label: 'Tài khoản nhân viên', icon: <Users className="w-5 h-5" /> },
        { to: '/admin/doctor-profiles', label: '62 Hồ sơ Bác sĩ', icon: <Stethoscope className="w-5 h-5" /> },
        { to: '/admin/clinic-slots', label: 'Phân ca khám theo tuần', icon: <Calendar className="w-5 h-5" /> },
        { to: '/admin/purchase-requests', label: 'Duyệt đề xuất thuốc', icon: <FileText className="w-5 h-5" /> },
      ];
    }

    if (role === 'RECEPTIONIST') {
      return [
        { to: '/reception/checkin', label: 'Tiếp đón & Cấp số', icon: <UserCheck className="w-5 h-5" /> },
        { to: '/reception/appointments', label: 'Lịch hẹn trực tuyến', icon: <Calendar className="w-5 h-5" /> },
        { to: '/reception/patients', label: 'Danh bạ bệnh nhân', icon: <Users className="w-5 h-5" /> },
        { to: '/reception/queue', label: 'Giám sát hàng đợi', icon: <Activity className="w-5 h-5" /> },
      ];
    }

    if (role === 'DOCTOR') {
      return [
        { to: '/doctor/worklist', label: 'Bàn khám & Hàng đợi', icon: <ClipboardList className="w-5 h-5" /> },
        { to: '/doctor/records', label: 'Bệnh án & Chẩn đoán', icon: <FileText className="w-5 h-5" /> },
        { to: '/doctor/medicines', label: 'Tra cứu danh mục thuốc', icon: <Pill className="w-5 h-5" /> },
      ];
    }

    if (role === 'PHARMACIST') {
      return [
        { to: '/pharmacy/dispense', label: 'Cấp phát thuốc', icon: <Pill className="w-5 h-5" /> },
        { to: '/pharmacy/medicines', label: 'Danh mục & Lô thuốc', icon: <ClipboardList className="w-5 h-5" /> },
        { to: '/pharmacy/stock-documents', label: 'Phiếu kho nghiệp vụ', icon: <FileText className="w-5 h-5" /> },
        { to: '/pharmacy/purchase-requests', label: 'Đề xuất mua thuốc', icon: <Settings className="w-5 h-5" /> },
        { to: '/pharmacy/inventory', label: 'Tồn kho & Cảnh báo', icon: <Boxes className="w-5 h-5" /> },
      ];
    }

    return [];
  }, [role]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Đã đăng xuất khỏi hệ thống');
      navigate('/login');
    } catch {
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6 || newPassword.length > 128) {
      setPasswordError('Mật khẩu mới phải dài từ 6 đến 128 ký tự');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      setIsPasswordModalOpen(false);
      navigate('/login');
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Đổi mật khẩu không thành công';
      setPasswordError(errMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* 1. TOP HEADER (Chiều cao 56px - 64px theo DESIGN.md) */}
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Nhận diện thương hiệu & Nút mở menu mobile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <img
              src={hospitalConfig?.logoUrl || '/logo.png'}
              alt={hospitalConfig?.name || 'Logo Bệnh viện'}
              className="h-9 w-auto max-w-[120px] object-contain rounded-lg bg-white p-0.5 border border-slate-200/90 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  {hospitalConfig?.name || 'HTAC Hospital'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Hệ thống trực tuyến
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin người dùng & Hành động nhanh */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/admin/profile"
            className="text-right hidden sm:block hover:opacity-80 transition-opacity"
            title="Xem hồ sơ cá nhân"
          >
            <div className="text-xs font-semibold text-slate-900">{user?.fullName || user?.username}</div>
            <div className="text-[11px] text-slate-500">{user?.phone}</div>
          </Link>

          <Badge status={role === 'ADMIN' ? 'PRIMARY' : 'ACTIVE'} variant="subtle" withDot={false}>
            {role || 'STAFF'}
          </Badge>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <Link
            to="/admin/profile"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Hồ sơ cá nhân & Bảo mật"
          >
            <User className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setPasswordError(null);
              setIsPasswordModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Đổi mật khẩu nhanh"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. KHUNG NỘI DUNG CHÍNH (SIDEBAR + MAIN AREA) */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR MÁY TÍNH (240px có thể thu gọn về 64px) */}
        <aside
          className={cn(
            'hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 select-none shrink-0',
            isCollapsed ? 'w-16' : 'w-60'
          )}
        >
          <div className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150',
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
                    isCollapsed && 'justify-center px-0'
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Nút thu gọn / mở rộng Sidebar */}
          <div className="p-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-full flex items-center justify-center cursor-pointer"
              title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* SIDEBAR MOBILE OVERLAY DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-white h-full shadow-2xl flex flex-col z-10 p-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <img
                    src={hospitalConfig?.logoUrl || '/logo.png'}
                    alt={hospitalConfig?.name || 'Logo'}
                    className="h-7 w-auto object-contain rounded"
                  />
                  <span className="font-bold text-slate-900 text-sm">
                    {hospitalConfig?.name || 'HTAC Hospital'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold',
                        isActive
                          ? 'bg-sky-50 text-sky-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KHU VỰC NỘI DUNG CHÍNH (MAIN AREA) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU NHANH */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi mật khẩu tài khoản"
        description="Mật khẩu mới yêu cầu từ 6 đến 128 ký tự và khác mật khẩu hiện tại."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {passwordError}
            </div>
          )}

          <Input
            type="password"
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Nhập mật khẩu đang dùng"
          />

          <Input
            type="password"
            label="Mật khẩu mới"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Nhập mật khẩu mới"
          />

          <Input
            type="password"
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Nhập lại mật khẩu mới"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={passwordLoading}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={passwordLoading}>
              Xác nhận đổi mật khẩu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
