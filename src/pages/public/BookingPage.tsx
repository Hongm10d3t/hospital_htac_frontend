import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  bookingService,
  type PublicClinicSlot,
  type AppointmentDetailResponse,
} from '../../services/bookingService';
import {
  publicDoctorService,
  type DoctorPublicResponse,
} from '../../services/publicDoctorService';
import {
  patientAuthService,
  type PatientProfileResponse,
} from '../../services/patientAuthService';
import { ApiError } from '../../services/api';
import { resolveAvatarSrc, cn } from '../../lib/utils';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Printer,
  RotateCcw,
  Search,
  Loader2,
  ArrowRight,
  Check,
} from 'lucide-react';

/**
 * Màn hình Đặt lịch khám Đa hướng (Multi-path Booking Flow - F02.04)
 * Thiết kế UX tối ưu:
 * - Tab 1 (Mặc định): Đặt theo Chuyên khoa bệnh lý (Chỉ chọn chuyên khoa ➔ Bước 2 đề xuất tất cả lịch khám)
 * - Tab 2: Đặt theo Bác sĩ chuyên khoa (Có bộ lọc chuyên khoa & tìm kiếm bác sĩ)
 * - Thao tác 2 tab độc lập, không đè lên nhau
 * - Bỏ cột tóm tắt bên phải: Sau khi chọn xong bước 1 & bước 2 ➔ Nút "Tiếp tục" mở Phiếu đăng ký khám kèm lý do khám
 */
