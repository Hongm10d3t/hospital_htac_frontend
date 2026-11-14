import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  UserPlus,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { ApiError } from '../../services/api';

/**
 * Màn hình Đăng nhập Hợp nhất (1 Form duy nhất cho tất cả đối tượng)
 * Kết nối: POST /api/v1/public/auth/login, quản lý phiên cookie JSESSIONID và CSRF token
 * Hiển thị Logo Bệnh viện thật từ cấu hình hệ thống
 */
export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user, hospitalConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lấy đường dẫn trước đó (nếu bị ProtectedRoute chặn chuyển hướng sang)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Điều hướng người dùng sau khi xác thực thành công theo vai trò
  const routeUserByRole = (role: string) => {
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    switch (role) {
      case 'ADMIN':
        navigate('/admin/dashboard', { replace: true });
        break;
      case 'DOCTOR':
        navigate('/doctor/worklist', { replace: true });
        break;
      case 'RECEPTIONIST':
        navigate('/reception/checkin', { replace: true });
        break;
      case 'PHARMACIST':
        navigate('/pharmacy/dispense', { replace: true });
        break;
      case 'PATIENT':
      default:
        navigate('/booking', { replace: true });
        break;
    }
  };

  // Nếu đã đăng nhập thì tự động chuyển hướng theo Role
  React.useEffect(() => {
    if (isAuthenticated && user) {
      routeUserByRole(user.role);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setIsLoading(true);

    try {
      const loggedUser = await login({ username: username.trim(), password });
      toast.success(`Đăng nhập thành công! Xin chào ${loggedUser.fullName || loggedUser.username}`);
      routeUserByRole(loggedUser.role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage('Tên đăng nhập hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa.');
        } else {
          setErrorMessage(err.message || `Lỗi xác thực [${err.code}]`);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Không thể kết nối đến máy chủ xác thực.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Tiện ích hỗ trợ điền nhanh tài khoản Admin cho nhà phát triển/kiểm thử
  const fillAdminCredentials = () => {
    setUsername('admin');
    setPassword('Htac@2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 antialiased selection:bg-sky-100 selection:text-sky-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* LOGO BỆNH VIỆN THẬT */}
        <Link to="/" className="inline-flex flex-col items-center gap-2 mb-3 group">
          <img
            src={hospitalConfig?.logoUrl || '/logo.png'}
            alt={hospitalConfig?.name || 'Bệnh viện Đa khoa HTAC'}
            className="h-16 w-auto max-w-[220px] object-contain rounded-2xl p-1.5 bg-white border border-slate-200/90 shadow-sm group-hover:scale-105 transition-transform"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {hospitalConfig?.name || 'Bệnh viện Đa khoa Quốc tế HTAC'}
          </h1>
        </Link>
        <p className="text-xs text-slate-500 font-medium">
          Cổng Đăng nhập Hệ thống Quản lý Bệnh viện &amp; Dịch vụ Y tế Trực tuyến
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed font-medium animate-in fade-in">
                {errorMessage}
              </div>
            )}

            <Input
              id="login-username"
              label="Tên đăng nhập"
              type="text"
              required
              autoComplete="username"
              leftIcon={<User className="w-4 h-4 text-slate-400" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập của bạn"
            />

            <Input
              id="login-password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              rightIcon={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-semibold shadow-md shadow-sky-600/20"
                isLoading={isLoading}
              >
                Đăng nhập hệ thống
              </Button>
            </div>
          </form>

          {/* DÀNH CHO BỆNH NHÂN: NÚT ĐĂNG KÝ MỚI */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-center">
              <span className="text-xs text-slate-500">Chưa có tài khoản bệnh nhân?</span>
              <Link
                to="/register"
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-300 bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng ký tài khoản khám mới ngay</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>

          {/* TIỆN ÍCH DÀNH CHO CÁN BỘ / KIỂM THỬ VIÊN: NÚT ĐIỀN NHANH ADMIN */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="text-[11px] text-slate-400 hover:text-sky-600 flex items-center gap-1 transition-colors cursor-pointer"
              title="Điền thông tin tài khoản Quản trị viên (admin)"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Điền tài khoản Admin mẫu</span>
            </button>

            <Link to="/" className="text-slate-500 hover:text-slate-800 font-medium text-xs flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Trang chủ
            </Link>
          </div>

          {/* CHÂN FORM: BẢO MẬT */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Bảo mật phiên đăng nhập Cookie HTTP-Only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
