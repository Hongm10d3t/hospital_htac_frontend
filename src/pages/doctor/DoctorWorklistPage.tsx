import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  doctorWorklistService,
  type DoctorSlotResponse,
  type DoctorVisitResponse,
  type PatientVisitSummary,
  type PatientVisitDetail,
} from '../../services/doctorWorklistService';
import {
  clinicDirectoryService,
  type ClinicRoomResponse,
} from '../../services/clinicDirectoryService';
import { cn } from '../../lib/utils';
import {
  Stethoscope,
  Users,
  Clock,
  History,
  Play,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  ChevronRight,
  X,
  Pill,
  ArrowRight,
} from 'lucide-react';

/**
 * F04.01 — Bàn làm việc & Danh sách Chờ khám của Bác sĩ (Doctor Worklist)
 * Phân hệ Bác sĩ khám bệnh & Kê đơn (Doctor Portal)
 * Phong cách OPERATE: Tối ưu công thái học, trực quan, chuyển trạng thái nhanh gọn.
 */
export const DoctorWorklistPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Quản lý ngày làm việc
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // 2. Tự động làm mới
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 0 = tắt, 15s, 30s
  const [countdown, setCountdown] = useState<number>(30);
  const timerRef = useRef<any>(null);

  // 3. Dữ liệu Master
  const [rooms, setRooms] = useState<ClinicRoomResponse[]>([]);

  // 4. Ca trực của Bác sĩ trong ngày
  const [slots, setSlots] = useState<DoctorSlotResponse[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(true);

  // 5. Danh sách bệnh nhân chờ khám trong ca trực
  const [waitingVisits, setWaitingVisits] = useState<DoctorVisitResponse[]>([]);
  const [isLoadingWaiting, setIsLoadingWaiting] = useState<boolean>(false);
  const [isStartingVisitId, setIsStartingVisitId] = useState<number | null>(null);

  // 6. Modal / Drawer Xem Lịch Sử Khám Bệnh Cũ của Bệnh nhân
  const [historyDrawerVisit, setHistoryDrawerVisit] = useState<DoctorVisitResponse | null>(null);
  const [pastVisits, setPastVisits] = useState<PatientVisitSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [selectedPastDetail, setSelectedPastDetail] = useState<PatientVisitDetail | null>(null);
  const [isLoadingPastDetail, setIsLoadingPastDetail] = useState<boolean>(false);

  // Tải danh mục phòng khám
  useEffect(() => {
    clinicDirectoryService
      .listClinicRooms({ size: 100 })
      .then((res) => setRooms(res.items))
      .catch((err) => console.warn('[DoctorWorklist] Lỗi tải phòng khám:', err));
  }, []);

  const roomMap = useMemo(() => {
    const map = new Map<number, ClinicRoomResponse>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  // Tải danh sách ca trực của bác sĩ theo ngày đã chọn
  const loadSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const res = await doctorWorklistService.getDoctorSlots({
        date: selectedDate,
        size: 50,
        sort: 'startAt,ASC',
      });
      setSlots(res.items);
      // Tự động chọn ca đầu tiên nếu chưa chọn hoặc ca hiện tại không còn trong danh sách
      if (res.items.length > 0) {
        setSelectedSlotId((prev) => {
          if (prev && res.items.some((s) => s.id === prev)) return prev;
          return res.items[0].id;
        });
      } else {
        setSelectedSlotId(null);
      }
    } catch (err) {
      console.warn('[DoctorWorklist] Lỗi tải ca trực bác sĩ:', err);
      setSlots([]);
      setSelectedSlotId(null);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Tải danh sách bệnh nhân WAITING trong ca trực đã chọn
  const loadWaitingVisits = useCallback(async (silent = false) => {
    if (!selectedSlotId) {
      setWaitingVisits([]);
      return;
    }
    if (!silent) setIsLoadingWaiting(true);
    try {
      const res = await doctorWorklistService.getSlotWaitingVisits(selectedSlotId, {
        size: 100,
        sort: 'queueNumber,ASC',
      });
      setWaitingVisits(res.items);
    } catch (err) {
      console.warn('[DoctorWorklist] Lỗi tải hàng đợi ca trực:', err);
      setWaitingVisits([]);
    } finally {
      if (!silent) setIsLoadingWaiting(false);
      setCountdown(autoRefreshInterval);
    }
  }, [selectedSlotId, autoRefreshInterval]);

  useEffect(() => {
    loadWaitingVisits();
  }, [loadWaitingVisits]);

  // Bộ đếm Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval === 0 || !selectedSlotId) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadWaitingVisits(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshInterval, selectedSlotId, loadWaitingVisits]);

  // Bắt đầu khám bệnh nhân: POST /api/v1/doctor/visits/{id}/start
  const handleStartExamination = async (visit: DoctorVisitResponse) => {
    setIsStartingVisitId(visit.id);
    try {
      const startedVisit = await doctorWorklistService.startVisit(visit.id);
      toast.success(
        `Bắt đầu khám cho bệnh nhân ${startedVisit.patient.fullName} (STT #${startedVisit.queueNumber})`
      );
      // Điều hướng ngay sang trang Bệnh án & Chẩn đoán (F04.02)
      navigate(`/doctor/records?visitId=${visit.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể bắt đầu ca khám.');
      setIsStartingVisitId(null);
    }
  };

  // Mở Drawer xem lịch sử các lần khám trước của bệnh nhân
  const handleOpenPatientHistory = async (visit: DoctorVisitResponse) => {
    setHistoryDrawerVisit(visit);
    setSelectedPastDetail(null);
    setIsLoadingHistory(true);
    try {
      const res = await doctorWorklistService.getPatientHistory(visit.id, {
        size: 50,
        sort: 'arrivedAt,DESC',
      });
      setPastVisits(res.items);
    } catch (err: any) {
      toast.warning('Không tìm thấy lịch sử khám trước đó hoặc lượt chưa bắt đầu.');
      setPastVisits([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Xem chi tiết 1 lần khám quá khứ
  const handleViewPastDetail = async (pastVisitId: number) => {
    if (!historyDrawerVisit) return;
    setIsLoadingPastDetail(true);
    try {
      const detail = await doctorWorklistService.getPatientHistoryDetail(
        historyDrawerVisit.id,
        pastVisitId
      );
      setSelectedPastDetail(detail);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải chi tiết lần khám cũ.');
    } finally {
      setIsLoadingPastDetail(false);
    }
  };

  // Tính tuổi từ ngày sinh
  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} tuổi` : 'Dưới 1 tuổi';
  };

  // Format khung giờ
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    return `${sh}:${sm} – ${eh}:${em}`;
  };

  // Ca trực đang được chọn
  const currentSlot = slots.find((s) => s.id === selectedSlotId);
  const currentRoom = currentSlot ? roomMap.get(currentSlot.roomId) : null;

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900 pb-16">
      {/* =========================================================================
          1. HEADER BÀN KHÁM CỦA BÁC SĨ
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
            <span>Phân hệ Bác sĩ Khám bệnh &amp; Kê đơn (F04.01)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Bàn Làm Việc &amp; Danh Sách Chờ Khám</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
              BS: {user?.fullName || 'Bác sĩ'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Theo dõi thứ tự người bệnh xếp hàng chờ khám, tra cứu tiền sử bệnh án và bấm gọi bệnh nhân vào phòng.
          </p>
        </div>

        {/* BỘ LỌC NGÀY VÀ ĐIỀU KHIỂN AUTO-REFRESH */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          <div className="flex items-center gap-1.5">
            <select
              value={autoRefreshInterval}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAutoRefreshInterval(val);
                setCountdown(val);
              }}
              className="text-xs py-2 px-2.5 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500"
              title="Tần suất tự động làm mới hàng đợi"
            >
              <option value={0}>Không tự làm mới</option>
              <option value={15}>Làm mới: 15s</option>
              <option value={30}>Làm mới: 30s</option>
            </select>

            <button
              type="button"
              onClick={() => loadWaitingVisits(false)}
              className="p-2 px-3 rounded-2xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
              title="Làm mới hàng đợi ngay"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoadingWaiting && 'animate-spin')} />
              <span>{autoRefreshInterval > 0 ? `${countdown}s` : 'Làm mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. THANH CHỌN CA TRỰC ĐƯỢC PHÂN CÔNG (CLINIC SLOTS BAR)
         ========================================================================= */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
          <div className="font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Ca Khám Phân Công Trong Ngày ({slots.length})</span>
          </div>
          <span className="text-slate-400">
            Bác sĩ chỉ có thể gọi bệnh nhân trong các ca trực được giao nhiệm vụ.
          </span>
        </div>

        {isLoadingSlots ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
            <span>Đang kiểm tra lịch phân ca...</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 space-y-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="w-6 h-6 mx-auto text-amber-500" />
            <p className="font-bold text-slate-600">
              Bạn không có ca khám nào được phân công trong ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}.
            </p>
            <p className="text-[11px] text-slate-400">
              Vui lòng liên hệ Quản trị viên phòng khám để được phân bổ ca trực.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {slots.map((slot) => {
              const room = roomMap.get(slot.roomId);
              const isSelected = selectedSlotId === slot.id;
              const isClosed = slot.status === 'CLOSED';

              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2',
                    isSelected
                      ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>{formatTimeRange(slot.startAt, slot.endAt)}</span>
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        isClosed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      )}
                    >
                      {isClosed ? 'Đã đóng ca' : 'Đang mở'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{room?.name || `Phòng số ${slot.roomId}`}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pl-5">
                      Sức chứa: {slot.capacity} bệnh nhân
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          3. DANH SÁCH BỆNH NHÂN CHỜ KHÁM TRONG CA (WAITING PATIENTS QUEUE)
         ========================================================================= */}
      {selectedSlotId && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Hàng Đợi Chờ Khám Tại {currentRoom?.name || `Phòng ${currentSlot?.roomId}`}</span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {waitingVisits.length} bệnh nhân đang đợi
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Thứ tự được sắp xếp theo số thứ tự cấp tại quầy tiếp đón (tăng dần).
              </p>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Khung giờ: <strong>{currentSlot && formatTimeRange(currentSlot.startAt, currentSlot.endAt)}</strong>
            </div>
          </div>

          {isLoadingWaiting ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
              <span>Đang tải danh sách bệnh nhân chờ khám...</span>
            </div>
          ) : waitingVisits.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100">
              <Users className="w-9 h-9 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">Hiện không có bệnh nhân nào đang chờ tại ca trực này.</p>
              <p className="text-[11px] text-slate-400">
                Khi lễ tân tiếp nhận bệnh nhân vào phòng, danh sách sẽ tự động hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {waitingVisits.map((v, index) => {
                const p = v.patient;
                const arrivalDate = new Date(v.arrivedAt);
                const isStarting = isStartingVisitId === v.id;
                const isFirst = index === 0;

                return (
                  <div
                    key={v.id}
                    className={cn(
                      'p-4 sm:p-5 rounded-3xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4',
                      isFirst
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs ring-1 ring-amber-300/40'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {/* CỘT 1: SỐ THỨ TỰ & THÔNG TIN HÀNH CHÍNH BỆNH NHÂN */}
                    <div className="flex items-start sm:items-center gap-4">
                      {/* SỐ THỨ TỰ NỔI BẬT */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white font-mono font-black shadow-xs shrink-0">
                        <span className="text-[10px] uppercase font-bold opacity-80 leading-none">STT</span>
                        <span className="text-xl leading-none mt-0.5">#{v.queueNumber}</span>
                      </div>

                      {/* THÔNG TIN BỆNH NHÂN */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-900 tracking-tight">
                            {p.fullName}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              p.gender === 'FEMALE'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            )}
                          >
                            {p.gender === 'FEMALE' ? 'Nữ' : 'Nam'} • {calculateAge(p.dateOfBirth)}
                          </span>
                          {isFirst && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                              Lượt kế tiếp
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap font-mono">
                          <span>
                            Mã BN: <strong className="text-sky-800 font-bold">{p.patientCode}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Mã lượt: <strong className="text-slate-700">{v.visitCode}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Đón lúc:{' '}
                              {arrivalDate.toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        </div>

                        {/* LÝ DO KHÁM / TRIỆU CHỨNG */}
                        {v.reason && (
                          <div className="text-xs text-slate-700 pt-1 italic">
                            Triệu chứng ban đầu: <span className="font-semibold text-slate-900">“{v.reason}”</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CỘT 2: NÚT THAO TÁC CỦA BÁC SĨ */}
                    <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* NÚT XEM LỊCH SỬ KHÁM CŨ */}
                      <button
                        type="button"
                        onClick={() => handleOpenPatientHistory(v)}
                        className="py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                        title="Xem tiền sử bệnh án và các lần khám trước"
                      >
                        <History className="w-4 h-4 text-sky-600" />
                        <span>Tiền sử bệnh</span>
                      </button>

                      {/* NÚT BẮT ĐẦU KHÁM (START) */}
                      <button
                        type="button"
                        disabled={isStarting}
                        onClick={() => handleStartExamination(v)}
                        className="py-2.5 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs transition-all shadow-md shadow-sky-600/20 flex items-center gap-2"
                      >
                        {isStarting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-white" />
                        )}
                        <span>Gọi Vào Khám</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          4. DRAWER / MODAL XEM LỊCH SỬ KHÁM CŨ CỦA BỆNH NHÂN (PATIENT HISTORY)
         ========================================================================= */}
      {historyDrawerVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* DRAWER HEADER */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Hồ Sơ Tiền Sử Khám Bệnh</span>
                </div>
                <div className="text-lg font-black text-slate-900">
                  {historyDrawerVisit.patient.fullName} ({calculateAge(historyDrawerVisit.patient.dateOfBirth)})
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Mã BN: {historyDrawerVisit.patient.patientCode}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHistoryDrawerVisit(null);
                  setSelectedPastDetail(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DRAWER BODY: DANH SÁCH LẦN KHÁM CŨ HOẶC CHI TIẾT */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {isLoadingHistory || isLoadingPastDetail ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                  <span>Đang tải dữ liệu bệnh án...</span>
                </div>
              ) : selectedPastDetail ? (
                /* CHI TIẾT 1 LẦN KHÁM CŨ */
                <div className="space-y-4 animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => setSelectedPastDetail(null)}
                    className="text-xs text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1"
                  >
                    <span>← Quay lại danh sách các lần khám</span>
                  </button>

                  <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                    <div className="font-mono text-xs text-sky-800 font-bold">
                      Lượt khám ngày {new Date(selectedPastDetail.visit.queueDate).toLocaleDateString('vi-VN')} ({selectedPastDetail.visit.visitCode})
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px] font-semibold">Chẩn đoán:</div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {selectedPastDetail.visit.diagnosis || 'Không ghi nhận chẩn đoán'}
                      </div>
                      {selectedPastDetail.diagnosisCode && (
                        <span className="font-mono text-xs text-sky-700 font-bold">
                          Mã ICD: {selectedPastDetail.diagnosisCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedPastDetail.clinicalNotes && (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700">Ghi chú lâm sàng:</div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        {selectedPastDetail.clinicalNotes}
                      </div>
                    </div>
                  )}

                  {selectedPastDetail.treatmentPlan && (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700">Phác đồ xử trí &amp; Lời dặn:</div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        {selectedPastDetail.treatmentPlan}
                      </div>
                    </div>
                  )}

                  {/* ĐƠN THUỐC CŨ ĐÃ KÊ */}
                  <div className="space-y-2 pt-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-sky-600" />
                      <span>Đơn thuốc đã cấp trong lần khám này ({selectedPastDetail.prescriptions.length})</span>
                    </div>

                    {selectedPastDetail.prescriptions.length === 0 ? (
                      <div className="text-slate-400 italic">Không có đơn thuốc nào được phát hành.</div>
                    ) : (
                      <div className="space-y-3">
                        {selectedPastDetail.prescriptions.map((rx) => (
                          <div key={rx.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 pb-1.5 border-b border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <span>Mã đơn: {rx.prescriptionCode}</span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ID: #{rx.id}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-700">{rx.status}</span>
                            </div>
                            <div className="space-y-1.5">
                              {rx.items.map((it) => (
                                <div key={it.id} className="flex items-start justify-between text-xs">
                                  <div>
                                    <div className="font-bold text-slate-800">
                                      {it.medicineName || `Thuốc ID #${it.medicineId}`}
                                    </div>
                                    <div className="text-[11px] text-slate-500 italic">{it.instructions}</div>
                                  </div>
                                  <div className="font-mono font-bold text-slate-700 shrink-0">
                                    x{it.quantity} {it.unit || 'viên'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : pastVisits.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">Bệnh nhân chưa có lịch sử khám trước đây tại viện.</p>
                  <p className="text-[11px]">Đây là lượt khám đầu tiên của bệnh nhân.</p>
                </div>
              ) : (
                /* DANH SÁCH TẤT CẢ CÁC LẦN KHÁM TRƯỚC */
                <div className="space-y-2.5">
                  <div className="text-slate-400 font-semibold mb-1">
                    Tìm thấy {pastVisits.length} lần khám trước:
                  </div>
                  {pastVisits.map((past) => (
                    <div
                      key={past.id}
                      onClick={() => handleViewPastDetail(past.id)}
                      className="p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Ngày {new Date(past.queueDate).toLocaleDateString('vi-VN')}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.2 rounded-full',
                              past.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            )}
                          >
                            {past.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          Chẩn đoán: <strong>{past.diagnosis || 'Chưa ghi nhận'}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Mã: {past.visitCode}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setHistoryDrawerVisit(null);
                  setSelectedPastDetail(null);
                }}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-white"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = historyDrawerVisit;
                  setHistoryDrawerVisit(null);
                  handleStartExamination(target);
                }}
                className="py-2 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span>Bắt Đầu Khám Ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
