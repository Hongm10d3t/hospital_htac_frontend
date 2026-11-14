import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  bookingService,
  type AppointmentDetailResponse,
  type AppointmentStatus,
} from '../../services/bookingService';
import {
  publicDoctorService,
  type DoctorPublicResponse,
} from '../../services/publicDoctorService';
import {
  patientAuthService,
  type PatientProfileResponse,
} from '../../services/patientAuthService';
import { resolveAvatarSrc, cn } from '../../lib/utils';
import {
  Activity,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  CalendarCheck,
  Printer,
  RotateCcw,
  Plus,
  Loader2,
  Building2,
  PhoneCall,
  Info,
  CalendarDays,
  XCircle,
} from 'lucide-react';

/**
 * Trang Quản lý Lịch hẹn & Theo dõi Trạng thái Khám bệnh Cá nhân (F02.05)
 * Kết nối:
 * - GET /api/v1/appointments (danh sách lịch cá nhân của PATIENT)
 * - GET /api/v1/appointments/{id} (chi tiết lịch hẹn)
 */
export const PatientAppointmentsPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, hospitalConfig } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [appointments, setAppointments] = useState<AppointmentDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');

  // Danh mục bác sĩ để map tên, học vị và ảnh
  const [doctors, setDoctors] = useState<DoctorPublicResponse[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfileResponse | null>(null);

  // Modal xem chi tiết / in phiếu hẹn
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetailResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modal hỗ trợ liên hệ hủy hẹn
  const [isCancelGuideModalOpen, setIsCancelGuideModalOpen] = useState(false);
  const [cancelTargetApt, setCancelTargetApt] = useState<AppointmentDetailResponse | null>(null);

  // 1. Kiểm tra xác thực: Chưa đăng nhập -> Chuyển hướng sang /login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.info('Vui lòng đăng nhập để xem danh sách lịch hẹn của bạn.');
      navigate('/login', {
        state: { from: { pathname: '/patient/appointments' } },
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // Map tra cứu nhanh bác sĩ
  const doctorLookup = useMemo(() => {
    return new Map<number, DoctorPublicResponse>(doctors.map((d) => [d.userId, d]));
  }, [doctors]);

  // Nạp danh sách lịch hẹn của bệnh nhân
  const loadAppointments = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await bookingService.getMyAppointments({ size: 100, sort: 'createdAt,DESC' });
      setAppointments(res.items || []);
    } catch (err) {
      console.warn('[PatientAppointmentsPage] Lỗi tải lịch hẹn:', err);
      toast.error('Không thể tải danh sách lịch hẹn của bạn.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Nạp dữ liệu ban đầu
  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();

      // Nạp danh mục bác sĩ
      publicDoctorService
        .listDoctors({ size: 100 })
        .then((res) => setDoctors(res.items || []))
        .catch(console.warn);

      // Nạp hồ sơ bệnh nhân
      patientAuthService
        .getMyPatientProfile()
        .then(setPatientProfile)
        .catch(console.warn);
    }
  }, [isAuthenticated, loadAppointments]);

  // Thống kê nhanh số lượng theo trạng thái
  const stats = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let completed = 0;
    let notCompleted = 0;

    appointments.forEach((a) => {
      if (a.status === 'PENDING') pending++;
      else if (a.status === 'CONFIRMED') confirmed++;
      else if (a.status === 'COMPLETED') completed++;
      else if (a.status === 'NOT_COMPLETED') notCompleted++;
    });

    return { total: appointments.length, pending, confirmed, completed, notCompleted };
  }, [appointments]);

  // Danh sách lịch hẹn sau khi lọc theo tab
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'ALL') return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  // Format giờ từ ISO string ("08:00 – 08:30")
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    return `${sh}:${sm} – ${eh}:${em}`;
  };

  // Mở modal xem phiếu hẹn chi tiết
  const handleOpenDetail = (apt: AppointmentDetailResponse) => {
    setSelectedAppointment(apt);
    setIsDetailModalOpen(true);
  };

  // Mở modal hướng dẫn hủy hẹn
  const handleOpenCancelGuide = (apt: AppointmentDetailResponse) => {
    setCancelTargetApt(apt);
    setIsCancelGuideModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-sm font-medium">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  const selectedDoctor = selectedAppointment ? doctorLookup.get(selectedAppointment.doctorId) : null;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 antialiased selection:bg-sky-100 selection:text-sky-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. HEADER TRANG LỊCH HẸN */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarCheck className="w-7 h-7 text-sky-600" />
              <span>Lịch hẹn Khám bệnh của Tôi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Theo dõi tiến trình xác nhận, thời gian đến khám và quản lý các phiếu hẹn tại Bệnh viện HTAC.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Activity className="w-4 h-4 text-sky-600" />}
              onClick={() => navigate('/patient/history')}
              className="border-slate-200 hover:bg-sky-50 text-sky-700 font-semibold"
            >
              Sổ sức khỏe
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={loadAppointments}
              isLoading={isLoading}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/booking')}
              className="shadow-md shadow-sky-600/20 font-bold"
            >
              Đặt lịch khám mới
            </Button>
          </div>
        </div>

        {/* 2. THẺ THỐNG KÊ NHANH (STAT CARDS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer',
              statusFilter === 'ALL'
                ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="text-xs font-semibold text-slate-500">Tổng số lịch hẹn</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>

          <div
            onClick={() => setStatusFilter('PENDING')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer',
              statusFilter === 'PENDING'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="text-xs font-semibold text-amber-700">Chờ tiếp đón xác nhận</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</div>
          </div>

          <div
            onClick={() => setStatusFilter('CONFIRMED')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer',
              statusFilter === 'CONFIRMED'
                ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="text-xs font-semibold text-sky-700">Đã xác nhận hẹn</div>
            <div className="text-2xl font-black text-sky-600 mt-1">{stats.confirmed}</div>
          </div>

          <div
            onClick={() => setStatusFilter('COMPLETED')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer',
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="text-xs font-semibold text-emerald-700">Đã hoàn tất khám</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.completed}</div>
          </div>
        </div>

        {/* 3. BỘ LỌC THEO TAB TRẠNG THÁI */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: `Tất cả (${stats.total})` },
            { id: 'PENDING', label: `Chờ xác nhận (${stats.pending})` },
            { id: 'CONFIRMED', label: `Đã xác nhận (${stats.confirmed})` },
            { id: 'COMPLETED', label: `Đã khám xong (${stats.completed})` },
            { id: 'NOT_COMPLETED', label: `Đã hủy / Không đến (${stats.notCompleted})` },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as 'ALL' | AppointmentStatus)}
                className={cn(
                  'text-xs py-2 px-3.5 rounded-xl border transition-all cursor-pointer font-medium',
                  isSelected
                    ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 4. DANH SÁCH LỊCH HẸN (APPOINTMENT CARDS) */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span>Đang tải danh sách lịch hẹn của bạn...</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          /* TRẠNG THÁI RỖNG (EMPTY STATE) */
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mx-auto">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Chưa có lịch hẹn nào phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter === 'ALL'
                  ? 'Bạn chưa đăng ký lịch khám bệnh nào trên hệ thống. Hãy đặt lịch ngay để được phục vụ tốt nhất!'
                  : 'Không có lịch hẹn nào thuộc trạng thái này.'}
              </p>
            </div>
            {statusFilter === 'ALL' && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => navigate('/booking')}
                  className="font-bold shadow-md shadow-sky-600/20"
                >
                  Đặt lịch khám ngay
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* DANH SÁCH THẺ LỊCH HẸN */
          <div className="space-y-4">
            {filteredAppointments.map((apt) => {
              const doc = doctorLookup.get(apt.doctorId);
              const appointmentDate = new Date(apt.startAt);

              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-4"
                >
                  {/* HEADER THẺ: MÃ HẸN & BADGE TRẠNG THÁI */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Mã Lịch Hẹn
                        </div>
                        <div className="font-mono font-black text-sky-700 text-sm sm:text-base">
                          {apt.appointmentCode}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge status={apt.status} />
                    </div>
                  </div>

                  {/* THÔNG TIN CHI TIẾT CA KHÁM */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {/* CỘT 1: THỜI GIAN KHÁM */}
                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        <span>Thời gian khám dự kiến:</span>
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {formatTimeRange(apt.startAt, apt.endAt)}
                      </div>
                      <div className="text-slate-600 font-semibold">
                        Ngày {appointmentDate.toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    {/* CỘT 2: BÁC SĨ PHỤ TRÁCH */}
                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-sky-500" />
                        <span>Bác sĩ phụ trách:</span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        {resolveAvatarSrc(doc?.avatarUrl) ? (
                          <img
                            src={resolveAvatarSrc(doc?.avatarUrl)!}
                            alt={doc?.fullName || 'Bác sĩ'}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : null}
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}
                            {doc?.fullName || 'Bác sĩ chuyên khoa'}
                          </div>
                          <div className="text-sky-600 font-medium">
                            {doc?.specialtyName || 'Chuyên khoa bệnh viện'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CỘT 3: PHÒNG KHÁM TIẾP NHẬN */}
                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-sky-500" />
                        <span>Phòng khám tiếp nhận:</span>
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        Phòng số {apt.roomId}
                      </div>
                      <div className="text-slate-500">Tòa nhà Khám bệnh HTAC</div>
                    </div>
                  </div>

                  {/* LÝ DO ĐÓNG/HỦY HẸN (NẾU NOT_COMPLETED) */}
                  {apt.status === 'NOT_COMPLETED' && apt.nonCompletionReason && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">Lý do đóng / Hủy lịch hẹn: </span>
                        <span>{apt.nonCompletionReason}</span>
                      </div>
                    </div>
                  )}

                  {/* THÔNG BÁO TIẾP ĐÓN XÁC NHẬN (NẾU PENDING / CONFIRMED) */}
                  {apt.status === 'PENDING' && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Nhân viên Tiếp đón sẽ gọi điện qua SĐT của bạn để xác nhận lịch hẹn trong thời gian sớm nhất.
                      </span>
                    </div>
                  )}

                  {apt.status === 'CONFIRMED' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Lịch hẹn đã được xác nhận! Vui lòng có mặt trước giờ hẹn 15 phút tại Quầy Tiếp đón số 1.
                      </span>
                    </div>
                  )}

                  {/* HÀNH ĐỘNG DƯỚI THẺ */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="text-slate-400">
                      {apt.confirmedAt ? (
                        <span>Xác nhận lúc: {new Date(apt.confirmedAt).toLocaleString('vi-VN')}</span>
                      ) : (
                        <span>Lịch hẹn trực tuyến</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Nút hướng dẫn hủy/đổi lịch nếu PENDING hoặc CONFIRMED */}
                      {(apt.status === 'PENDING' || apt.status === 'CONFIRMED') && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancelGuide(apt)}
                          className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 font-semibold transition-colors cursor-pointer"
                        >
                          Hủy / Đổi lịch
                        </button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenDetail(apt)}
                      >
                        Xem phiếu / In
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL 1: XEM CHI TIẾT & IN PHIẾU HẸN (PRINTABLE APPOINTMENT SLIP) */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Phiếu Hẹn Khám Bệnh Trực Tuyến"
          description="Vui lòng lưu lại thông tin hoặc in phiếu để xuất trình khi đến làm thủ tục tại bệnh viện."
          size="lg"
        >
          {selectedAppointment && (
            <div className="space-y-6 pt-2">
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300 space-y-5">
                {/* Header phiếu khám với Logo bệnh viện */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={hospitalConfig?.logoUrl || '/logo.png'}
                      alt="Logo Bệnh viện"
                      className="h-10 w-auto max-w-[120px] object-contain rounded-md bg-white p-0.5 border border-slate-200"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm tracking-tight">
                        {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Hotline: {hospitalConfig?.phone || '1900 6868'} • {hospitalConfig?.address || 'Hà Nội'}
                      </div>
                    </div>
                  </div>
                  <Badge status={selectedAppointment.status} />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mã Lịch Hẹn
                    </div>
                    <div className="text-xl font-mono font-black text-sky-700">
                      {selectedAppointment.appointmentCode}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <div className="text-slate-400 font-medium">Bác sĩ phụ trách:</div>
                    <div className="font-bold text-slate-900 text-base">
                      {selectedDoctor?.professionalTitle ? `${selectedDoctor.professionalTitle} ` : ''}
                      {selectedDoctor?.fullName || 'Bác sĩ chuyên khoa'}
                    </div>
                    <div className="text-sky-600 font-medium">
                      {selectedDoctor?.specialtyName || 'Chuyên khoa bệnh viện'}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-medium">Phòng khám tiếp nhận:</div>
                    <div className="font-bold text-slate-900 text-base">
                      Phòng khám số {selectedAppointment.roomId}
                    </div>
                    <div className="text-slate-500">Tòa nhà Khám bệnh Bệnh viện HTAC</div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-medium">Thời gian khám:</div>
                    <div className="font-bold text-slate-900">
                      {formatTimeRange(selectedAppointment.startAt, selectedAppointment.endAt)}
                    </div>
                    <div className="text-slate-600 font-medium">
                      Ngày {new Date(selectedAppointment.startAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-medium">Thông tin người bệnh:</div>
                    <div className="font-bold text-slate-900">
                      {patientProfile?.fullName || user?.fullName || user?.username}
                    </div>
                    <div className="text-slate-500">
                      CCCD: {patientProfile?.citizenId || 'Đã đối chiếu'} | SĐT: {user?.phone || 'Đã lưu'}
                    </div>
                  </div>
                </div>

                {selectedAppointment.nonCompletionReason && (
                  <div className="pt-3 border-t border-slate-200 text-xs">
                    <span className="text-slate-400 font-medium">Ghi chú kết thúc: </span>
                    <span className="text-slate-700 font-semibold">{selectedAppointment.nonCompletionReason}</span>
                  </div>
                )}
              </div>

              {/* HƯỚNG DẪN KHI ĐẾN KHÁM */}
              <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 text-xs text-sky-900 space-y-1.5">
                <div className="font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-600" />
                  <span>Chỉ dẫn khám bệnh:</span>
                </div>
                <p>• Có mặt tại <strong>Quầy Tiếp đón số 1</strong> trước giờ khám 15 phút.</p>
                <p>• Mang theo thẻ CCCD gắn chip để nhân viên đối chiếu và cấp số thứ tự vào phòng.</p>
              </div>

              {/* NÚT THAO TÁC TRONG MODAL */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => window.print()}
                >
                  In phiếu hẹn này
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL 2: HƯỚNG DẪN HỦY / ĐỔI LỊCH HẸN */}
        <Modal
          isOpen={isCancelGuideModalOpen}
          onClose={() => setIsCancelGuideModalOpen(false)}
          title="Hủy hoặc Thay Đổi Lịch Khám"
          description="Hướng dẫn quy trình hủy lịch hẹn trực tuyến an toàn theo tiêu chuẩn bệnh viện."
          size="md"
        >
          {cancelTargetApt && (
            <div className="space-y-4 pt-1 text-xs sm:text-sm text-slate-700">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-amber-600" />
                  <span>Quy trình hủy lịch hẹn:</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Để đảm bảo tính liên tục trong việc phân bổ ca khám và nhường suất khám cho các bệnh nhân khác, việc hủy lịch hẹn trực tuyến cần được nhân viên Tiếp đón ghi nhận lý do vào hệ thống.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Bạn có thể chọn 1 trong 2 cách sau:</div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-sky-700">Cách 1: Gọi điện thoại lên Tổng đài</span>
                  <p className="text-slate-600">
                    Gọi Hotline:{' '}
                    <a
                      href={`tel:${hospitalConfig?.phone || '1900-8888'}`}
                      className="font-bold text-sky-600 hover:underline"
                    >
                      {hospitalConfig?.phone || '1900-8888'}
                    </a>{' '}
                    và đọc Mã lịch hẹn <strong className="font-mono text-slate-900">{cancelTargetApt.appointmentCode}</strong> để được hỗ trợ hủy hoặc đổi sang ca khác.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-sky-700">Cách 2: Thông báo khi Tiếp đón gọi xác nhận</span>
                  <p className="text-slate-600">
                    Khi nhân viên tiếp đón gọi điện thoại xác nhận lịch hẹn trước ngày khám, bạn có thể thông báo hủy trực tiếp với nhân viên.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button variant="primary" onClick={() => setIsCancelGuideModalOpen(false)}>
                  Tôi đã hiểu
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
