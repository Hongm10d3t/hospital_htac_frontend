import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  patientAuthService,
  type RegisterPatientRequest,
  type PatientGender,
} from '../../services/patientAuthService';
import { ApiError } from '../../services/api';
import {
  ShieldCheck,
  User,
  Lock,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
  Building2,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

/**
 * Trang Đăng ký Tài khoản Bệnh nhân & Liên kết Hồ sơ y tế (F02.03)
 * Kết nối: POST /api/v1/public/auth/register
 * Xử lý: Liên kết hồ sơ y tế cũ qua verificationToken khi gặp mã IDENTITY_REVIEW_REQUIRED
 */
export const PatientRegisterPage: React.FC = () => {
  const { login, isAuthenticated, hospitalConfig } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Dữ liệu form
  const [formData, setFormData] = useState<RegisterPatientRequest>({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    citizenId: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    verificationToken: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trạng thái yêu cầu mã xác minh liên kết hồ sơ (IDENTITY_REVIEW_REQUIRED)
  const [needsVerificationToken, setNeedsVerificationToken] = useState(false);

  // Nếu đã đăng nhập thì tự động chuyển hướng
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/booking', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field: keyof RegisterPatientRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Kiểm tra họ và tên
    if (!formData.fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn');
      return;
    }

    // 2. Kiểm tra tên đăng nhập
    const usernameRegex = /^[A-Za-z0-9._-]{3,50}$/;
    if (!usernameRegex.test(formData.username.trim())) {
      setErrorMessage(
        'Tên đăng nhập phải từ 3 đến 50 ký tự, chỉ gồm chữ cái tiếng Anh, chữ số và các ký tự . _ -'
      );
      return;
    }

    // 3. Kiểm tra mật khẩu
    if (!formData.password || formData.password.length < 6) {
      setErrorMessage('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    if (formData.password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    // 4. Kiểm tra CCCD (12 chữ số)
    const citizenIdRegex = /^[0-9]{12}$/;
    if (!citizenIdRegex.test(formData.citizenId.trim())) {
      setErrorMessage('Số CCCD / Định danh cá nhân phải gồm chính xác 12 chữ số');
      return;
    }

    // 5. Kiểm tra ngày sinh
    if (!formData.dateOfBirth) {
      setErrorMessage('Vui lòng chọn ngày tháng năm sinh');
      return;
    }

    // 6. Kiểm tra số điện thoại
    if (!formData.phone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại liên hệ');
      return;
    }

    // 7. Nếu đang yêu cầu mã xác minh mà chưa nhập
    if (needsVerificationToken && !formData.verificationToken?.trim()) {
      setErrorMessage('Vui lòng nhập mã xác minh liên kết hồ sơ do Quầy tiếp đón cấp');
      return;
    }

    setIsLoading(true);

    try {
      const payload: RegisterPatientRequest = {
        username: formData.username.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        citizenId: formData.citizenId.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address?.trim() || undefined,
        verificationToken: formData.verificationToken?.trim() || undefined,
      };

      // Gửi API đăng ký tài khoản bệnh nhân
      await patientAuthService.register(payload);

      toast.success(
        needsVerificationToken
          ? 'Đăng ký và liên kết hồ sơ bệnh án thành công!'
          : 'Đăng ký tài khoản bệnh nhân thành công!'
      );

      // Tự động đăng nhập luôn để mang lại trải nghiệm tiện lợi nhất cho người bệnh
      try {
        await login({
          username: formData.username.trim(),
          password: formData.password,
        });
        toast.info(`Chào mừng ${formData.fullName} đến với Hệ thống Bệnh viện HTAC!`);
        navigate('/booking', { replace: true });
      } catch {
        // Nếu tự động login có vấn đề, chuyển về trang đăng nhập
        navigate('/login', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'IDENTITY_REVIEW_REQUIRED') {
          setNeedsVerificationToken(true);
          setErrorMessage(
            'Hệ thống phát hiện thông tin định danh (CCCD hoặc Họ tên & Ngày sinh) của bạn đã từng khám tại viện. Để bảo vệ dữ liệu y tế cá nhân và liên kết toàn bộ hồ sơ khám bệnh cũ, vui lòng nhập "Mã xác minh liên kết" do Quầy tiếp đón cấp.'
          );
        } else if (err.code === 'USERNAME_TAKEN') {
          setErrorMessage('Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên đăng nhập khác.');
        } else if (err.code === 'PATIENT_ALREADY_LINKED') {
          setErrorMessage(
            'Hồ sơ bệnh án này đã được liên kết với một tài khoản khác. Vui lòng đăng nhập hoặc liên hệ quầy tiếp đón.'
          );
        } else {
          setErrorMessage(err.message || `Lỗi đăng ký [${err.code}]`);
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 antialiased selection:bg-sky-100 selection:text-sky-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <Link to="/" className="inline-flex flex-col items-center gap-2 mb-2 group">
          {hospitalConfig?.logoUrl ? (
            <img
              src={hospitalConfig.logoUrl}
              alt={hospitalConfig.name || 'Logo Bệnh viện'}
              className="h-14 w-auto max-w-[180px] object-contain rounded-xl p-1 bg-white border border-slate-200/90 shadow-xs group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-sky-600/30 group-hover:scale-105 transition-transform">
              +
            </div>
          )}
          <span className="font-extrabold text-slate-900 text-2xl tracking-tight mt-1">
            {hospitalConfig?.name || 'HTAC Hospital'}
          </span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
          Đăng ký Tài khoản Bệnh nhân
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-medium max-w-lg mx-auto">
          Tạo tài khoản để đặt lịch khám trực tuyến, theo dõi kết quả khám bệnh và quản lý đơn thuốc điện tử.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* THÔNG BÁO LỖI / CẢNH BÁO */}
            {errorMessage && (
              <div
                className={`p-4 rounded-2xl border text-sm leading-relaxed font-medium animate-in fade-in flex items-start gap-3 ${
                  needsVerificationToken
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {needsVerificationToken ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold">
                    {needsVerificationToken ? 'Yêu cầu xác minh liên kết hồ sơ' : 'Thông báo'}
                  </div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* PHẦN 1: THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Lock className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">1. Thông tin Tài khoản Đăng nhập</h3>
              </div>

              <div>
                <Input
                  id="reg-username"
                  label="Tên đăng nhập"
                  type="text"
                  required
                  autoComplete="username"
                  leftIcon={<User className="w-4 h-4 text-slate-400" />}
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="Ví dụ: nguyenvanan1990"
                  helperText="Dài 3–50 ký tự (chữ cái không dấu, chữ số, dấu chấm, gạch dưới hoặc gạch nối)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="reg-password"
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
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
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />

                <Input
                  id="reg-confirm-password"
                  label="Xác nhận mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>

            {/* PHẦN 2: THÔNG TIN ĐỊNH DANH Y TẾ */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">2. Thông tin Định danh Y tế</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="reg-fullname"
                  label="Họ và tên (có dấu)"
                  type="text"
                  required
                  leftIcon={<User className="w-4 h-4 text-slate-400" />}
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Ví dụ: NGUYỄN VĂN AN"
                />

                <Input
                  id="reg-citizenId"
                  label="Số CCCD / Định danh (12 chữ số)"
                  type="text"
                  required
                  maxLength={12}
                  leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
                  value={formData.citizenId}
                  onChange={(e) => handleChange('citizenId', e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 001090012345"
                  helperText="Chuẩn 12 chữ số để tự động gắn mã bệnh nhân"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="reg-dob"
                  label="Ngày tháng năm sinh"
                  type="date"
                  required
                  leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />

                <Select
                  id="reg-gender"
                  label="Giới tính"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value as PatientGender)}
                  options={[
                    { value: 'MALE', label: 'Nam' },
                    { value: 'FEMALE', label: 'Nữ' },
                    { value: 'OTHER', label: 'Khác' },
                  ]}
                />
              </div>
            </div>

            {/* PHẦN 3: THÔNG TIN LIÊN LẠC & CƯ TRÚ */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Phone className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">3. Thông tin Liên lạc</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="reg-phone"
                  label="Số điện thoại di động"
                  type="tel"
                  required
                  leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  helperText="Dùng để nhận tin nhắn xác nhận lịch khám"
                />

                <Input
                  id="reg-address"
                  label="Địa chỉ nơi ở (Tùy chọn)"
                  type="text"
                  leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                />
              </div>
            </div>

            {/* PHẦN 4: MÃ LIÊN KẾT HỒ SƠ Y TẾ CŨ (HIỆN KHI CẦN XÁC MINH) */}
            {needsVerificationToken && (
              <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-300 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                  <KeyRound className="w-4 h-4 text-sky-600" />
                  Mã xác minh liên kết hồ sơ y tế cũ (Verification Token)
                </div>
                <p className="text-xs text-sky-800 leading-relaxed">
                  Nhập mã bí mật 1 lần (có hiệu lực trong 15 phút) do Quầy tiếp đón cấp cho bạn sau khi đối chiếu giấy tờ tùy thân.
                </p>
                <Input
                  id="reg-verification-token"
                  label="Mã xác minh (Verification Token)"
                  type="text"
                  required
                  value={formData.verificationToken || ''}
                  onChange={(e) => handleChange('verificationToken', e.target.value)}
                  placeholder="Dán mã do tiếp đón cấp tại đây..."
                  helperText="Mã này giúp toàn bộ lịch sử khám chữa bệnh cũ được hiển thị ngay trong tài khoản của bạn."
                />
              </div>
            )}

            {/* NÚT THAO TÁC SUBMIT */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-12 text-sm font-semibold shadow-md shadow-sky-600/20"
                isLoading={isLoading}
              >
                {needsVerificationToken ? 'Xác nhận và Hoàn tất liên kết hồ sơ' : 'Đăng ký tài khoản ngay'}
              </Button>
            </div>
          </form>

          {/* CHỈ DẪN VÀ ĐIỀU HƯỚNG */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Dữ liệu y tế được bảo mật theo tiêu chuẩn Bộ Y tế</span>
            </div>

            <div className="flex items-center gap-1">
              <span>Đã có tài khoản?</span>
              <Link to="/login" className="text-sky-600 font-bold hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-600 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Về Trang chủ
            </Link>
            <div className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Hỗ trợ: 1900-8888</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
