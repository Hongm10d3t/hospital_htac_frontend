import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  receptionAppointmentService,
  type ReceptionAppointmentResponse,
  type ReceptionAppointmentStatus,
  type CheckinVisitResponse,
} from '../../services/receptionAppointmentService';
import {
  publicDoctorService,
  type DoctorPublicResponse,
} from '../../services/publicDoctorService';
import {
  clinicDirectoryService,
  type ClinicRoomResponse,
} from '../../services/clinicDirectoryService';
import { resolveAvatarSrc, cn } from '../../lib/utils';
import {
  CalendarCheck,
  Calendar,
  Clock,
  PhoneCall,
  Search,
  CheckCircle2,
  Copy,
  RefreshCw,
  UserCheck,
  Building2,
  Eye,
  Printer,
  Check,
} from 'lucide-react';

/**
 * F03.01 — Quản lý & Xác nhận Lịch hẹn Online (Appointment Confirmation)
 * Phân hệ Tiếp đón (Receptionist Portal)
 * Kết nối các API:
 * - GET /api/v1/reception/appointments
 * - POST /api/v1/reception/appointments/{id}/confirm
 * - POST /api/v1/reception/appointments/{id}/not-complete
 * - POST /api/v1/reception/visits/appointments/{id} (Tiếp nhận trực tiếp vào hàng đợi)
 */
