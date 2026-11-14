import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { ApiError } from '../../services/api';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Htac@2026');
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
    setIsLoading(true);

    try {
      const loggedUser = await login({ username, password });
      toast.success(`Xin chào ${loggedUser.fullName || loggedUser.username}!`);

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
        setErrorMessage(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Không thể kết nối đến máy chủ xác thực');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-sky-600/30">
            +
          </div>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">HTAC Hospital</h2>
        <p className="mt-1 text-xs text-slate-500">
          Cổng Đăng nhập Phân hệ Quản trị &amp; Nhân viên Y tế
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
          <form className="space-y-4.5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
                {errorMessage}
              </div>
            )}

            <Input
              id="login-username"
              label="Tên đăng nhập"
              type="text"
              required
              leftIcon={<User className="w-4 h-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username"
            />

            <Input
              id="login-password"
              label="Mật khẩu"
              type="password"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-semibold"
                isLoading={isLoading}
              >
                Đăng nhập hệ thống
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Phiên bảo mật Cookie HTTP-Only
            </span>
            <Link to="/" className="text-sky-600 hover:underline font-medium">
              Về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
