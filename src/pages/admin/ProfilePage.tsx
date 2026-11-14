import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  User,
  KeyRound,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { ApiError } from '../../services/api';
import { useNavigate } from 'react-router-dom';

/**
 * Trang thông tin cá nhân và cài đặt bảo mật (F01.01)
 * Kết nối:
 * - GET /api/v1/auth/me (lấy thông tin hiện tại)
 * - PATCH /api/v1/auth/me (cập nhật fullName, phone)
 * - POST /api/v1/auth/change-password (đổi mật khẩu an toàn)
 */
export const ProfilePage: React.FC = () => {
  const { user, role, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // 1. Trạng thái cập nhật thông tin cá nhân
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Cập nhật state nếu user trong AuthContext thay đổi
  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // 2. Trạng thái đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /**
   * Xử lý lưu thông tin cá nhân (PATCH /api/v1/auth/me)
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setProfileError('Họ và tên không được để trống');
      return;
    }
    if (trimmedName.length > 150) {
      setProfileError('Họ và tên không được vượt quá 150 ký tự');
      return;
    }

    if (!trimmedPhone) {
      setProfileError('Số điện thoại không được để trống');
      return;
    }
    if (trimmedPhone.length > 20) {
      setProfileError('Số điện thoại không được vượt quá 20 ký tự');
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile({ fullName: trimmedName, phone: trimmedPhone });
      toast.success('Cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileError(err.message || 'Lỗi khi cập nhật thông tin');
      } else if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError('Không thể lưu thông tin. Vui lòng thử lại.');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Xử lý đổi mật khẩu (POST /api/v1/auth/change-password)
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      setPasswordError('Mật khẩu mới phải có độ dài từ 6 đến 128 ký tự');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp với mật khẩu mới');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Đổi mật khẩu thành công! Phiên cũ đã kết thúc, vui lòng đăng nhập lại.');
      navigate('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message || 'Mật khẩu hiện tại không đúng hoặc không hợp lệ');
      } else if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* TIÊU ĐỀ TRANG */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-sky-600" />
          Hồ sơ Cá nhân &amp; Cài đặt Bảo mật
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý thông tin liên hệ và cập nhật mật khẩu đăng nhập hệ thống bệnh viện HTAC.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1: THẺ THÔNG TIN TỔNG QUAN TÀI KHOẢN (READ-ONLY) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow-md shadow-sky-600/20">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {user?.fullName || user?.username}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">@{user?.username}</p>

              <div className="mt-3 flex justify-center">
                <Badge status={role === 'ADMIN' ? 'PRIMARY' : 'ACTIVE'} variant="subtle">
                  Vai trò: {role || 'STAFF'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Mã tài khoản (ID):</span>
                <span className="font-semibold text-slate-800 font-mono">#{user?.id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Tên đăng nhập:</span>
                <span className="font-semibold text-slate-800 font-mono">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đang hoạt động
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                Quy định bảo mật tài khoản:
              </div>
              <p className="leading-relaxed">
                Tên đăng nhập và vai trò phân quyền do Quản trị viên cấp và không thể tự thay đổi. Bạn có thể cập nhật tên hiển thị và số điện thoại liên hệ.
              </p>
            </div>
          </div>
        </div>

        {/* CỘT 2: 2 FORM CHỈNH SỬA THÔNG TIN & ĐỔI MẬT KHẨU */}
        <div className="lg:col-span-2 space-y-6">
          {/* FORM 1: CẬP NHẬT THÔNG TIN LIÊN HỆ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <User className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Thông tin liên hệ</h3>
                <p className="text-xs text-slate-500">Họ và tên hiển thị trong hệ thống và số điện thoại liên hệ</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <Input
                label="Họ và tên hiển thị"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nhập họ và tên đầy đủ"
                helperText="Tên xuất hiện trên các phiếu khám, hồ sơ hoặc biên lai xử lý"
              />

              <Input
                label="Số điện thoại liên hệ"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                leftIcon={<Phone className="w-4 h-4" />}
                placeholder="Ví dụ: 0988123456"
                helperText="Số điện thoại dùng để nhận thông báo hoặc liên hệ khẩn cấp"
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" isLoading={profileLoading}>
                  Lưu thay đổi thông tin
                </Button>
              </div>
            </form>
          </div>

          {/* FORM 2: ĐỔI MẬT KHẨU */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Đổi mật khẩu tài khoản</h3>
                <p className="text-xs text-slate-500">
                  Mật khẩu mới từ 6 - 128 ký tự. Sau khi đổi thành công, bạn sẽ cần đăng nhập lại.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <Input
                label="Mật khẩu hiện tại"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Nhập mật khẩu đang dùng"
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Mật khẩu mới"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Từ 6 đến 128 ký tự"
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Input
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="secondary" isLoading={passwordLoading}>
                  Xác nhận đổi mật khẩu
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