export const ReceptionAppointmentsPage: React.FC = () => {
  const toast = useToast();

  // Danh sách lịch hẹn
  const [appointments, setAppointments] = useState<ReceptionAppointmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Mặc định là ngày hôm nay (YYYY-MM-DD theo giờ địa phương)
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Dữ liệu danh mục để hiển thị tên bác sĩ và phòng khám
  const [doctors, setDoctors] = useState<DoctorPublicResponse[]>([]);
  const [rooms, setRooms] = useState<ClinicRoomResponse[]>([]);

  // Thao tác Đóng lịch hẹn / Báo vắng mặt
  const [closingAppointment, setClosingAppointment] =
    useState<ReceptionAppointmentResponse | null>(null);
  const [closeReason, setCloseReason] = useState<string>('');
  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);
  const [isSubmittingClose, setIsSubmittingClose] = useState<boolean>(false);

  // Thao tác Tiếp nhận vào khám (Check-in)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState<boolean>(false);
  const [checkinSuccessVisit, setCheckinSuccessVisit] = useState<{
    visit: CheckinVisitResponse;
    appointment: ReceptionAppointmentResponse;
  } | null>(null);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState<boolean>(false);

  // Modal Chi tiết Lịch hẹn
  const [selectedDetail, setSelectedDetail] =
    useState<ReceptionAppointmentResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Trạng thái sao chép SĐT
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // 1. Tải danh mục Bác sĩ và Phòng khám
  useEffect(() => {
    Promise.all([
      publicDoctorService.listDoctors({ size: 100 }),
      clinicDirectoryService.listClinicRooms({ size: 100 }),
    ])
      .then(([docsRes, roomsRes]) => {
        setDoctors(docsRes.items);
        setRooms(roomsRes.items);
      })
      .catch((err) => {
        console.warn('[ReceptionAppointments] Lỗi tải danh mục tham chiếu:', err);
      });
  }, []);

  const doctorLookup = useMemo(() => {
    const map = new Map<number, DoctorPublicResponse>();
    doctors.forEach((d) => map.set(d.userId, d));
    return map;
  }, [doctors]);

  const roomLookup = useMemo(() => {
    const map = new Map<number, ClinicRoomResponse>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  // 2. Tải danh sách lịch hẹn từ backend
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await receptionAppointmentService.getAppointments({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as ReceptionAppointmentStatus),
        date: selectedDate || undefined,
        size: 100,
        sort: 'createdAt,DESC',
      });
      setAppointments(res.items);
    } catch (err) {
      toast.error('Không thể tải danh sách lịch hẹn trực tuyến.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, selectedDate, toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAppointments();
  };

  // 3. Thao tác Xác nhận lịch hẹn (PENDING -> CONFIRMED)
  const handleConfirm = async (apt: ReceptionAppointmentResponse) => {
    try {
      await receptionAppointmentService.confirmAppointment(apt.appointment.id);
      toast.success(`Đã xác nhận lịch hẹn ${apt.appointment.appointmentCode} thành công!`);
      // Cập nhật trạng thái tại chỗ
      setAppointments((prev) =>
        prev.map((item) =>
          item.appointment.id === apt.appointment.id
            ? {
                ...item,
                appointment: {
                  ...item.appointment,
                  status: 'CONFIRMED',
                  confirmedAt: new Date().toISOString(),
                },
              }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xác nhận lịch hẹn.');
    }
  };

  // 4. Mở modal Đóng lịch hẹn / Báo không đến
  const handleOpenCloseModal = (apt: ReceptionAppointmentResponse) => {
    setClosingAppointment(apt);
    setCloseReason('Bệnh nhân báo hủy hẹn qua điện thoại');
    setIsClosingModalOpen(true);
  };

  const handleConfirmClose = async () => {
    if (!closingAppointment) return;
    if (!closeReason.trim()) {
      toast.warning('Vui lòng nhập lý do không hoàn thành lịch hẹn.');
      return;
    }

    setIsSubmittingClose(true);
    try {
      await receptionAppointmentService.notCompleteAppointment(
        closingAppointment.appointment.id,
        closeReason.trim()
      );
      toast.success(
        `Đã đóng lịch hẹn ${closingAppointment.appointment.appointmentCode} trạng thái Không đến khám.`
      );
      setIsClosingModalOpen(false);
      // Cập nhật tại chỗ
      setAppointments((prev) =>
        prev.map((item) =>
          item.appointment.id === closingAppointment.appointment.id
            ? {
                ...item,
                appointment: {
                  ...item.appointment,
                  status: 'NOT_COMPLETED',
                  closedAt: new Date().toISOString(),
                  nonCompletionReason: closeReason.trim(),
                },
              }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi đóng lịch hẹn.');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // 5. Thao tác Tiếp nhận vào khám (Check-in & Queuing)
  const handleCheckin = async (apt: ReceptionAppointmentResponse) => {
    setIsSubmittingCheckin(true);
    try {
      const visit = await receptionAppointmentService.checkinAppointment(apt.appointment.id);
      setCheckinSuccessVisit({ visit, appointment: apt });
      setIsCheckinModalOpen(true);
      toast.success(
        `Tiếp nhận thành công! Số thứ tự khám: #${visit.queueNumber} tại Phòng số ${visit.roomId}.`
      );
      // Reload danh sách để cập nhật trạng thái mới nhất
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Không thể tiếp nhận lịch hẹn này vào hàng đợi khám.');
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  // 6. Sao chép số điện thoại
  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.info(`Đã sao chép SĐT: ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // 7. Lọc theo từ khóa tìm kiếm (Mã hẹn, Tên, SĐT)
  const filteredAppointments = useMemo(() => {
    if (!searchKeyword.trim()) return appointments;
    const kw = searchKeyword.trim().toLowerCase();
    return appointments.filter((item) => {
      const codeMatch = item.appointment.appointmentCode.toLowerCase().includes(kw);
      const nameMatch = item.patientName.toLowerCase().includes(kw);
      const phoneMatch = item.phone.toLowerCase().includes(kw);
      const reasonMatch = item.reason ? item.reason.toLowerCase().includes(kw) : false;
      return codeMatch || nameMatch || phoneMatch || reasonMatch;
    });
  }, [appointments, searchKeyword]);

  // 8. Thống kê theo trạng thái của ngày đang xem
  const metrics = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.appointment.status === 'PENDING').length;
    const confirmed = appointments.filter((a) => a.appointment.status === 'CONFIRMED').length;
    const completed = appointments.filter((a) => a.appointment.status === 'COMPLETED').length;
    const notCompleted = appointments.filter((a) => a.appointment.status === 'NOT_COMPLETED').length;
    return { total, pending, confirmed, completed, notCompleted };
  }, [appointments]);

  // Format giờ ca khám
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    return `${sh}:${sm} – ${eh}:${em}`;
  };

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* 1. HEADER NGHIỆP VỤ TIẾP ĐÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold mb-1">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Phân hệ Nghiệp vụ Tiếp đón Bệnh nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-8 h-8 text-sky-600" />
            <span>Quản Lý Lịch Hẹn Trực Tuyến</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Xác nhận các yêu cầu đặt hẹn online, liên hệ người bệnh và tiếp nhận vào hàng đợi khám bệnh.
          </p>
        </div>

        {/* CỤM CHỌN NGÀY & LÀM MỚI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút nhanh: Hôm nay */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              setSelectedDate(`${year}-${month}-${day}`);
            }}
            className={cn(
              'text-xs font-semibold',
              selectedDate === new Date().toISOString().split('T')[0] && 'bg-sky-50 border-sky-300 text-sky-700'
            )}
          >
            Hôm nay
          </Button>

          {/* Nút: Tất cả các ngày */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate('')}
            className={cn('text-xs font-semibold', !selectedDate && 'bg-sky-50 border-sky-300 text-sky-700')}
          >
            Mọi ngày
          </Button>

          {/* Ô chọn ngày cụ thể */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="outline-none bg-transparent text-xs font-medium text-slate-700"
              title="Chọn ngày khám"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />}
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="shadow-xs font-bold"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* 2. CHỈ SỐ THỐNG KÊ (METRICS CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* TỔNG CỘNG */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs',
            statusFilter === 'ALL'
              ? 'bg-slate-900 border-slate-900 text-white shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300'
          )}
        >
          <div className="text-xs font-medium opacity-80">Tổng lịch hẹn</div>
          <div className="text-2xl font-black mt-1">{metrics.total}</div>
        </button>

        {/* CHỜ XÁC NHẬN (PENDING) */}
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs',
            statusFilter === 'PENDING'
              ? 'bg-amber-500 border-amber-500 text-white shadow-md'
              : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50/50'
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Cần gọi xác nhận</span>
            {metrics.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black mt-1">{metrics.pending}</div>
        </button>

        {/* ĐÃ XÁC NHẬN (CONFIRMED) */}
        <button
          type="button"
          onClick={() => setStatusFilter('CONFIRMED')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs',
            statusFilter === 'CONFIRMED'
              ? 'bg-sky-600 border-sky-600 text-white shadow-md'
              : 'bg-white border-sky-200 text-sky-900 hover:bg-sky-50/50'
          )}
        >
          <div className="text-xs font-bold">Đã xác nhận (Chờ đến)</div>
          <div className="text-2xl font-black mt-1">{metrics.confirmed}</div>
        </button>

        {/* ĐÃ HOÀN THÀNH (COMPLETED) */}
        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs',
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
              : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-50/50'
          )}
        >
          <div className="text-xs font-bold">Đã khám xong</div>
          <div className="text-2xl font-black mt-1">{metrics.completed}</div>
        </button>

        {/* KHÔNG ĐẾN / HỦY (NOT_COMPLETED) */}
        <button
          type="button"
          onClick={() => setStatusFilter('NOT_COMPLETED')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs',
            statusFilter === 'NOT_COMPLETED'
              ? 'bg-slate-600 border-slate-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          )}
        >
          <div className="text-xs font-medium">Vắng mặt / Hủy</div>
          <div className="text-2xl font-black mt-1">{metrics.notCompleted}</div>
        </button>
      </div>

      {/* 3. THANH TÌM KIẾM & BỘ LỌC TABS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* TABS TRẠNG THÁI */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'ALL', label: `Tất cả (${metrics.total})` },
            { id: 'PENDING', label: `Chờ xác nhận (${metrics.pending})` },
            { id: 'CONFIRMED', label: `Đã xác nhận (${metrics.confirmed})` },
            { id: 'COMPLETED', label: `Đã khám (${metrics.completed})` },
            { id: 'NOT_COMPLETED', label: `Vắng mặt / Hủy (${metrics.notCompleted})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'text-xs py-1.5 px-3 rounded-xl border transition-all cursor-pointer font-medium',
                statusFilter === tab.id
                  ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ô TÌM KIẾM NHANH */}
        <div className="w-full md:w-80">
          <Input
            id="reception-apt-search"
            type="text"
            placeholder="Tìm theo Mã hẹn, Tên, SĐT, lý do..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH LỊCH HẸN TRỰC TUYẾN */}
      {isLoading ? (
        <div className="py-24 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <span>Đang tải danh sách lịch hẹn tiếp đón...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy lịch hẹn nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có lượt đăng ký khám nào phù hợp với bộ lọc ngày và trạng thái hiện tại.
            </p>
          </div>
          {searchKeyword && (
            <Button variant="outline" size="sm" onClick={() => setSearchKeyword('')}>
              Xóa từ khóa tìm kiếm
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Mã Lịch Hẹn</th>
                  <th className="py-3.5 px-4">Bệnh Nhân &amp; Liên Hệ</th>
                  <th className="py-3.5 px-4">Giờ Khám &amp; Ngày</th>
                  <th className="py-3.5 px-4">Bác Sĩ &amp; Phòng</th>
                  <th className="py-3.5 px-4">Lý Do Khám</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác Nghiệp Vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((item) => {
                  const apt = item.appointment;
                  const doc = doctorLookup.get(apt.doctorId);
                  const room = roomLookup.get(apt.roomId);
                  const isPending = apt.status === 'PENDING';
                  const isConfirmed = apt.status === 'CONFIRMED';
                  const appointmentDate = new Date(apt.startAt);
                  const isToday = appointmentDate.toLocaleDateString('vi-VN') === new Date().toLocaleDateString('vi-VN');

                  return (
                    <tr
                      key={apt.id}
                      className={cn(
                        'hover:bg-slate-50/80 transition-colors',
                        isPending && 'bg-amber-50/20'
                      )}
                    >
                      {/* CỘT 1: MÃ HẸN */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-black text-sky-800 text-sm">
                          {apt.appointmentCode}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">ID: #{apt.id}</div>
                      </td>

                      {/* CỘT 2: BỆNH NHÂN & LIÊN HỆ */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {item.patientName}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <a
                            href={`tel:${item.phone}`}
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-bold hover:underline"
                            title="Bấm để gọi điện thoại"
                          >
                            <PhoneCall className="w-3 h-3 text-sky-500" />
                            <span>{item.phone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(item.phone, e)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Sao chép SĐT"
                          >
                            {copiedPhone === item.phone ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* CỘT 3: GIỜ KHÁM & NGÀY */}
                      <td className="py-3.5 px-4 align-top space-y-0.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1 text-sm">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>{formatTimeRange(apt.startAt, apt.endAt)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Ngày {appointmentDate.toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* CỘT 4: BÁC SĨ & PHÒNG KHÁM */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="flex items-center gap-2">
                          {doc?.avatarUrl ? (
                            <img
                              src={resolveAvatarSrc(doc.avatarUrl)!}
                              alt={doc.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : null}
                          <div className="font-bold text-slate-800">
                            {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}
                            {doc?.fullName || `BS ID #${apt.doctorId}`}
                          </div>
                        </div>
                        <div className="text-[11px] text-sky-600 font-medium flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>
                            {room?.name || `Phòng số ${apt.roomId}`}
                            {doc?.specialtyName ? ` • ${doc.specialtyName}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* CỘT 5: LÝ DO KHÁM */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        {item.reason ? (
                          <div
                            className="text-slate-700 italic line-clamp-2 leading-relaxed"
                            title={item.reason}
                          >
                            &ldquo;{item.reason}&rdquo;
                          </div>
                        ) : (
                          <span className="text-slate-400">Không có</span>
                        )}
                      </td>

                      {/* CỘT 6: TRẠNG THÁI */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <Badge status={apt.status} />
                        {apt.confirmedAt && (
                          <div className="text-[10px] text-emerald-700 font-medium">
                            Xác nhận:{' '}
                            {new Date(apt.confirmedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                        {apt.closedAt && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            Đóng:{' '}
                            {new Date(apt.closedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </td>

                      {/* CỘT 7: HÀNH ĐỘNG NGHIỆP VỤ */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* NÚT THAO TÁC THEO TRẠNG THÁI */}
                          {isPending && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleConfirm(item)}
                                className="text-xs py-1 h-7 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-2xs"
                              >
                                Xác nhận hẹn
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenCloseModal(item)}
                                className="text-xs py-1 h-7 text-rose-600 hover:bg-rose-50 border-rose-200"
                              >
                                Báo vắng
                              </Button>
                            </>
                          )}

                          {isConfirmed && (
                            <>
                              {isToday ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                                  onClick={() => handleCheckin(item)}
                                  disabled={isSubmittingCheckin}
                                  className="text-xs py-1 h-7 bg-sky-600 hover:bg-sky-700 font-bold shadow-2xs"
                                >
                                  Vào khám
                                </Button>
                              ) : (
                                <span
                                  className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                                  title="Chỉ tiếp nhận vào khám đúng ngày hẹn (hôm nay)"
                                >
                                  Chờ ngày khám
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenCloseModal(item)}
                                className="text-xs py-1 h-7 text-slate-500 hover:bg-slate-100 border-slate-200"
                              >
                                Hủy hẹn
                              </Button>
                            </>
                          )}

                          {/* XEM CHI TIẾT */}
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                            onClick={() => {
                              setSelectedDetail(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="text-xs py-1 h-7"
                            title="Xem chi tiết phiếu hẹn"
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ĐÓNG LỊCH HẸN / BÁO VẮNG MẶT (NOT_COMPLETED)
         ========================================================================= */}
      <Modal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        title="Đóng Lịch Hẹn / Báo Vắng Mặt"
        description="Chuyển trạng thái lịch hẹn sang Không hoàn thành (NOT_COMPLETED) và giải phóng chỗ đặt."
        size="md"
      >
        {closingAppointment && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div>
                Mã lịch hẹn: <strong>{closingAppointment.appointment.appointmentCode}</strong>
              </div>
              <div>
                Người bệnh: <strong>{closingAppointment.patientName}</strong> | SĐT:{' '}
                <strong>{closingAppointment.phone}</strong>
              </div>
            </div>

            {/* CÁC MẪU LÝ DO CHỌN NHANH */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Chọn lý do nhanh:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Bệnh nhân báo hủy hẹn qua điện thoại',
                  'Không liên lạc được (thuê bao / không nhấc máy sau 3 lần gọi)',
                  'Bệnh nhân yêu cầu dời lịch sang ngày khác',
                  'Bệnh nhân không có mặt tại quầy sau giờ hẹn',
                ].map((reasonText) => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setCloseReason(reasonText)}
                    className={cn(
                      'text-xs py-1 px-2.5 rounded-lg border transition-colors text-left',
                      closeReason === reasonText
                        ? 'bg-amber-600 border-amber-600 text-white font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {reasonText}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô NHẬP NỘI DUNG LÝ DO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nội dung lý do đóng lịch hẹn (*):
              </label>
              <textarea
                rows={3}
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsClosingModalOpen(false)}
                disabled={isSubmittingClose}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmClose}
                isLoading={isSubmittingClose}
                className="bg-rose-600 hover:bg-rose-700 font-bold"
              >
                Xác nhận đóng lịch hẹn
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 2: THÔNG BÁO TIẾP NHẬN THÀNH CÔNG (CHECK-IN SUCCESS SLIP)
         ========================================================================= */}
      <Modal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        title="Tiếp Nhận Vào Khám Thành Công!"
        description="Bệnh nhân đã được cấp số thứ tự khám và đưa vào danh sách chờ của Bác sĩ."
        size="md"
      >
        {checkinSuccessVisit && (
          <div className="space-y-6 pt-2 text-center">
            {/* THẺ SỐ THỨ TỰ NỔI BẬT */}
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-sky-600/30 space-y-2">
              <div className="text-xs uppercase font-extrabold tracking-wider opacity-90">
                SỐ THỨ TỰ KHÁM TRONG NGÀY
              </div>
              <div className="text-5xl font-black font-mono tracking-tight">
                #{checkinSuccessVisit.visit.queueNumber}
              </div>
              <div className="text-xs font-medium pt-1 opacity-90">
                Mã lượt khám: <strong className="font-mono">{checkinSuccessVisit.visit.visitCode}</strong>
              </div>
            </div>

            {/* THÔNG TIN HƯỚNG DẪN BỆNH NHÂN */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-400">Người bệnh:</span>
                <strong className="text-slate-900 text-sm">
                  {checkinSuccessVisit.appointment.patientName}
                </strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-400">Phòng khám tiếp nhận:</span>
                <strong className="text-sky-700 text-sm">
                  Phòng số {checkinSuccessVisit.visit.roomId}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Trạng thái hiện tại:</span>
                <Badge status="WAITING">Đang chờ bác sĩ gọi</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                In phiếu số thứ tự
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsCheckinModalOpen(false)}
                className="font-bold"
              >
                Hoàn tất
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 3: XEM CHI TIẾT LỊCH HẸN
         ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Chi Tiết Lịch Hẹn Khám Bệnh"
        size="lg"
      >
        {selectedDetail && (
          <div className="space-y-5 pt-2 text-xs sm:text-sm">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Mã Lịch Hẹn</div>
                  <div className="text-lg font-mono font-black text-sky-700">
                    {selectedDetail.appointment.appointmentCode}
                  </div>
                </div>
                <Badge status={selectedDetail.appointment.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-400">Người bệnh:</div>
                  <div className="font-bold text-slate-900 text-base">
                    {selectedDetail.patientName}
                  </div>
                  <div className="text-slate-500">Mã bệnh nhân: #{selectedDetail.patientId}</div>
                </div>

                <div>
                  <div className="text-slate-400">Số điện thoại liên hệ:</div>
                  <div className="font-bold text-sky-700 text-base flex items-center gap-2">
                    <span>{selectedDetail.phone}</span>
                    <a
                      href={`tel:${selectedDetail.phone}`}
                      className="p-1 rounded bg-sky-100 text-sky-800 hover:bg-sky-200"
                      title="Gọi ngay"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">Bác sĩ phụ trách:</div>
                  <div className="font-bold text-slate-900">
                    {doctorLookup.get(selectedDetail.appointment.doctorId)?.fullName ||
                      `Bác sĩ ID #${selectedDetail.appointment.doctorId}`}
                  </div>
                  <div className="text-sky-600">
                    {doctorLookup.get(selectedDetail.appointment.doctorId)?.specialtyName}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">Phòng khám tiếp nhận:</div>
                  <div className="font-bold text-slate-900">
                    {roomLookup.get(selectedDetail.appointment.roomId)?.name ||
                      `Phòng khám số ${selectedDetail.appointment.roomId}`}
                  </div>
                  <div className="text-slate-500">Tòa nhà Khám bệnh HTAC</div>
                </div>

                <div>
                  <div className="text-slate-400">Khung giờ hẹn:</div>
                  <div className="font-bold text-slate-900">
                    {formatTimeRange(
                      selectedDetail.appointment.startAt,
                      selectedDetail.appointment.endAt
                    )}
                  </div>
                  <div className="text-slate-600">
                    Ngày {new Date(selectedDetail.appointment.startAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">Thời gian tạo lịch:</div>
                  <div className="font-bold text-slate-700">
                    {selectedDetail.appointment.confirmedAt
                      ? `Đã xác nhận lúc ${new Date(selectedDetail.appointment.confirmedAt).toLocaleTimeString('vi-VN')}`
                      : 'Chưa xác nhận'}
                  </div>
                </div>
              </div>

              {selectedDetail.reason && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase">
                    Lý do / Triệu chứng lâm sàng:
                  </div>
                  <div className="text-slate-800 italic mt-0.5">&ldquo;{selectedDetail.reason}&rdquo;</div>
                </div>
              )}

              {selectedDetail.appointment.nonCompletionReason && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  <div className="text-xs font-bold uppercase">Lý do đóng / Hủy hẹn:</div>
                  <div className="mt-0.5">{selectedDetail.appointment.nonCompletionReason}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Đóng
              </Button>
              <div className="flex items-center gap-2">
                {selectedDetail.appointment.status === 'PENDING' && (
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleConfirm(selectedDetail);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Xác nhận lịch hẹn này
                  </Button>
                )}
                {selectedDetail.appointment.status === 'CONFIRMED' && (
                  <Button
                    variant="primary"
                    leftIcon={<UserCheck className="w-4 h-4" />}
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleCheckin(selectedDetail);
                    }}
                    className="bg-sky-600 hover:bg-sky-700 font-bold"
                  >
                    Tiếp nhận vào khám
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
