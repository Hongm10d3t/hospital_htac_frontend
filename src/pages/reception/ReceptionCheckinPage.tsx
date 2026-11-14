import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import {
  receptionCheckinService,
  type ReceptionVisit,
} from '../../services/receptionCheckinService';
import {
  receptionPatientService,
  type PatientRecord,
  type CreatePatientPayload,
} from '../../services/receptionPatientService';
import {
  receptionAppointmentService,
  type ReceptionAppointmentResponse,
} from '../../services/receptionAppointmentService';
import {
  publicDoctorService,
  type DoctorPublicResponse,
  type PublicClinicSlotResponse,
} from '../../services/publicDoctorService';
import {
  clinicDirectoryService,
  type ClinicRoomResponse,
} from '../../services/clinicDirectoryService';
import { resolveAvatarSrc, cn } from '../../lib/utils';
import {
  UserCheck,
  Search,
  CalendarCheck,
  Clock,
  Printer,
  Plus,
  RefreshCw,
  Stethoscope,
  AlertCircle,
  CreditCard,
  User,
  Users,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

/**
 * F03.03 — Tiếp đón Khám bệnh & Cấp Số Thứ Tự (Check-in & Queuing)
 * Phân hệ Tiếp đón (Receptionist Portal)
 * Giao diện tối ưu công thái học (Master - Review 2-Column Balanced Ergonomics)
 */
export const ReceptionCheckinPage: React.FC = () => {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { hospitalConfig } = useAuth();

  // Tab nghiệp vụ: 'direct' (Vãng lai trực tiếp) | 'booked' (Có hẹn trước) | 'waiting' (Hàng đợi hôm nay)
  const [activeTab, setActiveTab] = useState<'direct' | 'booked' | 'waiting'>('direct');

  // Ngày nghiệp vụ: Hôm nay & Ngày mai
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Bộ lọc ngày của ca khám (mặc định là Hôm nay)
  const [slotDateFilter, setSlotDateFilter] = useState<string>(todayStr);

  // Danh mục tham chiếu
  const [doctors, setDoctors] = useState<DoctorPublicResponse[]>([]);
  const [rooms, setRooms] = useState<ClinicRoomResponse[]>([]);
  const [availableSlots, setAvailableSlots] = useState<PublicClinicSlotResponse[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // =========================================================================
  // STATE LUỒNG 1: TIẾP ĐÓN TRỰC TIẾP (DIRECT CHECK-IN)
  // =========================================================================
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [patientSearchKw, setPatientSearchKw] = useState<string>('');
  const [isSearchingPatient, setIsSearchingPatient] = useState<boolean>(false);
  const [patientSearchResults, setPatientSearchResults] = useState<PatientRecord[]>([]);

  // Lọc ca khám theo chuyên khoa
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<number | 'ALL'>('ALL');
  const [selectedSlot, setSelectedSlot] = useState<PublicClinicSlotResponse | null>(null);
  const [clinicalReason, setClinicalReason] = useState<string>('');
  const [isSubmittingDirect, setIsSubmittingDirect] = useState<boolean>(false);

  // =========================================================================
  // STATE LUỒNG 2: TIẾP ĐÓN THEO LỊCH HẸN (BOOKED CHECK-IN)
  // =========================================================================
  const [appointmentSearchKw, setAppointmentSearchKw] = useState<string>('');
  const [isSearchingApt, setIsSearchingApt] = useState<boolean>(false);
  const [foundAppointment, setFoundAppointment] = useState<ReceptionAppointmentResponse | null>(null);
  const [isSubmittingBooked, setIsSubmittingBooked] = useState<boolean>(false);

  // =========================================================================
  // STATE LUỒNG 3: HÀNG ĐỢI ĐANG CHỜ KHÁM HÔM NAY (WAITING QUEUE)
  // =========================================================================
  const [waitingVisits, setWaitingVisits] = useState<ReceptionVisit[]>([]);
  const [isLoadingWaiting, setIsLoadingWaiting] = useState<boolean>(false);
  const [waitingRoomFilter, setWaitingRoomFilter] = useState<number | 'ALL'>('ALL');

  // =========================================================================
  // MODALS & ACTIONS
  // =========================================================================
  // Modal Phiếu số thứ tự tiếp nhận thành công
  const [successVisit, setSuccessVisit] = useState<ReceptionVisit | null>(null);
  const [successPatientInfo, setSuccessPatientInfo] = useState<{
    fullName: string;
    patientCode: string;
    doctorName?: string;
    roomName?: string;
  } | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);

  // Modal Tạo nhanh hồ sơ bệnh nhân mới
  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] = useState<boolean>(false);
  const [createPatientForm, setCreatePatientForm] = useState<CreatePatientPayload>({
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    citizenId: '',
    address: '',
  });
  const [isSubmittingCreatePatient, setIsSubmittingCreatePatient] = useState<boolean>(false);

  // Modal Thao tác kết quả lượt khám (Báo vắng hoặc Hủy lượt)
  const [outcomeVisit, setOutcomeVisit] = useState<ReceptionVisit | null>(null);
  const [outcomeAction, setOutcomeAction] = useState<'not_complete' | 'void'>('not_complete');
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState<boolean>(false);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState<boolean>(false);

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
        console.warn('[ReceptionCheckin] Lỗi tải danh mục tham chiếu:', err);
      });
  }, []);

  // 2. Tải ca khám theo ngày lọc (`slotDateFilter`)
  const loadSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const res = await publicDoctorService.searchSlots({
        date: slotDateFilter || undefined,
        size: 100,
      });
      setAvailableSlots(res.items);
    } catch (err) {
      console.warn('[ReceptionCheckin] Lỗi tải danh sách ca khám:', err);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [slotDateFilter]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Lookup maps
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

  // Danh sách các chuyên khoa có ca khám khả dụng
  const availableSpecialties = useMemo(() => {
    const map = new Map<number, string>();
    availableSlots.forEach((slot) => {
      if (slot.specialtyId && slot.specialtyName) {
        map.set(slot.specialtyId, slot.specialtyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [availableSlots]);

  // Lọc slots theo chuyên khoa
  const filteredSlots = useMemo(() => {
    let list = availableSlots;
    if (selectedSpecialtyFilter !== 'ALL') {
      list = list.filter((s) => s.specialtyId === selectedSpecialtyFilter);
    }
    return list;
  }, [availableSlots, selectedSpecialtyFilter]);

  // 3. Tự động nạp bệnh nhân nếu có `patientId` trên URL query params
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) {
      const idNum = Number(pid);
      if (!isNaN(idNum)) {
        receptionPatientService
          .getPatient(idNum)
          .then((p) => {
            setSelectedPatient(p);
            setActiveTab('direct');
            toast.info(`Đã nạp hồ sơ bệnh nhân: ${p.fullName}`);
          })
          .catch((err) => console.warn('[ReceptionCheckin] Không tìm thấy patientId:', err));
      }
    }
  }, [searchParams, toast]);

  // 4. Tải danh sách Hàng đợi chờ khám hôm nay (WAITING Queue)
  const loadWaitingVisits = useCallback(async () => {
    setIsLoadingWaiting(true);
    try {
      const res = await receptionCheckinService.getWaitingVisits({
        date: todayStr,
        roomId: waitingRoomFilter === 'ALL' ? undefined : waitingRoomFilter,
        size: 100,
        sort: 'queueNumber,ASC',
      });
      setWaitingVisits(res.items);
    } catch (err) {
      console.warn('[ReceptionCheckin] Lỗi tải hàng đợi chờ khám:', err);
    } finally {
      setIsLoadingWaiting(false);
    }
  }, [todayStr, waitingRoomFilter]);

  useEffect(() => {
    if (activeTab === 'waiting') {
      loadWaitingVisits();
    }
  }, [activeTab, loadWaitingVisits]);

  // 5. Tìm kiếm bệnh nhân cho luồng vãng lai
  const handleSearchPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const kw = patientSearchKw.trim();
    if (!kw) {
      toast.warning('Vui lòng nhập CCCD (12 số) hoặc Mã hồ sơ bệnh nhân.');
      return;
    }

    setIsSearchingPatient(true);
    setPatientSearchResults([]);
    try {
      if (/^[0-9]{12}$/.test(kw)) {
        const res = await receptionPatientService.searchByCitizenId({ citizenId: kw });
        setPatientSearchResults(res.items);
        if (res.items.length === 1) setSelectedPatient(res.items[0]);
      } else if (kw.toUpperCase().startsWith('P') || kw.length >= 6) {
        const res = await receptionPatientService.searchByPatientCode({ patientCode: kw });
        setPatientSearchResults(res.items);
        if (res.items.length === 1) setSelectedPatient(res.items[0]);
      } else {
        toast.info(
          'Để tra cứu theo họ tên, vui lòng vào trang Danh bạ Bệnh nhân để nhập kèm ngày sinh theo quy định.'
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Không tìm thấy hồ sơ phù hợp.');
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // 6. Thao tác Tiếp đón vãng lai (Direct Check-in Submit)
  const handleSubmitDirectCheckin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPatient) {
      toast.warning('Vui lòng chọn hoặc tạo mới hồ sơ bệnh nhân.');
      return;
    }
    if (!selectedSlot) {
      toast.warning('Vui lòng chọn 1 ca khám của bác sĩ đang trực.');
      return;
    }

    setIsSubmittingDirect(true);
    try {
      const visit = await receptionCheckinService.receiveDirect({
        patientId: selectedPatient.id,
        slotId: selectedSlot.id,
        reason: clinicalReason.trim() || undefined,
      });

      const doc = doctorLookup.get(selectedSlot.doctorId);
      const room = roomLookup.get(selectedSlot.roomId);

      setSuccessVisit(visit);
      setSuccessPatientInfo({
        fullName: selectedPatient.fullName,
        patientCode: selectedPatient.patientCode,
        doctorName: doc?.fullName ? `${doc.professionalTitle ? `${doc.professionalTitle} ` : ''}${doc.fullName}` : undefined,
        roomName: room?.name || `Phòng số ${visit.roomId}`,
      });
      setIsTicketModalOpen(true);
      toast.success(
        `Tiếp nhận thành công! Số thứ tự: #${visit.queueNumber} tại ${room?.name || `Phòng ${visit.roomId}`}`
      );

      // Reset form
      setSelectedSlot(null);
      setClinicalReason('');
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Không thể tiếp nhận ca khám này.');
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // 7. Tìm kiếm lịch hẹn cho luồng tiếp đón có hẹn
  const handleSearchAppointment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const kw = appointmentSearchKw.trim();
    if (!kw) {
      toast.warning('Vui lòng nhập Mã lịch hẹn khám.');
      return;
    }

    setIsSearchingApt(true);
    setFoundAppointment(null);
    try {
      const res = await receptionAppointmentService.getAppointments({
        date: todayStr,
        size: 50,
      });
      const match = res.items.find(
        (item) =>
          item.appointment.appointmentCode.toLowerCase() === kw.toLowerCase() ||
          item.phone === kw
      );

      if (match) {
        setFoundAppointment(match);
        toast.success(`Tìm thấy lịch hẹn: ${match.appointment.appointmentCode}`);
      } else {
        toast.warning('Không tìm thấy lịch hẹn hợp lệ trong ngày hôm nay.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể tra cứu lịch hẹn.');
    } finally {
      setIsSearchingApt(false);
    }
  };

  // 8. Thao tác Tiếp đón có hẹn (Booked Check-in Submit)
  const handleSubmitBookedCheckin = async () => {
    if (!foundAppointment) return;
    setIsSubmittingBooked(true);
    try {
      const visit = await receptionCheckinService.receiveBooked(foundAppointment.appointment.id);
      const doc = doctorLookup.get(foundAppointment.appointment.doctorId);
      const room = roomLookup.get(foundAppointment.appointment.roomId);

      setSuccessVisit(visit);
      setSuccessPatientInfo({
        fullName: foundAppointment.patientName,
        patientCode: `BN #${foundAppointment.patientId}`,
        doctorName: doc?.fullName ? `${doc.professionalTitle ? `${doc.professionalTitle} ` : ''}${doc.fullName}` : undefined,
        roomName: room?.name || `Phòng số ${visit.roomId}`,
      });
      setIsTicketModalOpen(true);
      toast.success(
        `Tiếp nhận thành công! Số thứ tự: #${visit.queueNumber} tại ${room?.name || `Phòng ${visit.roomId}`}`
      );

      setFoundAppointment(null);
      setAppointmentSearchKw('');
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Không thể tiếp nhận lịch hẹn này vào phòng khám.');
    } finally {
      setIsSubmittingBooked(false);
    }
  };

  // 9. Tạo nhanh hồ sơ bệnh nhân mới từ Modal
  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPatientForm.fullName.trim() || !createPatientForm.dateOfBirth) {
      toast.warning('Vui lòng nhập đầy đủ họ tên và ngày sinh.');
      return;
    }

    setIsSubmittingCreatePatient(true);
    try {
      const newPatient = await receptionPatientService.createPatient({
        ...createPatientForm,
        citizenId: createPatientForm.citizenId?.trim() || null,
      });
      toast.success(`Tạo hồ sơ thành công! Mã: ${newPatient.patientCode}`);
      setSelectedPatient(newPatient);
      setIsCreatePatientModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo mới hồ sơ bệnh nhân.');
    } finally {
      setIsSubmittingCreatePatient(false);
    }
  };

  // 10. Xử lý Thao tác Báo vắng (Not Complete) hoặc Hủy lượt tiếp nhận (Void)
  const handleOpenOutcomeModal = (visit: ReceptionVisit, action: 'not_complete' | 'void') => {
    setOutcomeVisit(visit);
    setOutcomeAction(action);
    setOutcomeReason(
      action === 'not_complete'
        ? 'Bệnh nhân bỏ dở, không vào phòng khi được gọi'
        : 'Thao tác tiếp nhận nhầm thông tin ca khám'
    );
    setIsOutcomeModalOpen(true);
  };

  const handleConfirmOutcome = async () => {
    if (!outcomeVisit || !outcomeReason.trim()) {
      toast.warning('Vui lòng nhập lý do thực hiện thao tác.');
      return;
    }

    setIsSubmittingOutcome(true);
    try {
      if (outcomeAction === 'not_complete') {
        await receptionCheckinService.notCompleteVisit(outcomeVisit.id, outcomeReason.trim());
        toast.success(`Đã cập nhật lượt khám ${outcomeVisit.visitCode} sang trạng thái Không hoàn thành.`);
      } else {
        await receptionCheckinService.voidVisit(outcomeVisit.id, outcomeReason.trim());
        toast.success(`Đã vô hiệu hóa (VOID) lượt tiếp nhận ${outcomeVisit.visitCode} thành công.`);
      }
      setIsOutcomeModalOpen(false);
      loadWaitingVisits();
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật trạng thái lượt khám.');
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  // Format time range
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sh = String(s.getHours()).padStart(2, '0');
    const sm = String(s.getMinutes()).padStart(2, '0');
    const eh = String(e.getHours()).padStart(2, '0');
    const em = String(e.getMinutes()).padStart(2, '0');
    return `${sh}:${sm} – ${eh}:${em}`;
  };

  // Ca khám đã chọn: bác sĩ & phòng
  const selectedDoctor = selectedSlot ? doctorLookup.get(selectedSlot.doctorId) : null;
  const selectedRoom = selectedSlot ? roomLookup.get(selectedSlot.roomId) : null;

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* 1. HEADER NGHIỆP VỤ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold mb-1">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Phân hệ Nghiệp vụ Tiếp đón Bệnh nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Stethoscope className="w-8 h-8 text-sky-600" />
            <span>Tiếp Đón Khám Bệnh &amp; Cấp Số Thứ Tự</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy trình tiếp nhận một chạm chuẩn y tế: Tra cứu hồ sơ, chọn ca khám trực tiếp và in phiếu thứ tự vào phòng Bác sĩ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={cn('w-4 h-4', isLoadingSlots && 'animate-spin')} />}
            onClick={() => {
              loadSlots();
              if (activeTab === 'waiting') loadWaitingVisits();
            }}
            className="text-xs font-semibold"
          >
            Làm mới ca trực
          </Button>
        </div>
      </div>

      {/* 2. THANH CHUYỂN TABS CHÍNH */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('direct')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
            activeTab === 'direct'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          )}
        >
          <User className="w-4 h-4" />
          <span>1. Tiếp Đón Vãng Lai Trực Tiếp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booked')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
            activeTab === 'booked'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          )}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>2. Tiếp Đón Có Hẹn Trước (Check-in)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waiting')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
            activeTab === 'waiting'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          )}
        >
          <Users className="w-4 h-4" />
          <span>3. Danh Sách Chờ Khám Hôm Nay ({waitingVisits.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: TIẾP ĐÓN TRỰC TIẾP (BỐ CỤC 2 CỘT CÂN ĐỐI 7/12 & 5/12)
         ========================================================================= */}
      {activeTab === 'direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =====================================================================
              CỘT TRÁI (7/12): LUỒNG NHẬP LIỆU LIỀN MẠCH (1 ➔ 2 ➔ 3)
             ===================================================================== */}
          <div className="lg:col-span-7 space-y-5">
            {/* -------------------------------------------------------------------
                BƯỚC 1: HỒ SƠ BỆNH NHÂN
               ------------------------------------------------------------------- */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  <span>Hồ Sơ Bệnh Nhân</span>
                </div>
                {!selectedPatient ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsCreatePatientModalOpen(true)}
                    className="text-xs py-1 h-7 text-sky-700 border-sky-200 hover:bg-sky-50 font-semibold"
                  >
                    Tạo mới hồ sơ
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearchResults([]);
                    }}
                    className="text-xs py-1 h-7 text-slate-400 hover:text-slate-600"
                  >
                    Đổi bệnh nhân
                  </Button>
                )}
              </div>

              {!selectedPatient ? (
                /* CHƯA CHỌN BỆNH NHÂN: Ô TÌM NHANH */
                <div className="space-y-3">
                  <form onSubmit={handleSearchPatient} className="flex gap-2">
                    <Input
                      id="direct-patient-search"
                      type="text"
                      placeholder="Quét hoặc nhập số CCCD (12 số) hoặc Mã hồ sơ BN..."
                      value={patientSearchKw}
                      onChange={(e) => setPatientSearchKw(e.target.value)}
                      leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSearchingPatient}
                      className="shrink-0 font-bold px-5"
                    >
                      Tìm kiếm
                    </Button>
                  </form>

                  {/* KẾT QUẢ TÌM THẤY */}
                  {patientSearchResults.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs text-slate-400 font-medium">Kết quả tìm kiếm:</div>
                      {patientSearchResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{p.fullName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              Mã: <strong className="text-sky-700">{p.patientCode}</strong> • CCCD:{' '}
                              {p.citizenId || 'Chưa cập nhật'}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ĐÃ CHỌN BỆNH NHÂN: THẺ THÔNG TIN SANG TRỌNG */
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {selectedPatient.gender === 'FEMALE' ? 'Nữ' : 'Nam'}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base">
                          {selectedPatient.fullName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Mã hồ sơ: <strong className="text-sky-700">{selectedPatient.patientCode}</strong>
                        </div>
                      </div>
                    </div>
                    {selectedPatient.userId !== null ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Đã có tài khoản</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Hồ sơ vãng lai
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-sky-200/60 text-slate-700">
                    <div>
                      <span className="text-slate-400">CCCD: </span>
                      <strong className="font-mono text-slate-900">{selectedPatient.citizenId || 'Chưa có'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Ngày sinh: </span>
                      <strong>{new Date(selectedPatient.dateOfBirth).toLocaleDateString('vi-VN')}</strong>
                    </div>
                    <div className="col-span-2 sm:col-span-1 truncate">
                      <span className="text-slate-400">Nơi ở: </span>
                      <span>{selectedPatient.address || 'Hà Nội'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------------
                BƯỚC 2: CHỌN CA KHÁM & BÁC SĨ ĐANG TRỰC
               ------------------------------------------------------------------- */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  <span>Chọn Ca Khám &amp; Bác Sĩ</span>
                </div>

                {/* BỘ LỌC NGÀY CA KHÁM */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSlotDateFilter(todayStr)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors',
                      slotDateFilter === todayStr
                        ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotDateFilter(tomorrowStr)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors',
                      slotDateFilter === tomorrowStr
                        ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Ngày mai
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotDateFilter('')}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors',
                      !slotDateFilter
                        ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Tất cả ca tới
                  </button>
                  <input
                    type="date"
                    value={slotDateFilter}
                    onChange={(e) => setSlotDateFilter(e.target.value)}
                    className="text-xs px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                    title="Chọn ngày cụ thể"
                  />
                </div>
              </div>

              {/* BỘ LỌC CHUYÊN KHOA */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">Lọc theo Chuyên khoa:</span>
                <select
                  value={selectedSpecialtyFilter}
                  onChange={(e) =>
                    setSelectedSpecialtyFilter(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="p-1.5 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-sky-500 font-medium text-xs text-slate-700"
                >
                  <option value="ALL">Tất cả chuyên khoa ({availableSpecialties.length})</option>
                  {availableSpecialties.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* LƯỚI CA KHÁM */}
              {isLoadingSlots ? (
                <div className="py-14 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <RefreshCw className="w-7 h-7 animate-spin text-sky-600" />
                  <span>Đang tải danh sách ca khám khả dụng...</span>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2 bg-slate-50/60 rounded-2xl border border-slate-200">
                  <AlertCircle className="w-7 h-7 mx-auto text-amber-500" />
                  <p className="font-medium text-slate-600">
                    Không có ca khám nào đang mở trong ngày{' '}
                    <strong>{slotDateFilter ? new Date(slotDateFilter).toLocaleDateString('vi-VN') : 'này'}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Bạn có thể bấm <strong>&ldquo;Tất cả ca tới&rdquo;</strong> hoặc <strong>&ldquo;Ngày mai&rdquo;</strong> ở trên để tiếp tục.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                  {filteredSlots.map((slot) => {
                    const doc = doctorLookup.get(slot.doctorId);
                    const room = roomLookup.get(slot.roomId);
                    const isSelected = selectedSlot?.id === slot.id;
                    const isFull = slot.available <= 0;

                    return (
                      <div
                        key={slot.id}
                        onClick={() => {
                          if (!isFull) setSelectedSlot(slot);
                        }}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all text-xs space-y-2',
                          isFull
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/30 shadow-xs cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs cursor-pointer'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>{formatTimeRange(slot.startAt, slot.endAt)}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 truncate max-w-[120px]">
                            {slot.specialtyName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          {doc?.avatarUrl ? (
                            <img
                              src={resolveAvatarSrc(doc.avatarUrl)!}
                              alt={doc.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              BS
                            </div>
                          )}
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate">
                              {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}
                              {doc?.fullName || `BS ID #${slot.doctorId}`}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {room?.name || slot.roomName || `Phòng số ${slot.roomId}`}
                            </div>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            Ngày {new Date(slot.startAt).toLocaleDateString('vi-VN')}
                          </span>
                          <span
                            className={cn(
                              'font-bold px-2 py-0.5 rounded-full',
                              slot.available > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            )}
                          >
                            {slot.available > 0 ? `Còn ${slot.available} chỗ` : 'Hết chỗ'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------------
                BƯỚC 3: LÝ DO KHÁM & TRIỆU CHỨNG LÂM SÀNG
               ------------------------------------------------------------------- */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-black">
                  3
                </span>
                <span>Lý Do Khám &amp; Triệu Chứng Lâm Sàng</span>
              </div>

              {/* CÁC GỢI Ý CHỌN NHANH */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Khám sức khỏe tổng quát',
                  'Sốt cao, ho khan, đau họng',
                  'Đau đầu, chóng mặt, mất ngủ',
                  'Đau bụng, khó tiêu, ợ chua',
                  'Đau tức ngực, hồi hộp khó thở',
                  'Tái khám theo hẹn',
                ].map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => setClinicalReason(symptom)}
                    className={cn(
                      'text-xs py-1 px-2.5 rounded-lg border transition-colors',
                      clinicalReason === symptom
                        ? 'bg-sky-600 border-sky-600 text-white font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {symptom}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Nhập triệu chứng cụ thể của người bệnh (tùy chọn)..."
                value={clinicalReason}
                onChange={(e) => setClinicalReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* =====================================================================
              CỘT PHẢI (5/12): PHIẾU TIẾP ĐÓN DỰ KIẾN & NÚT CHỐT CẤP SỐ (STICKY)
             ===================================================================== */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-slate-300 shadow-md space-y-5">
              {/* HEADER PHIẾU */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <img
                    src={hospitalConfig?.logoUrl || '/logo.png'}
                    alt="Logo Bệnh viện"
                    className="h-8 w-auto max-w-[90px] object-contain rounded bg-white p-0.5 border border-slate-200"
                  />
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">
                      Phiếu Tiếp Đón Dự Kiến
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Bệnh viện Đa khoa Quốc tế HTAC
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Chờ Cấp Số
                </span>
              </div>

              {/* TÓM TẮT THÔNG TIN NGƯỜI BỆNH */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    1. Người bệnh
                  </div>
                  {selectedPatient ? (
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {selectedPatient.fullName}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Mã: <strong className="font-mono text-sky-700">{selectedPatient.patientCode}</strong> • CCCD:{' '}
                        {selectedPatient.citizenId || 'Chưa cập nhật'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-amber-600 italic">Chưa chọn bệnh nhân (Bước 1)</div>
                  )}
                </div>

                {/* TÓM TẮT CA KHÁM */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    2. Ca khám &amp; Phòng tiếp nhận
                  </div>
                  {selectedSlot ? (
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>
                          {formatTimeRange(selectedSlot.startAt, selectedSlot.endAt)} (Ngày{' '}
                          {new Date(selectedSlot.startAt).toLocaleDateString('vi-VN')})
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Bác sĩ:{' '}
                        <strong>
                          {selectedDoctor?.professionalTitle ? `${selectedDoctor.professionalTitle} ` : ''}
                          {selectedDoctor?.fullName || `BS ID #${selectedSlot.doctorId}`}
                        </strong>
                      </div>
                      <div className="text-sky-700 font-bold">
                        {selectedRoom?.name || selectedSlot.roomName || `Phòng số ${selectedSlot.roomId}`} (
                        {selectedSlot.specialtyName})
                      </div>
                    </div>
                  ) : (
                    <div className="text-amber-600 italic">Chưa chọn ca khám (Bước 2)</div>
                  )}
                </div>

                {/* TÓM TẮT LÝ DO KHÁM */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    3. Lý do khám
                  </div>
                  <div className="text-slate-800 italic">
                    {clinicalReason ? `“${clinicalReason}”` : 'Chưa ghi nhận triệu chứng cụ thể'}
                  </div>
                </div>
              </div>

              {/* NÚT HÀNH ĐỘNG CHÍNH NỔI BẬT */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Printer className="w-5 h-5" />}
                  onClick={handleSubmitDirectCheckin}
                  isLoading={isSubmittingDirect}
                  disabled={!selectedPatient || !selectedSlot}
                  className="w-full font-black text-sm py-4 shadow-lg shadow-sky-600/30 bg-sky-600 hover:bg-sky-700 rounded-2xl"
                >
                  Tiếp Nhận &amp; Cấp Số Thứ Tự
                </Button>
                <div className="text-center text-[11px] text-slate-400 mt-2">
                  Hệ thống tự động cấp STT và đưa vào hàng đợi Bác sĩ ngay lập tức.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TIẾP ĐÓN THEO LỊCH HẸN TRỰC TUYẾN (BOOKED CHECK-IN)
         ========================================================================= */}
      {activeTab === 'booked' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="text-center space-y-2 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Tiếp Đón Bệnh Nhân Đã Có Hẹn
              </h2>
              <p className="text-xs text-slate-500">
                Nhập Mã lịch hẹn hoặc Số điện thoại để cấp số thứ tự vào phòng khám.
              </p>
            </div>

            <form onSubmit={handleSearchAppointment} className="flex gap-2 max-w-md mx-auto">
              <Input
                id="booked-search-input"
                type="text"
                placeholder="Nhập Mã hẹn (LH-...) hoặc Số điện thoại..."
                value={appointmentSearchKw}
                onChange={(e) => setAppointmentSearchKw(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                isLoading={isSearchingApt}
                className="font-bold px-6 shrink-0"
              >
                Tra cứu
              </Button>
            </form>

            {foundAppointment && (
              <div className="p-6 rounded-3xl bg-sky-50/70 border border-sky-200 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-sky-200">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Mã Lịch Hẹn</div>
                    <div className="text-lg font-mono font-black text-sky-800">
                      {foundAppointment.appointment.appointmentCode}
                    </div>
                  </div>
                  <Badge status={foundAppointment.appointment.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Người bệnh: </span>
                    <strong className="text-slate-900 text-sm">{foundAppointment.patientName}</strong>
                    <div className="text-slate-500 mt-0.5">SĐT: {foundAppointment.phone}</div>
                  </div>

                  <div>
                    <span className="text-slate-400">Khung giờ hẹn: </span>
                    <strong className="text-slate-900">
                      {formatTimeRange(
                        foundAppointment.appointment.startAt,
                        foundAppointment.appointment.endAt
                      )}
                    </strong>
                    <div className="text-slate-500 mt-0.5">Hôm nay ({todayStr})</div>
                  </div>

                  <div>
                    <span className="text-slate-400">Bác sĩ tiếp nhận: </span>
                    <strong className="text-slate-900">
                      {doctorLookup.get(foundAppointment.appointment.doctorId)?.fullName ||
                        `Bác sĩ ID #${foundAppointment.appointment.doctorId}`}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400">Phòng khám: </span>
                    <strong className="text-sky-700">
                      Phòng số {foundAppointment.appointment.roomId}
                    </strong>
                  </div>
                </div>

                {foundAppointment.reason && (
                  <div className="p-3 rounded-xl bg-white border border-sky-100 text-xs italic text-slate-700">
                    &ldquo;{foundAppointment.reason}&rdquo;
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFoundAppointment(null);
                      setAppointmentSearchKw('');
                    }}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<UserCheck className="w-4 h-4" />}
                    onClick={handleSubmitBookedCheckin}
                    isLoading={isSubmittingBooked}
                    className="font-bold px-8 shadow-md shadow-sky-600/20"
                  >
                    Xác Nhận Check-in &amp; Cấp Số Thứ Tự
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DANH SÁCH HÀNG ĐỢI CHỜ KHÁM HÔM NAY (WAITING QUEUE)
         ========================================================================= */}
      {activeTab === 'waiting' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Danh Sách Bệnh Nhân Đang Chờ Khám Hôm Nay ({waitingVisits.length})
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi bệnh nhân đang ở trạng thái WAITING tại các phòng khám chuyên khoa.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Lọc phòng:</span>
              <select
                value={waitingRoomFilter}
                onChange={(e) =>
                  setWaitingRoomFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
                className="text-xs p-1.5 px-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                <option value="ALL">Tất cả các phòng</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingWaiting ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-sky-600" />
              <span>Đang tải hàng đợi...</span>
            </div>
          ) : waitingVisits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p>Hiện không có bệnh nhân nào đang chờ khám trong hàng đợi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 text-center">STT</th>
                    <th className="py-3 px-4">Mã Lượt Khám</th>
                    <th className="py-3 px-4">Phòng Khám Tiếp Nhận</th>
                    <th className="py-3 px-4">Thời Gian Tiếp Đón</th>
                    <th className="py-3 px-4">Lý Do Khám</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waitingVisits.map((v) => {
                    const room = roomLookup.get(v.roomId);
                    const arrivalDate = new Date(v.arrivedAt);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-black text-sky-700 text-base bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200">
                            #{v.queueNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{v.visitCode}</div>
                          <div className="text-[10px] text-slate-400">ID BN: #{v.patientId}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">
                            {room?.name || `Phòng số ${v.roomId}`}
                          </div>
                          <div className="text-[11px] text-slate-500">Tòa nhà Khám bệnh HTAC</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {arrivalDate.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 max-w-xs italic text-slate-600">
                          {v.reason ? `“${v.reason}”` : 'Không có'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSuccessVisit(v);
                                setSuccessPatientInfo({
                                  fullName: `Bệnh nhân #${v.patientId}`,
                                  patientCode: v.visitCode,
                                  roomName: room?.name || `Phòng số ${v.roomId}`,
                                });
                                setIsTicketModalOpen(true);
                              }}
                              className="text-xs py-1 h-7 text-sky-700 hover:bg-sky-50"
                              title="In lại phiếu số thứ tự"
                            >
                              In phiếu
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOutcomeModal(v, 'not_complete')}
                              className="text-xs py-1 h-7 text-amber-700 hover:bg-amber-50 border-amber-200"
                            >
                              Báo vắng
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOutcomeModal(v, 'void')}
                              className="text-xs py-1 h-7 text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              Hủy lượt
                            </Button>
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
          MODAL: PHIẾU TIẾP NHẬN & SỐ THỨ TỰ (PRINTABLE QUEUE TICKET)
         ========================================================================= */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Phiếu Tiếp Nhận Khám Bệnh & Số Thứ Tự"
        description="Xuất trình phiếu này trước cửa phòng khám để Bác sĩ gọi vào khám."
        size="md"
      >
        {successVisit && (
          <div className="space-y-6 pt-2 text-center">
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 space-y-5 text-left text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <img
                    src={hospitalConfig?.logoUrl || '/logo.png'}
                    alt="Logo Bệnh viện"
                    className="h-8 w-auto max-w-[100px] object-contain rounded bg-white p-0.5 border border-slate-200"
                  />
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs">
                      {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Khoa Khám Bệnh • Hotline: {hospitalConfig?.phone || '1900 6868'}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                  {successVisit.visitCode}
                </span>
              </div>

              <div className="text-center py-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  SỐ THỨ TỰ KHÁM TRONG NGÀY
                </div>
                <div className="text-6xl font-black font-mono text-sky-700 tracking-tight">
                  #{successVisit.queueNumber}
                </div>
                <div className="text-xs font-bold text-slate-800 pt-1">
                  {successPatientInfo?.roomName || `Phòng khám số ${successVisit.roomId}`}
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Người bệnh:</span>
                  <strong className="text-slate-900 uppercase">
                    {successPatientInfo?.fullName || 'Người bệnh'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mã hồ sơ:</span>
                  <strong className="font-mono text-sky-700">
                    {successPatientInfo?.patientCode || successVisit.visitCode}
                  </strong>
                </div>
                {successPatientInfo?.doctorName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bác sĩ khám:</span>
                    <strong className="text-slate-900">{successPatientInfo.doctorName}</strong>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Giờ tiếp nhận:</span>
                  <span>
                    {new Date(successVisit.arrivedAt).toLocaleTimeString('vi-VN')} ngày{' '}
                    {new Date(successVisit.queueDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-center text-[11px] text-slate-500 italic">
                Vui lòng theo dõi màn hình hiển thị trước cửa phòng khám để vào khám khi đến lượt.
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
                onClick={() => setIsTicketModalOpen(false)}
                className="font-bold px-6"
              >
                Hoàn tất
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: TẠO NHANH HỒ SƠ BỆNH NHÂN MỚI (QUICK CREATE PATIENT)
         ========================================================================= */}
      <Modal
        isOpen={isCreatePatientModalOpen}
        onClose={() => setIsCreatePatientModalOpen(false)}
        title="Tạo Nhanh Hồ Sơ Bệnh Nhân Mới"
        description="Đăng ký hồ sơ y tế cho bệnh nhân vãng lai lần đầu đến khám."
        size="md"
      >
        <form onSubmit={handleCreatePatientSubmit} className="space-y-4 pt-1 text-xs">
          <Input
            id="quick-patient-name"
            label="Họ và tên bệnh nhân (*)"
            type="text"
            required
            placeholder="Ví dụ: Hoàng Thị Lan"
            value={createPatientForm.fullName}
            onChange={(e) =>
              setCreatePatientForm({ ...createPatientForm, fullName: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="quick-patient-dob"
              label="Ngày sinh (*)"
              type="date"
              required
              max={todayStr}
              value={createPatientForm.dateOfBirth}
              onChange={(e) =>
                setCreatePatientForm({ ...createPatientForm, dateOfBirth: e.target.value })
              }
            />

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Giới tính (*)</label>
              <select
                value={createPatientForm.gender}
                onChange={(e) =>
                  setCreatePatientForm({
                    ...createPatientForm,
                    gender: e.target.value as any,
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <Input
            id="quick-patient-citizenid"
            label="Số CCCD (12 chữ số tùy chọn)"
            type="text"
            maxLength={12}
            placeholder="00120200..."
            value={createPatientForm.citizenId || ''}
            onChange={(e) =>
              setCreatePatientForm({
                ...createPatientForm,
                citizenId: e.target.value.replace(/[^0-9]/g, ''),
              })
            }
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Địa chỉ cư trú</label>
            <textarea
              rows={2}
              placeholder="Địa chỉ thường trú..."
              value={createPatientForm.address || ''}
              onChange={(e) =>
                setCreatePatientForm({ ...createPatientForm, address: e.target.value })
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreatePatientModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingCreatePatient}
              className="font-bold"
            >
              Lưu &amp; Chọn bệnh nhân này
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: THAO TÁC HÀNG ĐỢI (BÁO VẮNG / HỦY LƯỢT)
         ========================================================================= */}
      <Modal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        title={outcomeAction === 'not_complete' ? 'Báo Vắng / Bỏ Dở Lượt Khám' : 'Hủy Lượt Tiếp Nhận (VOID)'}
        description={
          outcomeAction === 'not_complete'
            ? 'Chuyển trạng thái lượt khám sang Không hoàn thành khi bệnh nhân không vào phòng khám.'
            : 'Vô hiệu hóa lượt tiếp nhận do thao tác nhập nhầm.'
        }
        size="md"
      >
        {outcomeVisit && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div>
                Mã lượt khám: <strong>{outcomeVisit.visitCode}</strong> | STT:{' '}
                <strong>#{outcomeVisit.queueNumber}</strong>
              </div>
              <div>Phòng khám: Phòng số {outcomeVisit.roomId}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lý do (*):</label>
              <textarea
                rows={3}
                value={outcomeReason}
                onChange={(e) => setOutcomeReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsOutcomeModalOpen(false)}
                disabled={isSubmittingOutcome}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmOutcome}
                isLoading={isSubmittingOutcome}
                className={cn(
                  'font-bold',
                  outcomeAction === 'not_complete'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