export const BookingPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, hospitalConfig } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Kiểm tra xác thực: Bắt buộc đăng nhập mới được truy cập
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.info('Vui lòng đăng nhập tài khoản bệnh nhân để đặt lịch khám.');
      navigate('/login', {
        state: { from: { pathname: '/booking' } },
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // 2. Chế độ luồng đặt lịch: 'by_specialty' (Tab 1 mặc định) | 'by_doctor' (Tab 2)
  const [bookingMode, setBookingMode] = useState<'by_specialty' | 'by_doctor'>(() => {
    return searchParams.get('doctorId') ? 'by_doctor' : 'by_specialty';
  });

  // 3. Danh mục bác sĩ & chuyên khoa dùng chung
  const [doctors, setDoctors] = useState<DoctorPublicResponse[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Map tra cứu nhanh bác sĩ theo userId
  const doctorLookup = useMemo(() => {
    return new Map<number, DoctorPublicResponse>(doctors.map((d) => [d.userId, d]));
  }, [doctors]);

  // Danh sách các chuyên khoa tổng hợp từ danh mục bác sĩ
  const specialtyList = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>();
    doctors.forEach((d) => {
      if (d.specialtyId && d.specialtyName) {
        const existing = map.get(d.specialtyId);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(d.specialtyId, { name: d.specialtyName, count: 1 });
        }
      }
    });
    return Array.from(map.entries()).map(([id, val]) => ({
      id,
      name: val.name,
      doctorCount: val.count,
    }));
  }, [doctors]);

  // --- STATE DÀNH RIÊNG CHO TAB 1 (THEO CHUYÊN KHOA) ---
  const [tab1SpecialtyId, setTab1SpecialtyId] = useState<number | null>(() => {
    const p = searchParams.get('specialtyId');
    return p ? Number(p) : null;
  });

  // --- STATE DÀNH RIÊNG CHO TAB 2 (THEO BÁC SĨ) ---
  const [tab2FilterSpecialtyId, setTab2FilterSpecialtyId] = useState<number | null>(null);
  const [tab2DoctorSearch, setTab2DoctorSearch] = useState('');
  const [tab2DoctorId, setTab2DoctorId] = useState<number | null>(() => {
    const p = searchParams.get('doctorId');
    return p ? Number(p) : null;
  });

  // 4. Lựa chọn ngày khám (chung cho bước 2 của tab đang active)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // 5. Khung giờ khám (Slots)
  const [slots, setSlots] = useState<PublicClinicSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PublicClinicSlot | null>(null);

  // 6. Modal Phiếu đăng ký khám & Lý do khám
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 7. Thông tin bệnh nhân & Kết quả thành công
  const [patientProfile, setPatientProfile] = useState<PatientProfileResponse | null>(null);
  const [successAppointment, setSuccessAppointment] = useState<AppointmentDetailResponse | null>(null);

  // Nạp danh sách bác sĩ công khai (gọi GET /api/v1/public/doctors không sort lỗi)
  useEffect(() => {
    setIsLoadingDoctors(true);
    publicDoctorService
      .listDoctors({ size: 100 })
      .then((res) => {
        const raw = res.items || [];
        const sorted = raw.slice().sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
        setDoctors(sorted);

        // Khởi tạo chuyên khoa mặc định cho Tab 1 nếu chưa có
        if (!searchParams.get('specialtyId') && sorted.length > 0) {
          const firstSpec = sorted[0].specialtyId;
          setTab1SpecialtyId((prev) => prev || firstSpec);
        }
      })
      .catch((err) => {
        console.warn('[BookingPage] Không thể tải danh sách bác sĩ:', err);
        toast.error('Không thể tải danh mục bác sĩ. Vui lòng thử lại sau.');
      })
      .finally(() => setIsLoadingDoctors(false));
  }, [searchParams, toast]);

  // Nạp hồ sơ bệnh nhân khi đã đăng nhập
  useEffect(() => {
    if (isAuthenticated && user?.role === 'PATIENT') {
      patientAuthService
        .getMyPatientProfile()
        .then(setPatientProfile)
        .catch((err) => console.warn('[BookingPage] Chưa nạp được hồ sơ bệnh nhân:', err));
    }
  }, [isAuthenticated, user]);

  // Khi chuyển đổi giữa 2 tab: reset khung giờ đã chọn để tránh xung đột
  const handleTabChange = (mode: 'by_specialty' | 'by_doctor') => {
    if (mode === bookingMode) return;
    setBookingMode(mode);
    setSelectedSlot(null);
    setErrorMessage(null);
  };

  // Danh sách bác sĩ lọc ở Tab 2 (theo chuyên khoa và từ khóa)
  const tab2FilteredDoctors = useMemo(() => {
    let result = doctors;
    if (tab2FilterSpecialtyId) {
      result = result.filter((d) => d.specialtyId === tab2FilterSpecialtyId);
    }
    if (tab2DoctorSearch.trim()) {
      const q = tab2DoctorSearch.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.specialtyName?.toLowerCase().includes(q) ||
          d.professionalTitle?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [doctors, tab2FilterSpecialtyId, tab2DoctorSearch]);

  // Bác sĩ đang được chọn ở Tab 2
  const activeTab2Doctor = useMemo(() => {
    return doctors.find((d) => d.userId === tab2DoctorId) || null;
  }, [doctors, tab2DoctorId]);

  // Tạo dải ngày khám trong tuần (theo advanceBookingDays, mặc định 14 ngày)
  const availableDays = useMemo(() => {
    const days: { date: string; label: string; dayOfWeek: string; isToday: boolean }[] = [];
    const maxDays = hospitalConfig?.advanceBookingDays || 14;
    const now = new Date();

    for (let i = 0; i < maxDays; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayIndex = d.getDay();
      const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

      days.push({
        date: dateStr,
        label: `${dd}/${mm}`,
        dayOfWeek: dayNames[dayIndex],
        isToday: i === 0,
      });
    }
    return days;
  }, [hospitalConfig?.advanceBookingDays]);

  // Nạp danh sách khung khám (Slots) cho bước 2
  // Ở Tab 1: chỉ truyền specialtyId (lấy tất cả ca của chuyên khoa đó)
  // Ở Tab 2: chỉ truyền doctorId (lấy tất cả ca của bác sĩ đó)
  useEffect(() => {
    if (!selectedDate) return;

    let targetSpecialtyId: number | undefined;
    let targetDoctorId: number | undefined;

    if (bookingMode === 'by_specialty') {
      if (!tab1SpecialtyId) {
        setSlots([]);
        return;
      }
      targetSpecialtyId = tab1SpecialtyId;
      targetDoctorId = undefined; // Bỏ qua doctorId để lấy tất cả ca của chuyên khoa!
    } else {
      if (!tab2DoctorId) {
        setSlots([]);
        return;
      }
      targetDoctorId = tab2DoctorId;
      targetSpecialtyId = undefined;
    }

    setIsLoadingSlots(true);
    setSelectedSlot(null);

    bookingService
      .searchPublicSlots({
        date: selectedDate,
        specialtyId: targetSpecialtyId,
        doctorId: targetDoctorId,
        size: 100,
        sort: 'startAt,ASC',
      })
      .then((res) => {
        setSlots(res.items || []);
      })
      .catch((err) => {
        console.warn('[BookingPage] Lỗi tải khung khám:', err);
        setSlots([]);
      })
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate, bookingMode, tab1SpecialtyId, tab2DoctorId]);

  // Phân nhóm slots theo Buổi Sáng và Buổi Chiều
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const morning: PublicClinicSlot[] = [];
    const afternoon: PublicClinicSlot[] = [];

    slots.forEach((slot) => {
      const hour = new Date(slot.startAt).getHours();
      if (hour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    });

    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [slots]);

  // Format giờ từ ISO string ("08:00 - 08:30")
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    return `${sh}:${sm} – ${eh}:${em}`;
  };

  // Mở Modal Phiếu khám khi bấm nút "Tiếp tục"
  const handleOpenConfirmModal = () => {
    if (!selectedSlot) {
      toast.warning('Vui lòng chọn 1 khung giờ khám còn chỗ trước khi tiếp tục.');
      return;
    }
    setErrorMessage(null);
    setIsConfirmModalOpen(true);
  };

  // Xử lý gửi yêu cầu đặt lịch hẹn chính thức từ trong Modal
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSlot) return;

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do khám hoặc các triệu chứng cần bác sĩ tư vấn');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await bookingService.bookAppointment({
        slotId: selectedSlot.id,
        reason: reason.trim(),
      });

      setIsConfirmModalOpen(false);
      setSuccessAppointment(res);
      toast.success('Đặt lịch khám thành công! Hệ thống đã ghi nhận yêu cầu của bạn.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SLOT_FULL') {
          setErrorMessage('Khung giờ này vừa có người đặt hết chỗ. Vui lòng chọn khung giờ khác.');
        } else if (err.code === 'SLOT_OUTSIDE_BOOKING_WINDOW') {
          setErrorMessage('Khung khám này đã quá hạn hoặc ngoài thời hạn đặt trước cho phép.');
        } else if (err.code === 'APPOINTMENT_ALREADY_EXISTS') {
          setErrorMessage('Bạn đã có một lịch hẹn trong khung giờ khám này.');
        } else {
          setErrorMessage(err.message || `Lỗi đặt lịch hẹn [${err.code}]`);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Không thể gửi yêu cầu đặt lịch. Vui lòng kiểm tra lại kết nối.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gợi ý triệu chứng nhanh
  const handleQuickReason = (text: string) => {
    setReason((prev) => (prev ? `${prev}, ${text.toLowerCase()}` : text));
  };

  // Nếu đang kiểm tra phiên đăng nhập
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-sm font-medium">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  // Bác sĩ tương ứng với slot đang chọn
  const selectedSlotDoctor = selectedSlot ? doctorLookup.get(selectedSlot.doctorId) : null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 antialiased selection:bg-sky-100 selection:text-sky-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 1. HEADER TRANG ĐẶT LỊCH */}
        <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-cyan-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none hidden md:block">
            <CalendarCheck className="w-96 h-96 -mr-16 -mt-16 text-white" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-cyan-200">
              <Calendar className="w-3.5 h-3.5 text-cyan-300" />
              <span>Dịch vụ Y tế Tiêu chuẩn Cao HTAC</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Đặt lịch Khám bệnh Trực tuyến
            </h1>
            <p className="text-sm text-sky-100 leading-relaxed">
              Quy trình 2 bước tinh gọn: Chọn nhu cầu khám bệnh ➔ Chọn khung giờ phù hợp ➔ Xác nhận phiếu hẹn nhanh chóng.
            </p>
          </div>
        </div>

        {/* NẾU ĐẶT LỊCH THÀNH CÔNG -> HIỂN THỊ PHIẾU HẸN (CONFIRMATION RECEIPT) */}
        {successAppointment ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Đặt lịch khám thành công!
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Yêu cầu đặt lịch của bạn đã được tiếp nhận ở trạng thái{' '}
                <span className="font-bold text-amber-600">CHỜ TIẾP ĐÓN XÁC NHẬN (PENDING)</span>.
              </p>
            </div>

            {/* PHIẾU HẸN CHI TIẾT */}
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Mã Lịch Hẹn Khám
                  </div>
                  <div className="text-xl font-mono font-black text-sky-700">
                    {successAppointment.appointmentCode}
                  </div>
                </div>
                <Badge status="PENDING">Chờ Tiếp đón xác nhận</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-slate-400 font-medium">Bác sĩ phụ trách:</div>
                  <div className="font-bold text-slate-800 text-base">
                    {selectedSlotDoctor?.professionalTitle ? `${selectedSlotDoctor.professionalTitle} ` : ''}
                    {selectedSlotDoctor?.fullName || 'Bác sĩ chuyên khoa'}
                  </div>
                  <div className="text-sky-600 font-medium">
                    {selectedSlot?.specialtyName || selectedSlotDoctor?.specialtyName}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-medium">Phòng khám tiếp nhận:</div>
                  <div className="font-bold text-slate-800 text-base">
                    {selectedSlot?.roomName || `Phòng ${successAppointment.roomId}`}
                  </div>
                  <div className="text-slate-500">Tòa nhà Khám bệnh Bệnh viện HTAC</div>
                </div>

                <div>
                  <div className="text-slate-400 font-medium">Thời gian khám dự kiến:</div>
                  <div className="font-bold text-slate-800">
                    {formatTimeRange(successAppointment.startAt, successAppointment.endAt)}
                  </div>
                  <div className="text-slate-600 font-medium">
                    Ngày {new Date(successAppointment.startAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-medium">Thông tin người bệnh:</div>
                  <div className="font-bold text-slate-800">
                    {patientProfile?.fullName || user?.fullName || user?.username}
                  </div>
                  <div className="text-slate-500">
                    CCCD: {patientProfile?.citizenId || 'Đã liên kết'} | SĐT: {user?.phone || 'Đã lưu'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-400 font-medium">Lý do / Triệu chứng khám:</div>
                <div className="text-xs sm:text-sm text-slate-700 italic mt-0.5">
                  &ldquo;{reason}&rdquo;
                </div>
              </div>
            </div>

            {/* HƯỚNG DẪN KHI ĐẾN KHÁM */}
            <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 text-xs sm:text-sm text-sky-900 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Hướng dẫn quan trọng khi đến Bệnh viện:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sky-800 text-xs">
                <li>Nhân viên Tiếp đón sẽ gọi điện xác nhận lịch hẹn qua SĐT của bạn trong vòng 15–30 phút.</li>
                <li>Vui lòng có mặt tại <strong>Quầy Tiếp đón số 1</strong> trước giờ khám 15 phút.</li>
                <li>Mang theo thẻ CCCD gắn chip (hoặc ứng dụng VNeID) để quét mã lấy số thứ tự tự động.</li>
              </ul>
            </div>

            {/* HÀNH ĐỘNG SAU KHI ĐẶT */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                In phiếu hẹn
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => {
                    setSuccessAppointment(null);
                    setSelectedSlot(null);
                    setReason('');
                  }}
                >
                  Đặt lịch khám khác
                </Button>
                <Button variant="primary" onClick={() => navigate('/')}>
                  Về Trang chủ
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* GIAO DIỆN 2 BƯỚC TINH GỌN (KHÔNG CÒN CỘT BÊN PHẢI) */
          <div className="space-y-6">
            {/* THANH CHUYỂN TAB 1 VÀ TAB 2 (TAB 1 LÀ CHUYÊN KHOA) */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('by_specialty')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
                  bookingMode === 'by_specialty'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Stethoscope className="w-4 h-4" />
                <span>1. Đặt theo Chuyên khoa bệnh lý</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('by_doctor')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
                  bookingMode === 'by_doctor'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <User className="w-4 h-4" />
                <span>2. Đặt theo Bác sĩ chuyên khoa</span>
              </button>
            </div>

            {/* BƯỚC 1: LỰA CHỌN THEO TAB ĐANG CHỌN */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              {isLoadingDoctors ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span>Đang tải danh mục Bệnh viện...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: ĐẶT THEO CHUYÊN KHOA BỆNH LÝ (CHỈ CẦN CHỌN CHUYÊN KHOA) */}
                  {bookingMode === 'by_specialty' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Stethoscope className="w-5 h-5 text-sky-600" />
                          <span>Bước 1: Chọn Chuyên khoa bạn cần khám</span>
                          <span className="text-xs font-normal text-slate-500">
                            ({specialtyList.length} chuyên khoa)
                          </span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Bạn chỉ cần chọn Chuyên khoa phù hợp với nhu cầu. Hệ thống ở Bước 2 sẽ tự động đề xuất tất cả các ca khám của chuyên khoa đó.
                        </p>
                      </div>

                      {/* LƯỚI DANH SÁCH CHUYÊN KHOA */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {specialtyList.map((spec) => {
                          const isSelected = tab1SpecialtyId === spec.id;
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => {
                                setTab1SpecialtyId(spec.id);
                                setSelectedSlot(null);
                              }}
                              className={cn(
                                'p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-center min-h-[64px] relative group',
                                isSelected
                                  ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                              )}
                            >
                              {isSelected && (
                                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                              )}
                              <div className="text-xs sm:text-sm font-bold text-slate-900 pr-5 leading-snug">
                                {spec.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ĐẶT THEO BÁC SĨ (CÓ BỘ LỌC CHUYÊN KHOA & TÌM KIẾM BÁC SĨ) */}
                  {bookingMode === 'by_doctor' && (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-sky-600" />
                            <span>Bước 1: Chọn Bác sĩ chuyên khoa</span>
                            <span className="text-xs font-normal text-slate-500">
                              ({tab2FilteredDoctors.length} bác sĩ)
                            </span>
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Tìm kiếm bác sĩ bạn mong muốn để xem lịch làm việc chi tiết
                          </p>
                        </div>

                        {/* Ô TÌM KIẾM TÊN BÁC SĨ */}
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={tab2DoctorSearch}
                            onChange={(e) => setTab2DoctorSearch(e.target.value)}
                            placeholder="Tìm theo tên bác sĩ..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* BỘ LỌC CHUYÊN KHOA CHO TAB 2 (HIỂN THỊ ĐẦY ĐỦ 12 CHUYÊN KHOA VỚI FLEX-WRAP) */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                          <span>Lọc bác sĩ theo chuyên khoa ({specialtyList.length} chuyên khoa):</span>
                          {tab2FilterSpecialtyId !== null && (
                            <button
                              type="button"
                              onClick={() => setTab2FilterSpecialtyId(null)}
                              className="text-sky-600 hover:underline cursor-pointer font-medium"
                            >
                              Hiện tất cả 62 Bác sĩ
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setTab2FilterSpecialtyId(null)}
                            className={cn(
                              'text-xs py-2 px-3.5 rounded-xl border transition-all cursor-pointer font-medium',
                              tab2FilterSpecialtyId === null
                                ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                            )}
                          >
                            Tất cả ({doctors.length} BS)
                          </button>
                          {specialtyList.map((spec) => (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => setTab2FilterSpecialtyId(spec.id)}
                              className={cn(
                                'text-xs py-2 px-3.5 rounded-xl border transition-all cursor-pointer font-medium',
                                tab2FilterSpecialtyId === spec.id
                                  ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                              )}
                            >
                              {spec.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* DANH SÁCH THẺ BÁC SĨ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1 scrollbar-thin">
                        {tab2FilteredDoctors.map((doc) => {
                          const isSelected = tab2DoctorId === doc.userId;
                          return (
                            <div
                              key={doc.userId}
                              onClick={() => {
                                setTab2DoctorId(doc.userId);
                                setSelectedSlot(null);
                              }}
                              className={cn(
                                'p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative',
                                isSelected
                                  ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              )}
                            >
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                              )}
                              <img
                                src={resolveAvatarSrc(doc.avatarUrl) || ''}
                                alt={doc.fullName}
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150';
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {doc.professionalTitle ? `${doc.professionalTitle} ` : ''}
                                  {doc.fullName}
                                </div>
                                <div className="text-[11px] text-sky-600 font-medium truncate">
                                  {doc.specialtyName || 'Chuyên khoa'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {doc.practiceStartYear
                                    ? `${new Date().getFullYear() - doc.practiceStartYear} năm kinh nghiệm`
                                    : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BƯỚC 2: CHỌN NGÀY & KHUNG GIỜ KHÁM CÒN TRỐNG */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-600" />
                    <span>Bước 2: Chọn Ngày &amp; Khung giờ khám bệnh</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bookingMode === 'by_specialty'
                      ? 'Tất cả các ca khám của Chuyên khoa đã chọn'
                      : `Các ca khám của Bác sĩ: ${activeTab2Doctor?.fullName || 'Chưa chọn'}`}
                  </p>
                </div>

                {selectedSlot && (
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Đã chọn ca: <strong>{formatTimeRange(selectedSlot.startAt, selectedSlot.endAt)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* DẢI CHỌN NGÀY KHÁM TRONG TUẦN */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Chọn ngày khám:</div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {availableDays.map((day) => {
                    const isSelected = selectedDate === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        className={cn(
                          'shrink-0 flex flex-col items-center justify-center w-20 py-2.5 px-1 rounded-2xl border transition-all cursor-pointer',
                          isSelected
                            ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        )}
                      >
                        <span className="text-[10px] uppercase font-semibold">
                          {day.dayOfWeek}
                        </span>
                        <span className="text-sm font-extrabold mt-0.5">{day.label}</span>
                        {day.isToday && (
                          <span
                            className={cn(
                              'text-[9px] font-bold mt-0.5',
                              isSelected ? 'text-sky-200' : 'text-sky-600'
                            )}
                          >
                            Hôm nay
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LƯỚI KHUNG GIỜ KHÁM (SLOTS GRID) */}
              <div className="space-y-5 pt-3 border-t border-slate-100">
                {isLoadingSlots ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                    <span>Đang tìm kiếm các ca khám còn trống...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-semibold text-slate-700">
                      Không có khung giờ khám khả dụng trong ngày này
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Hiện tại chưa có ca khám mở hoặc đã hết chỗ trong ngày này. Vui lòng chọn ngày khác trong tuần.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* BUỔI SÁNG */}
                    {morningSlots.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>Buổi Sáng (08:00 – 12:00)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {morningSlots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            const isFull = slot.available <= 0;
                            const doc = doctorLookup.get(slot.doctorId);

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={isFull}
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group',
                                  isFull
                                    ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 shadow-2xs'
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                                    <Check className="w-2 h-2" />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                    {formatTimeRange(slot.startAt, slot.endAt)}
                                  </div>
                                  <div className="text-[11px] font-semibold text-sky-700 truncate">
                                    {doc ? `${doc.professionalTitle ? `${doc.professionalTitle} ` : ''}${doc.fullName}` : 'Bác sĩ phụ trách'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {slot.roomName} • {slot.specialtyName}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      isFull ? 'text-slate-400' : 'text-emerald-600'
                                    )}
                                  >
                                    {isFull ? 'Hết chỗ' : `Còn ${slot.available} chỗ`}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BUỔI CHIỀU */}
                    {afternoonSlots.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          <span>Buổi Chiều (13:30 – 17:00)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {afternoonSlots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            const isFull = slot.available <= 0;
                            const doc = doctorLookup.get(slot.doctorId);

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={isFull}
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group',
                                  isFull
                                    ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 shadow-2xs'
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                                    <Check className="w-2 h-2" />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                    {formatTimeRange(slot.startAt, slot.endAt)}
                                  </div>
                                  <div className="text-[11px] font-semibold text-sky-700 truncate">
                                    {doc ? `${doc.professionalTitle ? `${doc.professionalTitle} ` : ''}${doc.fullName}` : 'Bác sĩ phụ trách'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {slot.roomName} • {slot.specialtyName}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      isFull ? 'text-slate-400' : 'text-emerald-600'
                                    )}
                                  >
                                    {isFull ? 'Hết chỗ' : `Còn ${slot.available} chỗ`}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NÚT TIẾP TỤC: XUẤT HIỆN Ở CUỐI BƯỚC 2 */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  {selectedSlot ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Bạn đã chọn ca khám {formatTimeRange(selectedSlot.startAt, selectedSlot.endAt)} ngày{' '}
                      {new Date(selectedSlot.startAt).toLocaleDateString('vi-VN')}
                    </span>
                  ) : (
                    <span>Vui lòng chọn 1 khung giờ khám còn chỗ để tiếp tục điền thông tin</span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={!selectedSlot}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleOpenConfirmModal}
                  className="w-full sm:w-auto h-12 px-8 font-bold shadow-md shadow-sky-600/20 text-sm"
                >
                  Tiếp tục
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PHIẾU ĐĂNG KÝ KHÁM BỆNH (HIỆN RA KHI BẤM "TIẾP TỤC") */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Phiếu Đăng Ký Khám Bệnh"
          description="Vui lòng kiểm tra lại thông tin ca khám và nhập lý do/triệu chứng để bác sĩ chuẩn bị trước."
          size="lg"
        >
          {selectedSlot && (
            <form onSubmit={handleConfirmBooking} className="space-y-6 pt-2">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* THẺ TÓM TẮT THÔNG TIN LỊCH KHÁM ĐÃ CHỌN */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center justify-between">
                  <span>Thông tin ca khám đã thiết lập</span>
                  <Badge status="ACTIVE">Hợp lệ</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Chuyên khoa:</span>
                    <span className="font-bold text-sky-700 text-sm">
                      {selectedSlot.specialtyName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Bác sĩ phụ trách:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedSlotDoctor?.professionalTitle ? `${selectedSlotDoctor.professionalTitle} ` : ''}
                      {selectedSlotDoctor?.fullName || 'Bác sĩ chuyên khoa'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Thời gian khám:</span>
                    <span className="font-bold text-slate-800">
                      {formatTimeRange(selectedSlot.startAt, selectedSlot.endAt)} • Ngày{' '}
                      {new Date(selectedSlot.startAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Phòng khám tiếp nhận:</span>
                    <span className="font-bold text-slate-800">
                      {selectedSlot.roomName} (Bệnh viện HTAC)
                    </span>
                  </div>
                </div>

                {/* THÔNG TIN BỆNH NHÂN */}
                <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Người đi khám: </span>
                    <span className="font-bold text-slate-900">
                      {patientProfile?.fullName || user?.fullName || user?.username}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Số điện thoại: </span>
                    <span className="font-bold text-slate-900">
                      {user?.phone || 'Chưa lưu'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Số CCCD: </span>
                    <span className="font-bold text-slate-900">
                      {patientProfile?.citizenId || 'Đã liên kết'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CUỐI PHIẾU: Ô NHẬP LÝ DO KHÁM */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Lý do khám / Triệu chứng lâm sàng (*)
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả tóm tắt triệu chứng bạn đang gặp phải (ví dụ: đau ngực, khó thở khi gắng sức, tái khám định kỳ...)"
                  className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent leading-relaxed"
                  maxLength={3000}
                  required
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Bắt buộc nhập để bác sĩ chuẩn bị trước bệnh án</span>
                  <span>{reason.length}/3000 ký tự</span>
                </div>

                {/* GỢI Ý TRIỆU CHỨNG NHANH */}
                <div className="pt-1">
                  <div className="text-[10px] font-semibold text-slate-400 mb-1">
                    Gợi ý triệu chứng nhanh:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Khám sức khỏe tổng quát',
                      'Đau đầu, chóng mặt',
                      'Kiểm tra huyết áp',
                      'Tái khám định kỳ theo hẹn',
                      'Khó chịu, mệt mỏi kéo dài',
                    ].map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => handleQuickReason(text)}
                        className="text-[10px] py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      >
                        + {text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* HÀNH ĐỘNG DƯỚI MODAL */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Quay lại chỉnh sửa
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="font-bold shadow-md shadow-sky-600/20 px-6"
                >
                  Xác nhận Đặt lịch khám ngay
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};
