import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, User, ShieldCheck, Eye, EyeOff, Building2 } from 'lucide-react';
import { ApiError } from '../../services/api';

/**
 * Màn hình Đăng nhập Quản trị & Nhân viên Y tế (F01.01)
 * Kết nối: POST /api/v1/public/auth/login, quản lý phiên cookie JSESSIONID và CSRF token
 */
export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Htac@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lấy đường dẫn trước đó (nếu bị ProtectedRoute chặn chuyển hướng sang)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Nếu đã đăng nhập thì tự động chuyển hướng theo Role
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor/worklist', { replace: true });
      } else if (user.role === 'RECEPTIONIST') {
        navigate('/reception/checkin', { replace: true });
      } else if (user.role === 'PHARMACIST') {
        navigate('/pharmacy/dispense', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from]);

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

      if (from) {
        navigate(from, { replace: true });
      } else if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (loggedUser.role === 'DOCTOR') {
        navigate('/doctor/worklist', { replace: true });
      } else if (loggedUser.role === 'RECEPTIONIST') {
        navigate('/reception/checkin', { replace: true });
      } else if (loggedUser.role === 'PHARMACIST') {
        navigate('/pharmacy/dispense', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased selection:bg-sky-100 selection:text-sky-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-sky-600/30 group-hover:scale-105 transition-transform">
            +
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">HTAC Hospital</h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Cổng Đăng nhập Phân hệ Quản trị &amp; Nhân viên Y tế
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
              leftIcon={<User className="w-4 h-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: admin"
            />

            <Input
              id="login-password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              leftIcon={<Lock className="w-4 h-4" />}
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

          {/* Gợi ý tài khoản demo */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700 block mb-1">Tài khoản quản trị mặc định:</span>
              <div className="flex justify-between items-center font-mono">
                <span>Username: <strong>admin</strong></span>
                <span>Mật khẩu: <strong>Htac@2026</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Phiên bảo mật Cookie HTTP-Only
              </span>
              <Link to="/" className="text-sky-600 hover:underline font-medium text-xs flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Về Trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
