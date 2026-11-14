import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  receptionQueueService,
  type VisitReportRow,
} from '../../services/receptionQueueService';
import {
  type ReceptionVisit,
} from '../../services/receptionCheckinService';
import {
  clinicDirectoryService,
  type ClinicRoomResponse,
  type SpecialtyResponse,
} from '../../services/clinicDirectoryService';
import {
  publicDoctorService,
  type DoctorPublicResponse,
  type PublicClinicSlotResponse,
} from '../../services/publicDoctorService';
import { receptionPatientService, type PatientRecord } from '../../services/receptionPatientService';
import { resolveAvatarSrc, cn } from '../../lib/utils';
import {
  Activity,
  Users,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  ChevronRight,
  UserCheck,
  UserX,
  Grid,
  List,
  X,
} from 'lucide-react';

/**
 * F03.04 — Bảng điều khiển Giám sát Hàng đợi Phòng khám (Reception Queue Dashboard)
 * Phân hệ Tiếp đón bệnh nhân (Receptionist Portal)
 * Chuẩn phong cách thiết kế OPERATE: Mật độ dữ liệu cao, cập nhật realtime, thao tác dứt khoát.
 */
export const ReceptionQueuePage: React.FC = () => {
  const toast = useToast();
  const { hospitalConfig } = useAuth();

  // 1. Quản lý Ngày giám sát
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // 2. Tùy chọn Tự động làm mới (Auto-refresh)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 0 = tắt, 15s, 30s, 60s
  const [countdown, setCountdown] = useState<number>(30);
  const timerRef = useRef<any>(null);

  // 3. Chế độ hiển thị: 'grid' (Thẻ phòng khám) | 'table' (Bảng danh sách chi tiết)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // 4. Danh mục Master Data
  const [rooms, setRooms] = useState<ClinicRoomResponse[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyResponse[]>([]);
  const [doctors, setDoctors] = useState<DoctorPublicResponse[]>([]);
  const [todaySlots, setTodaySlots] = useState<PublicClinicSlotResponse[]>([]);

  // 5. Dữ liệu Hàng đợi & Báo cáo
  const [waitingVisits, setWaitingVisits] = useState<ReceptionVisit[]>([]);
  const [reportRows, setReportRows] = useState<VisitReportRow[]>([]);
  const [patientCache, setPatientCache] = useState<Map<number, PatientRecord>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 6. Bộ lọc
  const [searchKw, setSearchKw] = useState<string>('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string | number>('ALL');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string | number>('ALL');

  // 7. Modal In Phiếu STT
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);
  const [selectedTicketVisit, setSelectedTicketVisit] = useState<ReceptionVisit | null>(null);

  // 8. Modal Báo vắng (NOT_COMPLETED) hoặc Hủy tiếp nhận (VOIDED)
  const [outcomeAction, setOutcomeAction] = useState<'not_complete' | 'void' | null>(null);
  const [outcomeVisit, setOutcomeVisit] = useState<ReceptionVisit | null>(null);
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState<boolean>(false);

  // Tải danh mục Master Data ban đầu
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [roomRes, specRes, docRes] = await Promise.all([
          clinicDirectoryService.listClinicRooms({ size: 100 }),
          clinicDirectoryService.listSpecialties({ size: 100 }),
          publicDoctorService.listDoctors({ size: 100 }),
        ]);
        setRooms(roomRes.items);
        setSpecialties(specRes.items);
        setDoctors(docRes.items);
      } catch (err) {
        console.warn('[ReceptionQueue] Lỗi tải dữ liệu phòng & bác sĩ:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Lookup maps
  const roomMap = useMemo(() => {
    const map = new Map<number, ClinicRoomResponse>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  const doctorMap = useMemo(() => {
    const map = new Map<number, DoctorPublicResponse>();
    doctors.forEach((d) => map.set(d.userId, d));
    return map;
  }, [doctors]);

  // Tải dữ liệu hàng đợi & báo cáo ca khám theo ngày đã chọn
  const loadQueueData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // 1. Tải các ca khám của ngày đã chọn
      const slotsRes = await publicDoctorService.searchSlots({
        date: selectedDate,
        size: 100,
      });
      setTodaySlots(slotsRes.items);

      // 2. Tải danh sách lượt chờ WAITING
      const waitingRes = await receptionQueueService.getWaitingVisits({
        date: selectedDate,
        size: 100,
        sort: 'queueNumber,ASC',
      });
      setWaitingVisits(waitingRes.items);

      // 3. Tải báo cáo lượt đến (tính từ selectedDate đến selectedDate + 1)
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);

      try {
        const reportRes = await receptionQueueService.getVisitsReport({
          from: selectedDate,
          to: nextDayStr,
          size: 100,
        });
        setReportRows(reportRes.items);
      } catch (repErr) {
        console.warn('[ReceptionQueue] Lỗi tải báo cáo visits:', repErr);
        setReportRows([]);
      }

      // 4. Nạp nhanh tên các bệnh nhân mới vào cache
      const uncachedIds = waitingRes.items
        .map((v) => v.patientId)
        .filter((pid) => !patientCache.has(pid));

      if (uncachedIds.length > 0) {
        const uniqueIds = Array.from(new Set(uncachedIds)).slice(0, 20);
        Promise.allSettled(
          uniqueIds.map((pid) => receptionPatientService.getPatient(pid))
        ).then((results) => {
          setPatientCache((prev) => {
            const next = new Map(prev);
            results.forEach((res) => {
              if (res.status === 'fulfilled') {
                next.set(res.value.id, res.value);
              }
            });
            return next;
          });
        });
      }
    } catch (err) {
      console.warn('[ReceptionQueue] Lỗi tải dữ liệu hàng đợi:', err);
    } finally {
      if (!silent) setIsLoading(false);
      setCountdown(autoRefreshInterval);
    }
  }, [selectedDate, autoRefreshInterval, patientCache]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  // Bộ đếm Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval === 0) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadQueueData(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshInterval, loadQueueData]);

  // Gom nhóm thống kê toàn viện hôm nay
  const statistics = useMemo(() => {
    const totalWaiting = waitingVisits.length;
    let totalInProgress = 0;
    let totalCompleted = 0;
    let totalNotCompleted = 0;

    reportRows.forEach((r) => {
      if (r.status === 'IN_PROGRESS') totalInProgress += r.count;
      else if (r.status === 'COMPLETED') totalCompleted += r.count;
      else if (r.status === 'NOT_COMPLETED') totalNotCompleted += r.count;
    });

    const totalVisitsToday = totalWaiting + totalInProgress + totalCompleted + totalNotCompleted;

    // Số phòng đang có ca khám hoạt động
    const activeRoomIds = new Set<number>();
    todaySlots.forEach((s) => activeRoomIds.add(s.roomId));

    return {
      totalVisitsToday,
      totalWaiting,
      totalInProgress,
      totalCompleted,
      totalNotCompleted,
      activeRoomsCount: activeRoomIds.size,
      totalRoomsCount: rooms.length,
    };
  }, [waitingVisits, reportRows, todaySlots, rooms]);

  // Lọc lượt chờ WAITING theo Search & Filter
  const filteredWaitingVisits = useMemo(() => {
    return waitingVisits.filter((v) => {
      // Lọc phòng
      if (selectedRoomFilter !== 'ALL' && v.roomId !== selectedRoomFilter) {
        return false;
      }
      // Lọc chuyên khoa (dựa trên ca khám)
      const slot = todaySlots.find((s) => s.id === v.slotId);
      if (selectedSpecialtyFilter !== 'ALL' && slot?.specialtyId !== selectedSpecialtyFilter) {
        return false;
      }
      // Lọc từ khóa: mã lượt, mã BN, tên BN trong cache, lý do
      if (searchKw.trim()) {
        const kw = searchKw.toLowerCase();
        const p = patientCache.get(v.patientId);
        const matchCode = v.visitCode.toLowerCase().includes(kw);
        const matchPid = String(v.patientId).includes(kw);
        const matchName = p?.fullName.toLowerCase().includes(kw) || false;
        const matchPCode = p?.patientCode.toLowerCase().includes(kw) || false;
        const matchReason = v.reason?.toLowerCase().includes(kw) || false;
        if (!matchCode && !matchPid && !matchName && !matchPCode && !matchReason) {
          return false;
        }
      }
      return true;
    });
  }, [waitingVisits, selectedRoomFilter, selectedSpecialtyFilter, searchKw, todaySlots, patientCache]);

  // Gom thông tin dữ liệu theo từng phòng khám (cho Grid View)
  const roomCardList = useMemo(() => {
    return rooms.map((room) => {
      // Các ca khám mở trong phòng này hôm nay
      const roomSlots = todaySlots.filter((s) => s.roomId === room.id);
      const isRoomActive = roomSlots.length > 0;

      // Danh sách bệnh nhân đang đợi tại phòng này
      const roomWaitingVisits = waitingVisits.filter((v) => v.roomId === room.id);

      // Thống kê từ báo cáo cho phòng này
      let inProgressCount = 0;
      let completedCount = 0;
      let notCompletedCount = 0;
      reportRows.forEach((r) => {
        if (r.roomId === room.id) {
          if (r.status === 'IN_PROGRESS') inProgressCount += r.count;
          else if (r.status === 'COMPLETED') completedCount += r.count;
          else if (r.status === 'NOT_COMPLETED') notCompletedCount += r.count;
        }
      });

      // Bác sĩ phụ trách chính (từ ca khám đầu tiên hoặc ca hiện tại)
      const mainSlot = roomSlots[0];
      const mainDoctor = mainSlot ? doctorMap.get(mainSlot.doctorId) : null;
      const mainSpecialty = mainSlot?.specialtyName || null;

      return {
        room,
        isRoomActive,
        slots: roomSlots,
        mainDoctor,
        mainSpecialty,
        waitingVisits: roomWaitingVisits,
        waitingCount: roomWaitingVisits.length,
        inProgressCount,
        completedCount,
        notCompletedCount,
        totalHandled: roomWaitingVisits.length + inProgressCount + completedCount + notCompletedCount,
      };
    }).filter((item) => {
      // Áp dụng bộ lọc phòng và chuyên khoa nếu có
      if (selectedRoomFilter !== 'ALL' && item.room.id !== selectedRoomFilter) {
        return false;
      }
      if (selectedSpecialtyFilter !== 'ALL') {
        const hasSpec = item.slots.some((s) => s.specialtyId === selectedSpecialtyFilter);
        if (!hasSpec) return false;
      }
      return true;
    });
  }, [rooms, todaySlots, waitingVisits, reportRows, doctorMap, selectedRoomFilter, selectedSpecialtyFilter]);

  // Xử lý Báo vắng (Not Complete) hoặc Hủy tiếp nhận (Void)
  const handleConfirmOutcome = async () => {
    if (!outcomeVisit || !outcomeReason.trim()) {
      toast.warning('Vui lòng nhập lý do thực hiện thao tác.');
      return;
    }

    setIsSubmittingOutcome(true);
    try {
      if (outcomeAction === 'not_complete') {
        await receptionQueueService.notCompleteVisit(outcomeVisit.id, outcomeReason.trim());
        toast.success(`Đã cập nhật lượt khám ${outcomeVisit.visitCode} sang trạng thái Báo vắng.`);
      } else {
        await receptionQueueService.voidVisit(outcomeVisit.id, outcomeReason.trim());
        toast.success(`Đã vô hiệu hóa (VOID) lượt khám ${outcomeVisit.visitCode} thành công.`);
      }
      setOutcomeAction(null);
      setOutcomeVisit(null);
      setOutcomeReason('');
      loadQueueData(true);
    } catch (err: any) {
      toast.error(err.message || 'Thao tác không thành công.');
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  // Format time
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900 pb-12">
      {/* =========================================================================
          1. HEADER BẢNG ĐIỀU KHIỂN & CÔNG CỤ ĐIỀU HÀNH
         ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <Activity className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span>Phân hệ Nghiệp vụ Tiếp đón Bệnh nhân (F03.04)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Giám Sát Hàng Đợi Phòng Khám</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
              Ngày: {new Date(selectedDate).toLocaleDateString('vi-VN')}
            </span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Theo dõi phân bổ bệnh nhân tại tất cả các phòng khám trong ngày, phát hiện điểm nghẽn và điều phối tiếp nhận thông suốt.
          </p>
        </div>

        {/* CÔNG CỤ ĐIỀU KHIỂN: CHỌN NGÀY, AUTO-REFRESH & CHẾ ĐỘ XEM */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bộ chọn ngày nhanh */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all',
                selectedDate === todayStr ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all',
                selectedDate === tomorrowStr ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Ngày mai
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-2 py-1 bg-transparent border-0 text-slate-700 outline-none font-medium cursor-pointer"
              title="Chọn ngày tùy ý"
            />
          </div>

          {/* Chọn chế độ xem Grid / Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 transition-all',
                viewMode === 'grid' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
              title="Xem dạng thẻ phòng khám"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thẻ phòng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 transition-all',
                viewMode === 'table' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
              title="Xem danh sách hàng đợi chi tiết"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách hàng đợi</span>
            </button>
          </div>

          {/* Nút Làm mới & Đếm ngược tự động */}
          <div className="flex items-center gap-1.5">
            <select
              value={autoRefreshInterval}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAutoRefreshInterval(val);
                setCountdown(val);
              }}
              className="text-xs py-2 px-2.5 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500"
              title="Tần suất tự động làm mới dữ liệu"
            >
              <option value={0}>Không tự làm mới</option>
              <option value={15}>Làm mới: 15s</option>
              <option value={30}>Làm mới: 30s</option>
              <option value={60}>Làm mới: 60s</option>
            </select>

            <button
              type="button"
              onClick={() => loadQueueData(false)}
              className="p-2 px-3 rounded-2xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
              title="Bấm để tải lại ngay"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>{autoRefreshInterval > 0 ? `${countdown}s` : 'Làm mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. THẺ CHỈ SỐ NHANH (KPIS DASHBOARD)
         ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: ĐANG CHỜ KHÁM (QUAN TRỌNG NHẤT) */}
        <div className="p-4 rounded-3xl bg-amber-500 text-white shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold">
            <span>Đang Chờ Khám</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black tracking-tight">{statistics.totalWaiting}</div>
          <div className="text-[11px] opacity-80 font-medium">Bệnh nhân tại sảnh chờ</div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/10 rounded-full blur-xs pointer-events-none" />
        </div>

        {/* KPI 2: ĐANG KHÁM TRONG PHÒNG */}
        <div className="p-4 rounded-3xl bg-sky-600 text-white shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold">
            <span>Đang Khám</span>
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black tracking-tight">{statistics.totalInProgress}</div>
          <div className="text-[11px] opacity-80 font-medium">Đang trong phòng bác sĩ</div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/10 rounded-full blur-xs pointer-events-none" />
        </div>

        {/* KPI 3: ĐÃ HOÀN THÀNH */}
        <div className="p-4 rounded-3xl bg-emerald-600 text-white shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold">
            <span>Đã Khám Xong</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black tracking-tight">{statistics.totalCompleted}</div>
          <div className="text-[11px] opacity-80 font-medium">Đã hoàn thành ca khám</div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/10 rounded-full blur-xs pointer-events-none" />
        </div>

        {/* KPI 4: BÁO VẮNG / BỎ DỞ */}
        <div className="p-4 rounded-3xl bg-slate-800 text-white shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold">
            <span>Báo Vắng</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black tracking-tight">{statistics.totalNotCompleted}</div>
          <div className="text-[11px] opacity-80 font-medium">Bỏ dở hoặc vắng mặt</div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/10 rounded-full blur-xs pointer-events-none" />
        </div>

        {/* KPI 5: TỔNG LƯỢT TIẾP ĐÓN TRONG NGÀY */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Tổng Tiếp Đón</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-sky-900 tracking-tight">{statistics.totalVisitsToday}</div>
          <div className="text-[11px] text-slate-500 font-medium">Lượt đăng ký khám</div>
        </div>

        {/* KPI 6: SỐ PHÒNG ĐANG MỞ CA TRỰC */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Phòng Trực Mở</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-900 tracking-tight">
            {statistics.activeRoomsCount}
            <span className="text-sm font-normal text-slate-400">/{statistics.totalRoomsCount}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Phòng có ca hôm nay</div>
        </div>
      </div>

      {/* =========================================================================
          3. THANH TÌM KIẾM VÀ BỘ LỌC HÀNG ĐỢI
         ========================================================================= */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm nhanh theo Mã lượt khám, Mã BN, Tên bệnh nhân hoặc Triệu chứng..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium"
            />
            {searchKw && (
              <button
                type="button"
                onClick={() => setSearchKw('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc theo Chuyên khoa */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-2xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold">Chuyên khoa:</span>
            <select
              value={selectedSpecialtyFilter}
              onChange={(e) =>
                setSelectedSpecialtyFilter(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả ({specialties.length})</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Phòng khám */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-2xl border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold">Phòng:</span>
            <select
              value={selectedRoomFilter}
              onChange={(e) =>
                setSelectedRoomFilter(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả ({rooms.length})</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {(selectedRoomFilter !== 'ALL' || selectedSpecialtyFilter !== 'ALL' || searchKw) && (
            <button
              type="button"
              onClick={() => {
                setSelectedRoomFilter('ALL');
                setSelectedSpecialtyFilter('ALL');
                setSearchKw('');
              }}
              className="text-xs text-sky-700 hover:text-sky-900 font-bold px-2 py-1 rounded-lg hover:bg-sky-50"
            >
              Đặt lại lọc
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. NỘI DUNG CHÍNH: CHẾ ĐỘ XEM GRID (THẺ PHÒNG KHÁM)
         ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold">
              Hiển thị <strong>{roomCardList.length}</strong> phòng khám theo bộ lọc
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đang khám
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Có bệnh nhân chờ
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Chưa mở ca trực
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {roomCardList.map((item) => {
              const { room, isRoomActive, mainDoctor, mainSpecialty, waitingVisits: roomWaits, waitingCount } = item;

              // Trạng thái thẻ
              let statusBorder = 'border-slate-200';
              let badgeBg = 'bg-slate-100 text-slate-600';
              let statusText = 'Chưa mở ca trực';

              if (isRoomActive) {
                if (waitingCount > 0) {
                  statusBorder = 'border-amber-300 ring-1 ring-amber-300/40';
                  badgeBg = 'bg-amber-100 text-amber-900 font-black';
                  statusText = `${waitingCount} bệnh nhân chờ`;
                } else {
                  statusBorder = 'border-emerald-300 ring-1 ring-emerald-300/40';
                  badgeBg = 'bg-emerald-100 text-emerald-900 font-bold';
                  statusText = 'Đang sẵn sàng nhận bệnh';
                }
              }

              return (
                <div
                  key={room.id}
                  className={cn(
                    'bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between space-y-4',
                    statusBorder
                  )}
                >
                  {/* PHẦN ĐẦU THẺ: TÊN PHÒNG & TRẠNG THÁI */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <span>{room.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{room.location || 'Tòa nhà Khám bệnh HTAC'}</span>
                        </div>
                      </div>

                      <span className={cn('text-[11px] px-2.5 py-1 rounded-full shrink-0', badgeBg)}>
                        {statusText}
                      </span>
                    </div>

                    {/* BÁC SĨ PHỤ TRÁCH & CHUYÊN KHOA */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                      {mainDoctor?.avatarUrl ? (
                        <img
                          src={resolveAvatarSrc(mainDoctor.avatarUrl)!}
                          alt={mainDoctor.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                          BS
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-extrabold text-slate-900 text-xs truncate">
                          {mainDoctor?.professionalTitle ? `${mainDoctor.professionalTitle} ` : ''}
                          {mainDoctor?.fullName || (isRoomActive ? 'Bác sĩ trực ca' : 'Chưa phân công')}
                        </div>
                        <div className="text-[11px] text-sky-700 font-medium truncate">
                          {mainSpecialty || 'Chuyên khoa đa khoa'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* THỐNG KÊ MINI CỦA PHÒNG */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Chờ khám</div>
                      <div className="text-base font-black text-amber-600 font-mono">{waitingCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Đang khám</div>
                      <div className="text-base font-black text-sky-600 font-mono">{item.inProgressCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Đã xong</div>
                      <div className="text-base font-black text-emerald-600 font-mono">{item.completedCount}</div>
                    </div>
                  </div>

                  {/* DANH SÁCH 3 BỆNH NHÂN CHỜ ĐẦU TIÊN TRONG HÀNG ĐỢI */}
                  <div className="space-y-1.5 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Hàng đợi tiếp theo</span>
                      <span className="font-mono text-slate-500 font-normal">
                        {roomWaits.length > 0 ? `${roomWaits.length} ca` : 'Trống'}
                      </span>
                    </div>

                    {roomWaits.length === 0 ? (
                      <div className="py-4 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        {isRoomActive ? 'Hiện không có bệnh nhân nào chờ tại phòng này.' : 'Phòng chưa kích hoạt ca khám.'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {roomWaits.slice(0, 3).map((wait) => {
                          const p = patientCache.get(wait.patientId);
                          return (
                            <div
                              key={wait.id}
                              className="p-2 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-100 transition-colors flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono font-black text-sky-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                                  #{wait.queueNumber}
                                </span>
                                <div className="truncate">
                                  <div className="font-bold text-slate-800 truncate">
                                    {p?.fullName || `Bệnh nhân #${wait.patientId}`}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {wait.visitCode}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTicketVisit(wait);
                                  setIsTicketModalOpen(true);
                                }}
                                className="p-1 rounded-lg hover:bg-sky-100 text-sky-700"
                                title="Xem và in lại phiếu STT"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {roomWaits.length > 3 && (
                          <div className="text-[10px] text-center text-slate-400 font-medium">
                            + {roomWaits.length - 3} bệnh nhân khác đang xếp sau
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NÚT XEM CHI TIẾT LỌC CHO PHÒNG NÀY */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomFilter(room.id);
                        setViewMode('table');
                      }}
                      className="w-full py-2 px-3 rounded-2xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 font-bold text-xs text-slate-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Xem toàn bộ hàng đợi phòng này</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          5. NỘI DUNG CHÍNH: CHẾ ĐỘ XEM BẢNG CHI TIẾT (DETAILED QUEUE TABLE)
         ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Danh Sách Hàng Đợi Bệnh Nhân Đang Chờ</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {filteredWaitingVisits.length} lượt
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Hiển thị thứ tự gọi khám của từng người bệnh tại các phòng khám chuyên khoa.
              </p>
            </div>

            <div className="text-xs text-slate-400">
              Sắp xếp theo: <strong>Số thứ tự tăng dần (ASC)</strong>
            </div>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
              <span>Đang tải danh sách hàng đợi trực tiếp...</span>
            </div>
          ) : filteredWaitingVisits.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Không có bệnh nhân nào phù hợp với bộ lọc hiện tại.</p>
              <p className="text-[11px] text-slate-400">
                Hãy thử chọn ngày khác hoặc xóa các điều kiện lọc phòng/chuyên khoa.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 text-center">STT</th>
                    <th className="py-3 px-3">Mã Lượt Khám</th>
                    <th className="py-3 px-3">Người Bệnh</th>
                    <th className="py-3 px-3">Phòng Tiếp Nhận</th>
                    <th className="py-3 px-3">Bác Sĩ Phụ Trách</th>
                    <th className="py-3 px-3">Giờ Đón</th>
                    <th className="py-3 px-3">Lý Do / Triệu Chứng</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWaitingVisits.map((v) => {
                    const room = roomMap.get(v.roomId);
                    const slot = todaySlots.find((s) => s.id === v.slotId);
                    const doc = slot ? doctorMap.get(slot.doctorId) : null;
                    const p = patientCache.get(v.patientId);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* STT */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-mono font-black text-sky-700 text-base bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200">
                            #{v.queueNumber}
                          </span>
                        </td>

                        {/* MÃ LƯỢT */}
                        <td className="py-3.5 px-3 font-mono">
                          <div className="font-extrabold text-slate-900">{v.visitCode}</div>
                          <div className="text-[10px] text-slate-400">ID #{v.id}</div>
                        </td>

                        {/* NGƯỜI BỆNH */}
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-900">
                            {p?.fullName || `Bệnh nhân #${v.patientId}`}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Mã BN: {p?.patientCode || `#${v.patientId}`}
                            {p?.citizenId ? ` • CCCD: ${p.citizenId}` : ''}
                          </div>
                        </td>

                        {/* PHÒNG TIẾP NHẬN */}
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-800">
                            {room?.name || `Phòng số ${v.roomId}`}
                          </div>
                          <div className="text-[11px] text-sky-700 font-medium">
                            {slot?.specialtyName || 'Đa khoa'}
                          </div>
                        </td>

                        {/* BÁC SĨ */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">
                            {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}
                            {doc?.fullName || `BS ID #${slot?.doctorId || '---'}`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {room?.location || 'HTAC'}
                          </div>
                        </td>

                        {/* THỜI GIAN ĐÓN */}
                        <td className="py-3.5 px-3 text-slate-600 font-mono">
                          {formatTime(v.arrivedAt)}
                        </td>

                        {/* LÝ DO */}
                        <td className="py-3.5 px-3 max-w-[200px] truncate italic text-slate-600" title={v.reason || ''}>
                          {v.reason ? `“${v.reason}”` : '---'}
                        </td>

                        {/* THAO TÁC */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* IN LẠI PHIẾU */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicketVisit(v);
                                setIsTicketModalOpen(true);
                              }}
                              className="p-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-sky-50 text-sky-700 font-bold text-xs transition-colors flex items-center gap-1"
                              title="In lại phiếu số thứ tự"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">In phiếu</span>
                            </button>

                            {/* BÁO VẮNG */}
                            <button
                              type="button"
                              onClick={() => {
                                setOutcomeVisit(v);
                                setOutcomeAction('not_complete');
                                setOutcomeReason('Bệnh nhân không có mặt khi loa gọi vào khám');
                              }}
                              className="p-1.5 px-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-xs transition-colors"
                              title="Báo vắng mặt (NOT_COMPLETED)"
                            >
                              Báo vắng
                            </button>

                            {/* HỦY VOID */}
                            <button
                              type="button"
                              onClick={() => {
                                setOutcomeVisit(v);
                                setOutcomeAction('void');
                                setOutcomeReason('Thao tác tiếp nhận nhầm phòng khám');
                              }}
                              className="p-1.5 px-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors"
                              title="Vô hiệu hóa lượt tiếp nhận (VOID)"
                            >
                              Hủy bỏ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          6. MODAL XEM & IN LẠI PHIẾU SỐ THỨ TỰ (THERMAL TICKET PREVIEW)
         ========================================================================= */}
      {isTicketModalOpen && selectedTicketVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 border border-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            {/* MÔ PHỎNG PHIẾU IN NHIỆT KHỔ 80MM */}
            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 font-mono text-center space-y-3 text-slate-800">
              <div className="border-b border-dashed border-slate-300 pb-2 space-y-0.5">
                <div className="font-black text-sm uppercase">
                  {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA HTAC'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {hospitalConfig?.address || 'Hà Nội'} • Hotline: {hospitalConfig?.phone || '1900 8888'}
                </div>
                <div className="text-xs font-bold pt-1 uppercase tracking-tight text-sky-800">
                  PHIẾU KHÁM BỆNH &amp; SỐ THỨ TỰ
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">
                  SỐ THỨ TỰ CỦA BẠN
                </div>
                <div className="text-5xl font-black text-sky-700 tracking-tight my-1">
                  #{selectedTicketVisit.queueNumber}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  Mã lượt: {selectedTicketVisit.visitCode}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-left text-xs space-y-1">
                <div>
                  Người bệnh:{' '}
                  <strong>
                    {patientCache.get(selectedTicketVisit.patientId)?.fullName ||
                      `Bệnh nhân #${selectedTicketVisit.patientId}`}
                  </strong>
                </div>
                <div>
                  Phòng khám:{' '}
                  <strong className="text-sky-800">
                    {roomMap.get(selectedTicketVisit.roomId)?.name || `Phòng ${selectedTicketVisit.roomId}`}
                  </strong>
                </div>
                <div>
                  Thời gian cấp:{' '}
                  <span>
                    {formatTime(selectedTicketVisit.arrivedAt)} – {new Date(selectedTicketVisit.arrivedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {selectedTicketVisit.reason && (
                  <div className="text-[11px] italic text-slate-600 pt-0.5 truncate">
                    Triệu chứng: {selectedTicketVisit.reason}
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500">
                Vui lòng theo dõi màn hình gọi số tại sảnh chờ trước phòng khám.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setIsTicketModalOpen(false);
                }}
                className="flex-1 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Ngay</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL XÁC NHẬN BÁO VẮNG (NOT COMPLETE) HOẶC HỦY (VOID)
         ========================================================================= */}
      {outcomeAction && outcomeVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                  outcomeAction === 'not_complete'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                )}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {outcomeAction === 'not_complete'
                    ? 'Báo Vắng Bệnh Nhân (NOT COMPLETED)'
                    : 'Vô Hiệu Hóa Lượt Tiếp Nhận (VOID)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Lượt khám: <strong className="font-mono text-slate-800">{outcomeVisit.visitCode}</strong> (STT #{outcomeVisit.queueNumber})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {outcomeAction === 'not_complete'
                ? 'Thao tác này ghi nhận bệnh nhân đã được tiếp nhận nhưng bỏ về hoặc vắng mặt khi được gọi vào phòng. Lượt vẫn được tính vào thống kê tiếp đón trong ngày.'
                : 'Thao tác này loại bỏ hoàn toàn lượt tiếp nhận do nhân viên nhập nhầm thông tin hoặc trùng lặp. Lượt VOIDED sẽ không được tính vào tổng lượt khám thực tế.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Lý do thực hiện <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                value={outcomeReason}
                onChange={(e) => setOutcomeReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setOutcomeAction(null);
                  setOutcomeVisit(null);
                }}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmittingOutcome || !outcomeReason.trim()}
                onClick={handleConfirmOutcome}
                className={cn(
                  'py-2 px-4 rounded-xl text-white font-black text-xs shadow-xs transition-colors flex items-center gap-1.5',
                  outcomeAction === 'not_complete'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                {isSubmittingOutcome && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận xử lý</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
