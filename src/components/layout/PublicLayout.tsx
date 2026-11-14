import React from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import {
  Activity,
  Calendar,
  Clock,
  HeartHandshake,
  LogOut,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Khung giao diện công khai dành cho Cổng Bệnh nhân (Public/Patient Layout)
 * Chế độ PERSUADE & SERVICE: Thân thiện, tạo cảm giác an tâm y tế, tối ưu trải nghiệm di động.
 */
export const PublicLayout: React.FC = () => {
  const { user, isAuthenticated, logout, hospitalConfig: config } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* 1. THANH THÔNG TIN KHẨN CẤP TRÊN CÙNG (TOP BAR) */}
      <div className="bg-sky-900 text-sky-100 text-xs py-2 px-4 sm:px-8 border-b border-sky-800/60">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5 text-sky-200">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Khám bệnh: Thứ 2 - Thứ 7 (07:30 - 17:00) | Cấp cứu: 24/7
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-sky-200">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {config?.address || 'Khu Y tế Chất lượng cao HTAC'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <a
              href={`tel:${config?.phone || '1900-8888'}`}
              className="flex items-center gap-1.5 font-bold text-cyan-300 hover:text-white transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Hotline Cấp cứu: {config?.phone || '1900-8888'}
            </a>
          </div>
        </div>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG CHÍNH (NAVIGATION) */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between">
          {/* Logo Bệnh viện */}
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

          {/* Menu Điều hướng */}
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
            {isAuthenticated && user?.role === 'PATIENT' && (
              <>
                <NavLink
                  to="/patient/appointments"
                  className={({ isActive }) =>
                    cn(
                      'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                      isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Lịch hẹn của tôi
                </NavLink>
                <NavLink
                  to="/patient/history"
                  className={({ isActive }) =>
                    cn(
                      'px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                      isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <Activity className="w-4 h-4 text-sky-500" />
                  Sổ sức khỏe
                </NavLink>
              </>
            )}
          </nav>

          {/* Khu vực Hành động Người dùng */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={user.role === 'ADMIN' ? '/admin/dashboard' : '/patient/appointments'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 text-xs font-semibold hover:bg-sky-100 transition-colors"
                  title="Xem lịch hẹn cá nhân"
                >
                  <User className="w-4 h-4 text-sky-600" />
                  <span>{user.fullName || user.username}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout().then(() => navigate('/'))}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                  Đăng nhập
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="hidden sm:inline-flex border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100"
                >
                  Đăng ký
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Calendar className="w-4 h-4" />}
                  onClick={() => navigate('/booking')}
                >
                  Đặt lịch ngay
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. NỘI DUNG CHÍNH (MAIN OUTLET) */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 4. CHÂN TRANG Y TẾ TIN CẬY (FOOTER) */}
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
                  Sổ sức khỏe điện tử (EHR) &amp; Toa thuốc
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
