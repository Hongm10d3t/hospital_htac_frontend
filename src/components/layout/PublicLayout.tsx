import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import {
  Activity,
  Calendar,
  ChevronDown,
  Clock,
  HeartHandshake,
  KeyRound,
  LogOut,
  MapPin,
  Menu,
  PhoneCall,
  Pill,
  ShieldCheck,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Khung giao diện công khai dành cho Cổng Bệnh nhân (Public/Patient Layout)
 * Giữ nguyên 100% style thiết kế gốc của HTAC (xanh sky, cyan, slate hiện đại).
 * 
 * Sắp xếp lại bố cục Menu theo cấu trúc khoa học (tham khảo bố cục Bạch Mai):
 * - Top bar trên cùng: Gọn gàng, chỉ chứa Hotline, Địa chỉ, Lời chào người dùng & Đăng xuất.
 * - Header chính: Logo HTAC, Menu cơ bản (Trang chủ, Danh bạ bác sĩ, Đặt lịch khám).
 * - Dropdown "Cá nhân ˅": Gom toàn bộ tính năng người bệnh (Hồ sơ, Lịch hẹn, Sổ sức khỏe, Đơn thuốc, Đổi mật khẩu) 
 *   thay vì dàn trải làm chật chội thanh điều hướng.
 */
export const PublicLayout: React.FC = () => {
  const { user, isAuthenticated, logout, hospitalConfig: config } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Trạng thái Dropdown "Cá nhân"
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Trạng thái Mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Tự động đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tự động đóng menu khi chuyển route
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* =========================================================================
          1. THANH TIỆN ÍCH TRÊN CÙNG (TOP BAR GỐC CỦA HTAC - SẮP XẾP LẠI GỌN GÀNG)
         ========================================================================= */}
      <div className="bg-sky-900 text-sky-100 text-xs py-2 px-4 sm:px-8 border-b border-sky-800/60">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          {/* Bên trái: Địa chỉ bệnh viện & Hotline */}
          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5 text-sky-200">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>{config?.address || 'Số 123 Đường Giải Phóng, Quận Đống Đa, Hà Nội'}</span>
            </span>
            <span className="hidden md:inline text-sky-700">|</span>
            <a
              href={`tel:${config?.phone || '1900-8888'}`}
              className="hidden md:flex items-center gap-1.5 font-bold text-cyan-300 hover:text-white transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Hotline: {config?.phone || '1900 8888'}
            </a>
          </div>

          {/* Bên phải: Lời chào người dùng / Đăng nhập / Đăng xuất */}
          <div className="flex items-center gap-3 text-[11px] sm:text-xs">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <span className="text-sky-200">
                  Xin chào, <strong className="text-white font-bold">{user.fullName || user.username}</strong>
                </span>
                <span className="text-sky-700">|</span>
                <button
                  type="button"
                  onClick={() => logout().then(() => navigate('/'))}
                  className="flex items-center gap-1 text-sky-300 hover:text-rose-300 transition-colors font-medium cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="font-bold text-cyan-300 hover:text-white transition-colors"
                >
                  Đăng nhập
                </Link>
                <span className="text-sky-700">|</span>
                <Link
                  to="/register"
                  className="text-sky-200 hover:text-white transition-colors font-medium"
                >
                  Đăng ký tài khoản
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. THANH ĐIỀU HƯỚNG CHÍNH (NAVIGATION HEADER THEO STYLE GỐC HTAC)
             Menu được sắp xếp lại khoa học: Trang chủ, Bác sĩ, Đặt khám & Dropdown "Cá nhân ˅"
         ========================================================================= */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between">
          {/* Logo Bệnh viện HTAC (Style gốc) */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={config?.logoUrl || '/logo.png'}
              alt={config?.name || 'Logo Bệnh viện'}
              className="h-11 w-auto max-w-[140px] object-contain rounded-lg bg-white p-0.5 border border-slate-200/80 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight leading-tight">
                {config?.name || 'HTAC HOSPITAL'}
              </div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Hệ thống Quản lý Bệnh viện Đa khoa
              </div>
            </div>
          </Link>

          {/* Menu Điều hướng Desktop: Sắp xếp gọn gàng theo bố cục Bạch Mai */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors',
                  isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              }
            >
              Trang chủ
            </NavLink>

            <NavLink
              to="/doctors"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                  isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              }
            >
              <Stethoscope className="w-4 h-4 text-sky-500" />
              Danh bạ Bác sĩ
            </NavLink>

            <NavLink
              to="/booking"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                  isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              }
            >
              <Calendar className="w-4 h-4 text-cyan-500" />
              Đặt lịch khám
            </NavLink>

            {/* DROPDOWN "CÁ NHÂN ˅" - GOM TOÀN BỘ CÁC TÍNH NĂNG BỆNH NHÂN */}
            {isAuthenticated && user?.role === 'PATIENT' && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer',
                    isUserMenuOpen || location.pathname.startsWith('/patient')
                      ? 'text-sky-700 bg-sky-50 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Cá nhân</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                      isUserMenuOpen && 'rotate-180 text-sky-600'
                    )}
                  />
                </button>

                {/* Khung Dropdown theo style gốc HTAC (bo góc tròn, đổ bóng mềm, viền slate) */}
                {isUserMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs font-semibold">
                    <Link
                      to="/patient/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      <User className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Thông tin cá nhân</span>
                    </Link>

                    <Link
                      to="/patient/appointments"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Lịch sử đặt lịch khám</span>
                    </Link>

                    <Link
                      to="/patient/history"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      <Activity className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Kết quả khám bệnh</span>
                    </Link>

                    <Link
                      to="/patient/prescriptions"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      <Pill className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Đơn thuốc điện tử</span>
                    </Link>

                    <Link
                      to="/patient/change-password"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors border-t border-slate-100"
                    >
                      <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Thay đổi mật khẩu</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout().then(() => navigate('/'));
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-bold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Menu cho ADMIN nếu có */}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors',
                    isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )
                }
              >
                Trang Quản trị
              </NavLink>
            )}
          </nav>

          {/* Khu vực Nút Hành Động Bên Phải (Style gốc HTAC) */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Calendar className="w-4 h-4" />}
              onClick={() => navigate('/booking')}
              className="hidden sm:inline-flex"
            >
              Đặt lịch khám
            </Button>

            {/* Nút Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Khung Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-1 text-xs font-semibold shadow-lg">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Trang chủ
            </Link>
            <Link
              to="/doctors"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Danh bạ Bác sĩ
            </Link>
            <Link
              to="/booking"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Đặt lịch khám
            </Link>

            {isAuthenticated && user?.role === 'PATIENT' && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase px-3 py-1 font-bold">
                  Khu vực cá nhân:
                </div>
                <Link
                  to="/patient/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-sky-50 text-slate-700"
                >
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Thông tin cá nhân</span>
                </Link>
                <Link
                  to="/patient/appointments"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-sky-50 text-slate-700"
                >
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Lịch sử đặt lịch khám</span>
                </Link>
                <Link
                  to="/patient/history"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-sky-50 text-slate-700"
                >
                  <Activity className="w-4 h-4 text-sky-600" />
                  <span>Kết quả khám bệnh</span>
                </Link>
                <Link
                  to="/patient/prescriptions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-sky-50 text-slate-700"
                >
                  <Pill className="w-4 h-4 text-rose-500" />
                  <span>Đơn thuốc điện tử</span>
                </Link>
                <Link
                  to="/patient/change-password"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-sky-50 text-slate-700"
                >
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Thay đổi mật khẩu</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* =========================================================================
          3. NỘI DUNG CHÍNH (MAIN OUTLET)
         ========================================================================= */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* =========================================================================
          4. CHÂN TRANG Y TẾ TIN CẬY (FOOTER STYLE GỐC HTAC)
         ========================================================================= */}
      <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          {/* Cột 1: Thông tin Viện */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-white text-base">
              <img
                src={config?.logoUrl || '/logo.png'}
                alt={config?.name || 'Logo Bệnh viện'}
                className="h-9 w-auto max-w-[110px] object-contain rounded-md bg-white p-0.5"
              />
              <span>{config?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Cơ sở y tế tiêu chuẩn chất lượng cao, quy tụ đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm và trang thiết bị hiện đại.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4" />
              Giấy phép hoạt động số 2026/BYT-GPHĐ
            </div>
          </div>

          {/* Cột 2: Dịch vụ Nổi bật */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Dịch vụ &amp; Chuyên khoa</h4>
            <ul className="space-y-2 text-slate-400">
              <li>Khám Nội tổng quát &amp; Tim mạch</li>
              <li>Sản phụ khoa &amp; Nhi khoa</li>
              <li>Khoa Mắt &amp; Tai Mũi Họng</li>
              <li>Xét nghiệm &amp; Chẩn đoán hình ảnh</li>
              <li>Quầy Dược &amp; Tư vấn sử dụng thuốc</li>
            </ul>
          </div>

          {/* Cột 3: Liên kết nhanh */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Tra cứu &amp; Đặt hẹn</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link to="/doctors" className="hover:text-white transition-colors">
                  Danh bạ 62 Bác sĩ chuyên môn
                </Link>
              </li>
              <li>
                <Link to="/booking" className="hover:text-white transition-colors">
                  Quy trình đặt lịch trực tuyến
                </Link>
              </li>
              <li>
                <Link to="/patient/appointments" className="hover:text-white transition-colors">
                  Tra cứu lịch hẹn khám cá nhân
                </Link>
              </li>
              <li>
                <Link to="/patient/history" className="hover:text-white transition-colors">
                  Sổ sức khỏe điện tử (EHR)
                </Link>
              </li>
              <li>
                <Link to="/patient/prescriptions" className="hover:text-white transition-colors">
                  Tra cứu Đơn thuốc điện tử
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Đăng ký tài khoản bệnh nhân
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Cổng đăng nhập hệ thống
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Thông tin Liên hệ Cấp bách */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-sm mb-3">Liên hệ &amp; Tiếp nhận</h4>
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>{config?.address || 'Địa chỉ: Tòa nhà Y khoa HTAC, Khu Đô thị Y tế Mới'}</span>
            </p>
            <p className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Hotline Tiếp đón: {config?.phone || '1900-8888'}</span>
            </p>
            <p className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Cấp cứu 24/7: (024) 3888 9999</span>
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 border-t border-slate-800 flex flex-wrap justify-between items-center text-slate-500 text-[11px] gap-2">
          <p>© 2026 HTAC Hospital Information System. Tất cả các quyền được bảo lưu.</p>
          <p>Tuân thủ tiêu chuẩn an toàn bảo mật dữ liệu y tế quốc gia.</p>
        </div>
      </footer>
    </div>
  );
};
