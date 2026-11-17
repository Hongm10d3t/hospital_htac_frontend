import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  patientAuthService,
  type PatientProfileResponse,
} from '../../services/patientAuthService';
import {
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Calendar,
  MapPin,
  CheckCircle2,
  Building2,
  RefreshCw,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import { ApiError } from '../../services/api';
import { Link } from 'react-router-dom';

/**
 * Trang Quản lý Hồ sơ Cá nhân & Cài đặt Bảo mật dành cho Bệnh nhân (Patient Portal)
 * Kết nối:
 * - GET /api/v1/patients/me (Thông tin hồ sơ định danh y tế: CCCD, Mã BN, Ngày sinh, Địa chỉ)
 * - GET /api/v1/auth/me (Thông tin tài khoản: Họ tên, Số điện thoại, Username)
 * - PATCH /api/v1/auth/me (Cập nhật họ tên hiển thị & số điện thoại)
 * - POST /api/v1/auth/change-password (Đổi mật khẩu tài khoản)
 */
export const PatientProfilePage: React.FC = () => {
  const { user, updateProfile, hospitalConfig } = useAuth();
  const toast = useToast();

  // 1. Trạng thái tải dữ liệu hồ sơ y tế
  const [patientProfile, setPatientProfile] = useState<PatientProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  // 2. Trạng thái Form Cập nhật Thông tin cá nhân
  const [fullName, setFullName] = useState<string>(user?.fullName || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState<boolean>(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Đồng bộ khi user trong AuthContext thay đổi
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Tải hồ sơ y tế bệnh nhân từ /api/v1/patients/me
  useEffect(() => {
    const fetchPatientData = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await patientAuthService.getMyPatientProfile();
        setPatientProfile(profile);
        if (!fullName && profile.fullName) {
          setFullName(profile.fullName);
        }
      } catch (err) {
        console.warn('[PatientProfilePage] Không tìm thấy hồ sơ y tế bệnh nhân:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchPatientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Xử lý lưu thông tin cá nhân (PATCH /api/v1/auth/me)
   */
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setAccountError('Họ và tên không được để trống.');
      return;
    }
    if (trimmedName.length > 150) {
      setAccountError('Họ và tên không được vượt quá 150 ký tự.');
      return;
    }

    if (!trimmedPhone) {
      setAccountError('Số điện thoại không được để trống.');
      return;
    }
    if (trimmedPhone.length > 20) {
      setAccountError('Số điện thoại không được vượt quá 20 ký tự.');
      return;
    }

    setIsUpdatingAccount(true);
    try {
      await updateProfile({ fullName: trimmedName, phone: trimmedPhone });
      toast.success('Cập nhật thông tin cá nhân thành công!');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setAccountError(err.message || 'Lỗi khi cập nhật thông tin.');
      } else if (err instanceof Error) {
        setAccountError(err.message);
      } else {
        setAccountError('Không thể lưu thông tin. Vui lòng thử lại.');
      }
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  // Định dạng giới tính tiếng Việt
  const formatGender = (gender?: string) => {
    if (!gender) return 'Chưa xác định';
    if (gender === 'MALE') return 'Nam';
    if (gender === 'FEMALE') return 'Nữ';
    return 'Khác';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 antialiased">
      {/* 1. TIÊU ĐỀ TRANG & BREADCRUMB */}
      <div className="space-y-1.5 border-b border-slate-200 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          <span>Cổng Thông Tin Người Bệnh (Patient Portal)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span>Hồ Sơ Cá Nhân &amp; Cài Đặt Bảo Mật</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
          Tra cứu thông tin định danh y tế điện tử, quản lý số điện thoại liên hệ khám chữa bệnh và cập nhật mật khẩu tài khoản.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* =========================================================================
            2. THẺ ĐỊNH DANH Y TẾ NGƯỜI BỆNH (PATIENT MEDICAL IDENTITY CARD) - 5 CỘT
           ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-gradient-to-br from-sky-900 via-sky-800 to-cyan-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden border border-sky-700/50">
            {/* Họa tiết nền chìm */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

            {/* Header Thẻ Bệnh Nhân */}
            <div className="flex items-center justify-between border-b border-sky-700/60 pb-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-cyan-300" />
                <span className="font-bold text-xs uppercase tracking-wider text-cyan-200">
                  {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA HTAC'}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white/10 text-cyan-200 border-cyan-400/30">
                HỒ SƠ ĐIỆN TỬ
              </Badge>
            </div>

            {/* Thân thẻ: Thông tin bệnh nhân */}
            {isLoadingProfile ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-sky-200 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-300" />
                <span>Đang tải thông tin định danh y tế...</span>
              </div>
            ) : patientProfile ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-sky-300 font-bold">
                    Họ và tên người bệnh
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                    {patientProfile.fullName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <div className="text-[10px] text-sky-300 uppercase font-bold flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      Mã Bệnh Nhân (PID)
                    </div>
                    <div className="font-mono font-black text-sm text-cyan-200 mt-0.5 truncate" title={patientProfile.patientCode}>
                      {patientProfile.patientCode}
                    </div>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <div className="text-[10px] text-sky-300 uppercase font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Số CCCD / Định danh
                    </div>
                    <div className="font-mono font-black text-sm text-white mt-0.5">
                      {patientProfile.citizenId || '---'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-sky-100 pt-1 border-t border-sky-700/40">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>Ngày sinh:</span>
                    <strong className="text-white">
                      {new Date(patientProfile.dateOfBirth).toLocaleDateString('vi-VN')}
                    </strong>
                    <span className="text-sky-300">•</span>
                    <span>Giới tính:</span>
                    <strong className="text-white">{formatGender(patientProfile.gender)}</strong>
                  </div>

                  {patientProfile.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                      <span className="text-sky-200 text-[11px] leading-relaxed">
                        {patientProfile.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-sky-200 bg-white/5 rounded-2xl border border-white/10 p-4 space-y-1">
                <AlertCircle className="w-6 h-6 mx-auto text-amber-300 mb-1" />
                <div className="font-bold text-white">Chưa liên kết hồ sơ y tế bệnh nhân</div>
                <div className="text-[11px] text-sky-300">
                  Vui lòng xuất trình CCCD tại quầy Tiếp đón để liên kết hồ sơ khám chữa bệnh.
                </div>
              </div>
            )}

            {/* Chân thẻ: Mã vạch mô phỏng & Tiêu chuẩn bảo mật */}
            <div className="pt-3 border-t border-sky-700/60 flex items-center justify-between text-[10px] text-sky-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hồ sơ đã được xác thực y tế</span>
              </div>
              <span className="font-mono opacity-80">HTAC-EHR-2026</span>
            </div>
          </div>

          {/* Hộp lưu ý nghiệp vụ y tế */}
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Quy định điều chỉnh thông tin định danh y tế:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Các trường thông tin pháp lý y tế (<strong>Số CCCD</strong>, <strong>Mã bệnh nhân</strong>, <strong>Ngày sinh</strong>) được gắn liền với hồ sơ bệnh án điện tử và chế độ BHYT quốc gia. Để chỉnh sửa các thông tin này, người bệnh vui lòng mang giấy tờ tùy thân hợp lệ đến trực tiếp quầy Tiếp đón của Bệnh viện để được nhân viên đối soát.
            </p>
          </div>
        </div>

        {/* =========================================================================
            3. FORMS: CẬP NHẬT THÔNG TIN LIÊN HỆ & ĐỔI MẬT KHẨU - 7 CỘT
           ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* CARD 1: CẬP NHẬT THÔNG TIN TÀI KHOẢN (FULLNAME & PHONE) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Thông Tin Tài Khoản &amp; Liên Hệ</h3>
                <p className="text-xs text-slate-500">
                  Cập nhật họ tên hiển thị và số điện thoại dùng để nhận thông báo lịch hẹn &amp; đơn thuốc.
                </p>
              </div>
            </div>

            {accountError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{accountError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateAccount} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tên đăng nhập (Username):
                </label>
                <Input
                  value={user?.username || ''}
                  disabled
                  className="bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tên đăng nhập được khởi tạo cố định khi đăng ký tài khoản.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Họ và tên người bệnh <span className="text-rose-500">*</span>:
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ..."
                  required
                  maxLength={150}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số điện thoại liên hệ <span className="text-rose-500">*</span>:
                </label>
                <div className="relative">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    required
                    maxLength={20}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Số điện thoại được sử dụng để xác nhận lượt đặt khám và thông báo nhắc lịch.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isUpdatingAccount}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Lưu Thay Đổi Thông Tin
                </Button>
              </div>
            </form>
          </div>

          {/* CARD 2: BẢO MẬT & MẬT KHẨU TÀI KHOẢN (SECURITY & PASSWORD) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Bảo Mật &amp; Mật Khẩu Đăng Nhập</h3>
                <p className="text-xs text-slate-500">
                  Quản lý mật khẩu bảo vệ hồ sơ bệnh án và lịch sử khám chữa bệnh cá nhân.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Trạng thái bảo mật mật khẩu:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đang được bảo vệ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Mật khẩu tài khoản của bạn được mã hóa an toàn theo tiêu chuẩn bảo mật y tế điện tử quốc tế. Để bảo đảm an toàn dữ liệu sức khỏe, chúng tôi khuyến nghị thay đổi mật khẩu định kỳ 6 tháng một lần.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-sky-950">Bạn muốn cập nhật mật khẩu mới?</div>
                  <div className="text-[11px] text-sky-700">
                    Trang đổi mật khẩu độc lập với các tiêu chuẩn kiểm tra độ mạnh mật khẩu và tự động đăng nhập an toàn.
                  </div>
                </div>

                <Link
                  to="/patient/change-password"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all shrink-0"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Đổi Mật Khẩu</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
