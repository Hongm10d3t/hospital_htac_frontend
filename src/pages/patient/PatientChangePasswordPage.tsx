import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { ApiError } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';

/**
 * Trang Đổi Mật Khẩu Dành Cho Bệnh Nhân (Patient Change Password Page)
 * Kết nối:
 * - POST /api/v1/auth/change-password (Mật khẩu cũ + Mật khẩu mới 6-128 ký tự)
 */
export const PatientChangePasswordPage: React.FC = () => {
  const { changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Trạng thái Form Đổi Mật Khẩu
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /**
   * Xử lý đổi mật khẩu (POST /api/v1/auth/change-password)
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      setPasswordError('Mật khẩu mới phải có độ dài từ 6 đến 128 ký tự.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.');
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPasswordError(err.message || 'Mật khẩu hiện tại không đúng.');
      } else if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6 antialiased">
      {/* Nút quay lại Hồ sơ cá nhân */}
      <div>
        <Link
          to="/patient/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Hồ sơ cá nhân</span>
        </Link>
      </div>

      {/* TIÊU ĐỀ TRANG */}
      <div className="space-y-1.5 border-b border-slate-200 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          <span>Bảo Mật Tài Khoản (Account Security)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span>Thay Đổi Mật Khẩu</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Cập nhật mật khẩu định kỳ giúp bảo vệ an toàn dữ liệu cá nhân, lịch sử khám bệnh và hồ sơ bệnh án điện tử của bạn.
        </p>
      </div>

      {/* KHUNG FORM ĐỔI MẬT KHẨU */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Thiết Lập Mật Khẩu Mới</h3>
            <p className="text-xs text-slate-500">
              Nhập mật khẩu hiện tại và tạo mật khẩu mới an toàn cho tài khoản.
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              Mật khẩu hiện tại <span className="text-rose-500">*</span>:
            </label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang sử dụng..."
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Mật khẩu mới <span className="text-rose-500">*</span>:
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  required
                  minLength={6}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>:
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                  minLength={6}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Lưu ý quy tắc mật khẩu */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 space-y-1.5">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tiêu chuẩn mật khẩu an toàn:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
              <li>Mật khẩu mới phải có độ dài từ 6 đến 128 ký tự.</li>
              <li>Mật khẩu mới phải khác với mật khẩu đang sử dụng hiện tại.</li>
              <li>Sau khi đổi mật khẩu thành công, hệ thống sẽ tự động đăng xuất để bạn đăng nhập lại an toàn.</li>
            </ul>
          </div>

          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/patient/profile')}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isChangingPassword}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Xác Nhận Đổi Mật Khẩu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
