import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarRange,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Clock,
  User,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Lock,
  Edit2,
  RefreshCw,
  Info,
  CalendarCheck2,
  Stethoscope,
  Maximize2,
  X,
} from 'lucide-react';
import {
  clinicSlotService,
  type ClinicSlotResponse,
  type CreateClinicSessionRequest,
  type CreateClinicSlotRequest,
  type UpdateClinicSlotRequest,
} from '../../services/clinicSlotService';
import {
  clinicDirectoryService,
  type ClinicRoomResponse,
  type SpecialtyResponse,
} from '../../services/clinicDirectoryService';
import {
  staffAccountService,
  type StaffAccountResponse,
} from '../../services/staffAccountService';
import {
  doctorProfileService,
  type DoctorProfileAdminResponse,
} from '../../services/doctorProfileService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  getMondayOfWeek,
  getWeekDates,
  formatDateIso,
  formatDateVn,
  formatTimeVn,
  getDayOfWeekNameVn,
  toVietnamOffsetIso,
  toStartOfDayIso,
} from '../../lib/dateUtils';
import { cn } from '../../lib/utils';

export const ClinicSlotsPage: React.FC = () => {
  const { toast } = useToast();

  // === 1. STATE DỮ LIỆU DANH MỤC ===
  const [rooms, setRooms] = useState<ClinicRoomResponse[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyResponse[]>([]);
  const [doctors, setDoctors] = useState<StaffAccountResponse[]>([]);
  const [profiles, setProfiles] = useState<Map<number, DoctorProfileAdminResponse>>(new Map());
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // === 2. STATE ĐIỀU HƯỚNG LỊCH & BỘ LỌC ===
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [filterSpecialtyId, setFilterSpecialtyId] = useState<string>('ALL');
  const [filterRoomId, setFilterRoomId] = useState<string>('ALL');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // Danh sách slots theo tuần
  const [slots, setSlots] = useState<ClinicSlotResponse[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // === 3. STATE DRAWER & MODAL ===
  const [selectedSlot, setSelectedSlot] = useState<ClinicSlotResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modal tạo hàng loạt theo tuần (Batch Session)
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchRoomId, setBatchRoomId] = useState<string>('');
  const [batchDoctorId, setBatchDoctorId] = useState<string>('');
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [batchStartTime, setBatchStartTime] = useState<string>('08:00');
  const [batchEndTime, setBatchEndTime] = useState<string>('11:30');
  const [batchDuration, setBatchDuration] = useState<number>(30);
  const [batchCapacity, setBatchCapacity] = useState<number>(2);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Modal tạo slot đơn lẻ
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [singleRoomId, setSingleRoomId] = useState<string>('');
  const [singleDoctorId, setSingleDoctorId] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>(() => formatDateIso(new Date()));
  const [singleStartTime, setSingleStartTime] = useState<string>('08:00');
  const [singleEndTime, setSingleEndTime] = useState<string>('08:30');
  const [singleCapacity, setSingleCapacity] = useState<number>(2);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Modal điều chỉnh slot (Update)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateSlotData, setUpdateSlotData] = useState<{
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
  } | null>(null);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Modal xác nhận đóng slot (Close Confirm)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isClosingSlot, setIsClosingSlot] = useState(false);

  // Lightbox xem ảnh đại diện bác sĩ phóng to
  const [zoomedAvatar, setZoomedAvatar] = useState<{ url: string; name: string } | null>(null);

  // 7 ngày của tuần hiện tại
  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);

  // Map tra cứu nhanh
  const roomsMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const specialtiesMap = useMemo(() => new Map(specialties.map((s) => [s.id, s])), [specialties]);
  const doctorsMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  // === 4. LOAD DANH MỤC BAN ĐẦU ===
  const loadDirectoryData = useCallback(async () => {
    setIsLoadingDirectory(true);
    try {
      const [roomsRes, specsRes, staffsRes, profilesRes] = await Promise.all([
        clinicDirectoryService.listClinicRooms({ size: 100 }),
        clinicDirectoryService.listSpecialties({ size: 100 }),
        staffAccountService.listStaffAccounts({ size: 100 }),
        doctorProfileService.listProfiles({ size: 100 }),
      ]);

      setRooms(roomsRes.items || []);
      setSpecialties(specsRes.items || []);
      // Lọc danh sách bác sĩ
      const doctorStaffs = (staffsRes.items || []).filter(
        (s: StaffAccountResponse) => s.role === 'DOCTOR'
      );
      setDoctors(doctorStaffs);

      const profileMap = new Map<number, DoctorProfileAdminResponse>();
      (profilesRes.items || []).forEach((p: DoctorProfileAdminResponse) => {
        profileMap.set(p.userId, p);
      });
      setProfiles(profileMap);
    } catch {
      toast({
        type: 'error',
        title: 'Lỗi nạp danh mục',
        message: 'Không thể tải danh sách phòng khám hoặc bác sĩ.',
      });
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDirectoryData();
  }, [loadDirectoryData]);

  // === 5. LOAD DANH SÁCH SLOTS THEO TUẦN & BỘ LỌC ===
  const loadSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      // Backend: from gồm đầu (Thứ Hai 00:00:00+07:00), to loại cuối (Thứ Hai tuần kế tiếp 00:00:00+07:00)
      const weekDays = getWeekDates(currentMonday);
      const fromStr = toStartOfDayIso(weekDays[0]);
      const nextMonday = new Date(currentMonday);
      nextMonday.setDate(nextMonday.getDate() + 7);
      const toStr = toStartOfDayIso(nextMonday);

      const params: {
        from: string;
        to: string;
        size: number;
        roomId?: number;
        doctorId?: number;
      } = {
        from: fromStr,
        to: toStr,
        size: 500, // Đủ lớn để lấy trọn vẹn tuần
      };

      if (filterRoomId !== 'ALL') {
        params.roomId = Number(filterRoomId);
      }
      if (filterDoctorId !== 'ALL') {
        params.doctorId = Number(filterDoctorId);
      }

      const res = await clinicSlotService.listSlots(params);
      setSlots(res.items || []);
    } catch {
      toast({
        type: 'error',
        title: 'Lỗi tải lịch khám',
        message: 'Không thể tải danh sách khung khám của tuần được chọn.',
      });
    } finally {
      setIsLoadingSlots(false);
    }
  }, [currentMonday, filterRoomId, filterDoctorId, toast]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Lọc client-side theo Chuyên khoa và Trạng thái nhận hẹn
  const displaySlots = useMemo(() => {
    let list = slots;
    if (filterSpecialtyId !== 'ALL') {
      const specId = Number(filterSpecialtyId);
      list = list.filter((slot) => {
        const room = roomsMap.get(slot.roomId);
        return room && room.specialtyId === specId;
      });
    }
    if (filterStatus !== 'ALL') {
      list = list.filter((slot) => slot.status === filterStatus);
    }
    return list;
  }, [slots, filterSpecialtyId, filterStatus, roomsMap]);

  // === 6. ĐIỀU HƯỚNG TUẦN ===
  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentMonday(getMondayOfWeek(new Date()));
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setCurrentMonday(getMondayOfWeek(new Date(val)));
    }
  };

  // === 7. NHÓM SLOTS THEO NGÀY (DÀNH CHO VIEW LỊCH) ===
  const slotsByDateMap = useMemo(() => {
    const map = new Map<string, ClinicSlotResponse[]>();
    weekDates.forEach((d) => {
      map.set(formatDateIso(d), []);
    });

    displaySlots.forEach((slot) => {
      // startAt là ISO instant (UTC), cần chuyển về ngày theo giờ local Việt Nam
      const slotDate = new Date(slot.startAt);
      const dateKey = formatDateIso(slotDate);
      const list = map.get(dateKey) || [];
      list.push(slot);
      map.set(dateKey, list);
    });

    // Sắp xếp slot theo startAt tăng dần trong từng ngày
    map.forEach((list) => {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    });

    return map;
  }, [weekDates, displaySlots]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = displaySlots.length;
    const openCount = displaySlots.filter((s) => s.status === 'OPEN').length;
    const closedCount = displaySlots.filter((s) => s.status === 'CLOSED').length;
    const uniqueDoctors = new Set(displaySlots.map((s) => s.doctorId)).size;
    return { total, openCount, closedCount, uniqueDoctors };
  }, [displaySlots]);

  // Danh sách bác sĩ được gợi ý theo chuyên khoa của phòng (khi tạo batch/single)
  const getDoctorsForRoom = (roomIdStr: string) => {
    if (!roomIdStr) return doctors;
    const room = roomsMap.get(Number(roomIdStr));
    if (!room) return doctors;
    // Lọc các bác sĩ có profile cùng specialtyId
    return doctors.filter((doc) => {
      const profile = profiles.get(doc.id);
      return profile?.specialtyId === room.specialtyId;
    });
  };

  // === 8. XỬ LÝ TẠO HÀNG LOẠT (BATCH SESSION) ===
  const handleOpenBatch = () => {
    // Mặc định chọn các ngày còn trong tương lai của tuần hiện tại (từ ngày mai hoặc hôm nay)
    const todayStr = formatDateIso(new Date());
    const validDates = weekDates
      .map((d) => formatDateIso(d))
      .filter((dateStr) => dateStr >= todayStr);

    setBatchDates(validDates.length > 0 ? validDates : [formatDateIso(weekDates[0])]);
    setBatchRoomId('');
    setBatchDoctorId('');
    setBatchStartTime('08:00');
    setBatchEndTime('11:30');
    setBatchDuration(30);
    setBatchCapacity(2);
    setIsBatchOpen(true);
  };

  const handleToggleBatchDate = (dateStr: string) => {
    setBatchDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const handleSelectWorkdays = () => {
    const workdays = weekDates.slice(0, 5).map((d) => formatDateIso(d));
    setBatchDates(workdays);
  };

  const handleSelectAllDays = () => {
    const all = weekDates.map((d) => formatDateIso(d));
    setBatchDates(all);
  };

  const handleClearDays = () => {
    setBatchDates([]);
  };

  // Tính toán số lượng slot dự kiến cho batch
  const batchCalculation = useMemo(() => {
    if (!batchStartTime || !batchEndTime || batchDuration <= 0) {
      return { valid: false, error: 'Chưa nhập đủ khung giờ', slotsPerDay: 0, totalSlots: 0, slotsList: [] };
    }
    const [startH, startM] = batchStartTime.split(':').map(Number);
    const [endH, endM] = batchEndTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (endTotal <= startTotal) {
      return { valid: false, error: 'Giờ kết thúc phải sau giờ bắt đầu', slotsPerDay: 0, totalSlots: 0, slotsList: [] };
    }
    const diff = endTotal - startTotal;
    if (diff % batchDuration !== 0) {
      return {
        valid: false,
        error: `Khoảng cách ${diff} phút không chia hết cho thời lượng ${batchDuration} phút`,
        slotsPerDay: 0,
        totalSlots: 0,
        slotsList: [],
      };
    }
    const slotsPerDay = diff / batchDuration;
    const totalSlots = slotsPerDay * batchDates.length;

    // Tạo danh sách preview các khung
    const slotsList: string[] = [];
    let currentMin = startTotal;
    for (let i = 0; i < slotsPerDay; i++) {
      const nextMin = currentMin + batchDuration;
      const sh = String(Math.floor(currentMin / 60)).padStart(2, '0');
      const sm = String(currentMin % 60).padStart(2, '0');
      const eh = String(Math.floor(nextMin / 60)).padStart(2, '0');
      const em = String(nextMin % 60).padStart(2, '0');
      slotsList.push(`${sh}:${sm} – ${eh}:${em}`);
      currentMin = nextMin;
    }

    return { valid: true, error: null, slotsPerDay, totalSlots, slotsList };
  }, [batchStartTime, batchEndTime, batchDuration, batchDates]);

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchRoomId || !batchDoctorId) {
      toast({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn phòng khám và bác sĩ phụ trách.',
      });
      return;
    }
    if (batchDates.length === 0) {
      toast({
        type: 'warning',
        title: 'Chưa chọn ngày',
        message: 'Vui lòng chọn ít nhất 1 ngày trong tuần để tạo lịch.',
      });
      return;
    }
    if (!batchCalculation.valid) {
      toast({
        type: 'error',
        title: 'Cấu hình giờ không hợp lệ',
        message: batchCalculation.error || 'Vui lòng kiểm tra lại khoảng giờ và thời lượng.',
      });
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const payload: CreateClinicSessionRequest = {
        roomId: Number(batchRoomId),
        doctorId: Number(batchDoctorId),
        dates: batchDates,
        startTime: batchStartTime,
        endTime: batchEndTime,
        durationMinutes: Number(batchDuration),
        capacity: Number(batchCapacity),
      };

      const createdList = await clinicSlotService.createSession(payload);
      toast({
        type: 'success',
        title: 'Lập lịch thành công',
        message: `Đã khởi tạo thành công ${createdList.length} ca khám cho tuần.`,
      });
      setIsBatchOpen(false);
      loadSlots();
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string; code?: string })?.message ||
        'Không thể lập lịch hàng loạt. Vui lòng kiểm tra xung đột trùng giờ.';
      toast({
        type: 'error',
        title: 'Lập lịch thất bại',
        message: errorMsg,
      });
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // === 9. XỬ LÝ TẠO CA KHÁM LẺ (SINGLE SLOT) ===
  const handleOpenSingle = () => {
    setSingleRoomId('');
    setSingleDoctorId('');
    setSingleDate(formatDateIso(new Date()));
    setSingleStartTime('08:00');
    setSingleEndTime('08:30');
    setSingleCapacity(2);
    setIsSingleOpen(true);
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleRoomId || !singleDoctorId || !singleDate || !singleStartTime || !singleEndTime) {
      toast({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đầy đủ các trường bắt buộc.',
      });
      return;
    }

    const startAt = toVietnamOffsetIso(singleDate, singleStartTime);
    const endAt = toVietnamOffsetIso(singleDate, singleEndTime);

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      toast({
        type: 'error',
        title: 'Giờ không hợp lệ',
        message: 'Giờ kết thúc phải sau giờ bắt đầu.',
      });
      return;
    }

    setIsSubmittingSingle(true);
    try {
      const payload: CreateClinicSlotRequest = {
        roomId: Number(singleRoomId),
        doctorId: Number(singleDoctorId),
        startAt,
        endAt,
        capacity: Number(singleCapacity),
      };
      await clinicSlotService.createSlot(payload);
      toast({
        type: 'success',
        title: 'Tạo ca khám thành công',
        message: 'Ca khám đơn lẻ đã được thêm vào lịch trình.',
      });
      setIsSingleOpen(false);
      loadSlots();
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        'Không thể tạo ca khám. Kiểm tra bác sĩ/phòng có bị trùng giờ không.';
      toast({
        type: 'error',
        title: 'Tạo ca thất bại',
        message: errorMsg,
      });
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // === 10. XỬ LÝ ĐÓNG KHUNG GIỜ (CLOSE SLOT) ===
  const handleConfirmCloseSlot = async () => {
    if (!selectedSlot) return;
    setIsClosingSlot(true);
    try {
      await clinicSlotService.closeSlot(selectedSlot.id);
      toast({
        type: 'success',
        title: 'Đã đóng ca khám',
        message: `Ca khám #${selectedSlot.id} đã đóng nhận đăng ký thành công.`,
      });
      setIsCloseConfirmOpen(false);
      setIsDetailOpen(false);
      loadSlots();
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message || 'Không thể đóng ca khám vào lúc này.';
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: errorMsg,
      });
    } finally {
      setIsClosingSlot(false);
    }
  };

  // === 11. XỬ LÝ ĐIỀU CHỈNH KHUNG GIỜ (UPDATE) ===
  const handleOpenUpdate = () => {
    if (!selectedSlot) return;
    const startDate = new Date(selectedSlot.startAt);
    const endDate = new Date(selectedSlot.endAt);

    setUpdateSlotData({
      id: selectedSlot.id,
      date: formatDateIso(startDate),
      startTime: formatTimeVn(startDate),
      endTime: formatTimeVn(endDate),
      capacity: selectedSlot.capacity,
    });
    setIsUpdateOpen(true);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateSlotData) return;

    const startAt = toVietnamOffsetIso(updateSlotData.date, updateSlotData.startTime);
    const endAt = toVietnamOffsetIso(updateSlotData.date, updateSlotData.endTime);

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      toast({
        type: 'error',
        title: 'Giờ không hợp lệ',
        message: 'Giờ kết thúc phải sau giờ bắt đầu.',
      });
      return;
    }

    setIsSubmittingUpdate(true);
    try {
      const payload: UpdateClinicSlotRequest = {
        startAt,
        endAt,
        capacity: Number(updateSlotData.capacity),
      };
      const updated = await clinicSlotService.updateSlot(updateSlotData.id, payload);
      toast({
        type: 'success',
        title: 'Điều chỉnh thành công',
        message: `Ca khám #${updated.id} đã được cập nhật thành công.`,
      });
      setSelectedSlot(updated);
      setIsUpdateOpen(false);
      loadSlots();
    } catch (err: unknown) {
      const errorMsg =
        (err as { message?: string })?.message ||
        'Không thể điều chỉnh ca khám. (Đã có lượt thực tế hoặc giảm sức chứa khi có hẹn).';
      toast({
        type: 'error',
        title: 'Điều chỉnh thất bại',
        message: errorMsg,
      });
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Xem chi tiết slot khi click dòng hoặc click thẻ
  const handleSelectSlot = (slot: ClinicSlotResponse) => {
    setSelectedSlot(slot);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & QUICK STATS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Lập lịch & Quản lý Phân ca khám
            </h1>
            <Badge status="ACTIVE" variant="subtle" withDot={false}>
              M03 Scheduling
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý khung giờ khám bệnh, phân công bác sĩ & phòng khám theo tuần tiêu chuẩn HTAC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={loadSlots}
            disabled={isLoadingSlots}
            leftIcon={<RefreshCw className={cn('w-4 h-4', isLoadingSlots && 'animate-spin')} />}
          >
            Làm mới
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleOpenSingle}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo ca khám lẻ
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenBatch}
            leftIcon={<CalendarRange className="w-4 h-4" />}
          >
            Lập lịch theo tuần (Batch)
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tổng ca trong tuần
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Đang nhận hẹn (OPEN)
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.openCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Đã đóng nhận hẹn
            </div>
            <div className="text-2xl font-bold text-slate-600">{stats.closedCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Bác sĩ có lịch
            </div>
            <div className="text-2xl font-bold text-indigo-600">{stats.uniqueDoctors}</div>
          </div>
        </div>
      </div>

      {/* 2. ĐIỀU HƯỚNG TUẦN & THANH BỘ LỌC */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Hàng 1: Điều hướng tuần */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Tuần trước"
                className="p-1.5 rounded-md hover:bg-white text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-white text-slate-700 transition-colors"
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                title="Tuần sau"
                className="p-1.5 rounded-md hover:bg-white text-slate-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-base font-bold text-slate-800 ml-2">
              Tuần: {formatDateVn(weekDates[0])} – {formatDateVn(weekDates[6])}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <span>Nhảy tới ngày:</span>
              <input
                type="date"
                onChange={handleDateSelect}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Chế độ xem: Lịch tuần vs Danh sách */}
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Lịch tuần
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <List className="w-3.5 h-3.5" />
                Bảng danh sách
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc Chuyên khoa, Phòng, Bác sĩ, Trạng thái */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Chuyên khoa"
            value={filterSpecialtyId}
            onChange={(e) => setFilterSpecialtyId(e.target.value)}
            disabled={isLoadingDirectory}
          >
            <option value="ALL">-- Tất cả chuyên khoa --</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>

          <Select
            label="Phòng khám"
            value={filterRoomId}
            onChange={(e) => setFilterRoomId(e.target.value)}
            disabled={isLoadingDirectory}
          >
            <option value="ALL">-- Tất cả phòng khám --</option>
            {rooms
              .filter((r) =>
                filterSpecialtyId === 'ALL' ? true : r.specialtyId === Number(filterSpecialtyId)
              )
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
          </Select>

          <Select
            label="Bác sĩ phụ trách"
            value={filterDoctorId}
            onChange={(e) => setFilterDoctorId(e.target.value)}
            disabled={isLoadingDirectory}
          >
            <option value="ALL">-- Tất cả bác sĩ --</option>
            {doctors
              .filter((d) => {
                if (filterSpecialtyId === 'ALL') return true;
                const p = profiles.get(d.id);
                return p?.specialtyId === Number(filterSpecialtyId);
              })
              .map((d) => (
                <option key={d.id} value={d.id}>
                  BS. {d.fullName}
                </option>
              ))}
          </Select>

          <Select
            label="Trạng thái nhận hẹn"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="OPEN">Đang nhận hẹn (OPEN)</option>
            <option value="CLOSED">Đã đóng nhận hẹn (CLOSED)</option>
          </Select>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH: VIEW LỊCH TUẦN HOẶC TABLE */}
      {viewMode === 'calendar' ? (
        /* === WEEKLY CALENDAR VIEW === */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header 7 ngày */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center divide-x divide-slate-200">
            {weekDates.map((date, idx) => {
              const dateStr = formatDateIso(date);
              const isToday = dateStr === formatDateIso(new Date());
              const daySlots = slotsByDateMap.get(dateStr) || [];

              return (
                <div
                  key={idx}
                  className={cn(
                    'py-3 px-1 transition-colors',
                    isToday ? 'bg-blue-50/70 border-b-2 border-b-blue-600' : ''
                  )}
                >
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {getDayOfWeekNameVn(date)}
                  </div>
                  <div className="mt-0.5 flex items-center justify-center gap-1.5">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isToday ? 'text-blue-700' : 'text-slate-800'
                      )}
                    >
                      {formatDateVn(date).slice(0, 5)}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.2 bg-blue-600 text-[10px] font-bold text-white rounded-full">
                        Nay
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">
                    {daySlots.length} ca khám
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid thân lịch: 7 cột */}
          <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[520px] bg-slate-50/30">
            {weekDates.map((date, idx) => {
              const dateStr = formatDateIso(date);
              const daySlots = slotsByDateMap.get(dateStr) || [];

              return (
                <div key={idx} className="p-2 space-y-2 flex flex-col">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <CalendarIcon className="w-6 h-6 opacity-40 mb-1" />
                      <span className="text-xs font-normal">Trống lịch</span>
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const room = roomsMap.get(slot.roomId);
                      const doctor = doctorsMap.get(slot.doctorId);
                      const specialty = room ? specialtiesMap.get(room.specialtyId) : null;
                      const isOpen = slot.status === 'OPEN';

                      return (
                        <div
                          key={slot.id}
                          onClick={() => handleSelectSlot(slot)}
                          className={cn(
                            'p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 shadow-xs hover:shadow-md select-none',
                            isOpen
                              ? 'bg-white border-emerald-200 hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400'
                              : 'bg-slate-100/90 border-slate-300 opacity-80 hover:opacity-100 hover:border-slate-400'
                          )}
                        >
                          {/* Khung giờ & Badge trạng thái */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                {formatTimeVn(slot.startAt)} – {formatTimeVn(slot.endAt)}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                isOpen
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              )}
                            >
                              {isOpen ? 'Mở' : 'Đóng'}
                            </span>
                          </div>

                          {/* Bác sĩ phụ trách */}
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {doctor ? doctor.fullName : `BS #${slot.doctorId}`}
                            </span>
                          </div>

                          {/* Phòng khám & Chuyên khoa */}
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {room ? room.name : `P.${slot.roomId}`}
                            </span>
                          </div>
                          {specialty && (
                            <div className="text-[10px] text-blue-600 font-medium truncate ml-4">
                              {specialty.name}
                            </div>
                          )}

                          {/* Sức chứa */}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Sức chứa:</span>
                            <span className="font-semibold text-slate-700">
                              {slot.capacity} BN
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* === TABLE VIEW (Click dòng xem chi tiết theo UX chuẩn) === */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Ngày khám</th>
                  <th className="py-3 px-4">Khung giờ</th>
                  <th className="py-3 px-4">Bác sĩ phụ trách</th>
                  <th className="py-3 px-4">Phòng khám</th>
                  <th className="py-3 px-4 text-center">Sức chứa</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySlots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Không tìm thấy ca khám nào thỏa mãn điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  displaySlots.map((slot) => {
                    const room = roomsMap.get(slot.roomId);
                    const doctor = doctorsMap.get(slot.doctorId);
                    const specialty = room ? specialtiesMap.get(room.specialtyId) : null;
                    const slotDate = new Date(slot.startAt);

                    return (
                      <tr
                        key={slot.id}
                        onClick={() => handleSelectSlot(slot)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 font-medium">
                          #{slot.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {getDayOfWeekNameVn(slotDate)}, {formatDateVn(slotDate)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {formatTimeVn(slot.startAt)} – {formatTimeVn(slot.endAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {doctor ? doctor.fullName : `BS #${slot.doctorId}`}
                          </div>
                          <div className="text-xs text-slate-400">
                            {specialty ? specialty.name : 'Chuyên khoa'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {room ? room.name : `P.${slot.roomId}`}
                          </div>
                          {room?.location && (
                            <div className="text-xs text-slate-400">{room.location}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {slot.capacity} BN
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            status={slot.status === 'OPEN' ? 'OPEN' : 'CLOSED'}
                            variant="subtle"
                          />
                        </td>
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()} // Tránh kích hoạt click row
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectSlot(slot)}
                            >
                              Chi tiết
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DRAWER CHI TIẾT CA KHÁM (SLOT DETAIL) */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Chi tiết Ca khám #${selectedSlot?.id || ''}`}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {selectedSlot?.status === 'OPEN' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCloseConfirmOpen(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Đóng nhận đăng ký
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedSlot?.status === 'OPEN' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenUpdate}
                  leftIcon={<Edit2 className="w-4 h-4" />}
                >
                  Điều chỉnh ca
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
                Đóng lại
              </Button>
            </div>
          </div>
        }
      >
        {selectedSlot && (
          <div className="space-y-6">
            {/* Header trạng thái */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Trạng thái nhận đăng ký
                </div>
                <div className="mt-1">
                  <Badge
                    status={selectedSlot.status === 'OPEN' ? 'OPEN' : 'CLOSED'}
                    variant="solid"
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sức chứa tối đa
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {selectedSlot.capacity} Bệnh nhân
                </div>
              </div>
            </div>

            {/* Thông tin thời gian */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Thời gian khám bệnh
              </h3>
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày khám:</span>
                  <span className="font-semibold text-slate-800">
                    {getDayOfWeekNameVn(new Date(selectedSlot.startAt))},{' '}
                    {formatDateVn(selectedSlot.startAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khung giờ:</span>
                  <span className="font-bold text-blue-700">
                    {formatTimeVn(selectedSlot.startAt)} – {formatTimeVn(selectedSlot.endAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Múi giờ chuẩn:</span>
                  <span className="text-slate-700">Asia/Ho_Chi_Minh (UTC+7)</span>
                </div>
              </div>
            </div>

            {/* Thông tin Bác sĩ phụ trách */}
            {(() => {
              const doc = doctorsMap.get(selectedSlot.doctorId);
              const prof = profiles.get(selectedSlot.doctorId);
              const spec = prof ? specialtiesMap.get(prof.specialtyId) : null;

              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Bác sĩ phụ trách
                  </h3>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-4">
                    {prof?.avatarUrl ? (
                      <div className="relative group cursor-pointer shrink-0">
                        <img
                          src={prof.avatarUrl}
                          alt={doc?.fullName || 'Bác sĩ'}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs"
                          onClick={() =>
                            setZoomedAvatar({
                              url: prof.avatarUrl!,
                              name: doc?.fullName || 'Bác sĩ',
                            })
                          }
                        />
                        <div
                          className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            setZoomedAvatar({
                              url: prof.avatarUrl!,
                              name: doc?.fullName || 'Bác sĩ',
                            })
                          }
                        >
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <User className="w-8 h-8" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <div className="font-bold text-slate-900 text-base">
                        {prof?.professionalTitle || 'Bác sĩ'} {doc?.fullName || `#${selectedSlot.doctorId}`}
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        {spec ? spec.name : 'Đa khoa'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {prof?.position || 'Bác sĩ điều trị'} • SĐT: {doc?.phone || 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Thông tin Phòng khám */}
            {(() => {
              const r = roomsMap.get(selectedSlot.roomId);
              const spec = r ? specialtiesMap.get(r.specialtyId) : null;

              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Phòng khám & Địa điểm
                  </h3>
                  <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tên phòng:</span>
                      <span className="font-semibold text-slate-800">{r?.name || `Phòng #${selectedSlot.roomId}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã phòng:</span>
                      <span className="font-mono text-slate-700">{r?.code || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chuyên khoa:</span>
                      <span className="text-blue-700 font-medium">{spec?.name || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vị trí:</span>
                      <span className="text-slate-700">{r?.location || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ghi chú quy tắc nghiệp vụ */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quy định nghiệp vụ M03.02:</strong> Khung giờ đã đóng sẽ không nhận thêm
                đăng ký mới nhưng lịch sử và các lịch hẹn đã có vẫn được bảo toàn nguyên vẹn trên
                hệ thống.
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 5. DRAWER LẬP LỊCH THEO TUẦN (BATCH SESSION CREATION) */}
      <Drawer
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title="Lập lịch khám theo tuần (Batch Session)"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500">
              Tổng số ca dự kiến:{' '}
              <span className="font-bold text-blue-600">{batchCalculation.totalSlots} ca</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsBatchOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitBatch}
                disabled={isSubmittingBatch || !batchCalculation.valid}
                isLoading={isSubmittingBatch}
                leftIcon={<CalendarCheck2 className="w-4 h-4" />}
              >
                Khởi tạo lịch tuần
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmitBatch} className="space-y-6">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Tuần lập lịch:</strong> {formatDateVn(weekDates[0])} – {formatDateVn(weekDates[6])}.
              Tất cả các ca khám được sinh ra sẽ tự động kiểm tra trùng giờ và kiểm tra tương thích
              chuyên khoa bác sĩ và phòng khám.
            </div>
          </div>

          {/* Chọn Phòng khám & Bác sĩ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Phòng khám (*)"
                value={batchRoomId}
                onChange={(e) => {
                  setBatchRoomId(e.target.value);
                  setBatchDoctorId(''); // Reset bác sĩ khi đổi phòng
                }}
                required
              >
                <option value="">-- Chọn phòng khám --</option>
                {rooms
                  .filter((r) => r.active)
                  .map((r) => {
                    const spec = specialtiesMap.get(r.specialtyId);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code}) — {spec?.name || 'Khoa'}
                      </option>
                    );
                  })}
              </Select>
            </div>

            <div>
              <Select
                label="Bác sĩ phụ trách (*)"
                value={batchDoctorId}
                onChange={(e) => setBatchDoctorId(e.target.value)}
                required
                disabled={!batchRoomId}
              >
                <option value="">-- Chọn bác sĩ cùng chuyên khoa --</option>
                {getDoctorsForRoom(batchRoomId).map((d) => {
                  const prof = profiles.get(d.id);
                  return (
                    <option key={d.id} value={d.id}>
                      {prof?.professionalTitle || 'BS.'} {d.fullName}
                    </option>
                  );
                })}
              </Select>
              {batchRoomId && getDoctorsForRoom(batchRoomId).length === 0 && (
                <p className="mt-1 text-xs text-rose-600">
                  Chưa có bác sĩ nào thuộc cùng chuyên khoa của phòng khám này.
                </p>
              )}
            </div>
          </div>

          {/* Chọn các ngày trong tuần */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Chọn ngày khám trong tuần (*)
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSelectWorkdays}
                  className="px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 font-medium"
                >
                  T2 – T6
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 font-medium"
                >
                  Cả tuần
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleClearDays}
                  className="px-2 py-0.5 rounded text-slate-500 hover:bg-slate-100"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {weekDates.map((date) => {
                const dateStr = formatDateIso(date);
                const isSelected = batchDates.includes(dateStr);
                const isPast = dateStr < formatDateIso(new Date());

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleToggleBatchDate(dateStr)}
                    className={cn(
                      'p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5',
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                      isPast && 'opacity-60'
                    )}
                  >
                    <span className="text-[11px] uppercase">{getDayOfWeekNameVn(date)}</span>
                    <span className="text-xs font-bold">{formatDateVn(date).slice(0, 5)}</span>
                    {isPast && <span className="text-[9px] text-slate-400">Đã qua</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cấu hình khung giờ & ca khám */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Khung giờ & Phân ca
              </label>
              {/* Presets */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Ca mẫu:</span>
                <button
                  type="button"
                  onClick={() => {
                    setBatchStartTime('08:00');
                    setBatchEndTime('11:30');
                    setBatchDuration(30);
                    setBatchCapacity(2);
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:border-blue-500 hover:text-blue-600 font-medium"
                >
                  Ca Sáng (08:00–11:30)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchStartTime('13:30');
                    setBatchEndTime('16:30');
                    setBatchDuration(30);
                    setBatchCapacity(2);
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:border-blue-500 hover:text-blue-600 font-medium"
                >
                  Ca Chiều (13:30–16:30)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="Giờ bắt đầu"
                type="time"
                value={batchStartTime}
                onChange={(e) => setBatchStartTime(e.target.value)}
                required
              />
              <Input
                label="Giờ kết thúc"
                type="time"
                value={batchEndTime}
                onChange={(e) => setBatchEndTime(e.target.value)}
                required
              />
              <Select
                label="Thời lượng / ca"
                value={String(batchDuration)}
                onChange={(e) => setBatchDuration(Number(e.target.value))}
              >
                <option value="15">15 phút / ca</option>
                <option value="20">20 phút / ca</option>
                <option value="30">30 phút / ca</option>
                <option value="45">45 phút / ca</option>
                <option value="60">60 phút / ca</option>
              </Select>
              <Input
                label="Sức chứa / ca (BN)"
                type="number"
                min={1}
                max={20}
                value={String(batchCapacity)}
                onChange={(e) => setBatchCapacity(Number(e.target.value))}
                required
              />
            </div>

            {/* Preview tính toán */}
            {batchCalculation.valid ? (
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span>
                    Số ca mỗi ngày:{' '}
                    <strong className="text-blue-700">{batchCalculation.slotsPerDay} ca</strong>
                  </span>
                  <span>
                    Tổng ca trong {batchDates.length} ngày:{' '}
                    <strong className="text-emerald-700">
                      {batchCalculation.totalSlots} khung giờ
                    </strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  {batchCalculation.slotsList.map((slotRange, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded font-mono"
                    >
                      {slotRange}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{batchCalculation.error}</span>
              </div>
            )}
          </div>
        </form>
      </Drawer>

      {/* 6. MODAL TẠO CA KHÁM LẺ (SINGLE SLOT) */}
      <Modal
        isOpen={isSingleOpen}
        onClose={() => setIsSingleOpen(false)}
        title="Tạo Ca Khám Đơn Lẻ"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsSingleOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitSingle}
              disabled={isSubmittingSingle}
              isLoading={isSubmittingSingle}
            >
              Lưu ca khám
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitSingle} className="space-y-4">
          <Select
            label="Phòng khám (*)"
            value={singleRoomId}
            onChange={(e) => {
              setSingleRoomId(e.target.value);
              setSingleDoctorId('');
            }}
            required
          >
            <option value="">-- Chọn phòng khám --</option>
            {rooms
              .filter((r) => r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
          </Select>

          <Select
            label="Bác sĩ phụ trách (*)"
            value={singleDoctorId}
            onChange={(e) => setSingleDoctorId(e.target.value)}
            required
            disabled={!singleRoomId}
          >
            <option value="">-- Chọn bác sĩ --</option>
            {getDoctorsForRoom(singleRoomId).map((d) => (
              <option key={d.id} value={d.id}>
                BS. {d.fullName}
              </option>
            ))}
          </Select>

          <Input
            label="Ngày khám (*)"
            type="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ bắt đầu (*)"
              type="time"
              value={singleStartTime}
              onChange={(e) => setSingleStartTime(e.target.value)}
              required
            />
            <Input
              label="Giờ kết thúc (*)"
              type="time"
              value={singleEndTime}
              onChange={(e) => setSingleEndTime(e.target.value)}
              required
            />
          </div>

          <Input
            label="Sức chứa bệnh nhân (*)"
            type="number"
            min={1}
            max={20}
            value={String(singleCapacity)}
            onChange={(e) => setSingleCapacity(Number(e.target.value))}
            required
          />
        </form>
      </Modal>

      {/* 7. MODAL ĐIỀU CHỈNH CA KHÁM (UPDATE SLOT) */}
      <Modal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        title={`Điều chỉnh Ca khám #${updateSlotData?.id || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsUpdateOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitUpdate}
              disabled={isSubmittingUpdate}
              isLoading={isSubmittingUpdate}
            >
              Cập nhật
            </Button>
          </div>
        }
      >
        {updateSlotData && (
          <form onSubmit={handleSubmitUpdate} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200">
              Lưu ý M03.02: Bác sĩ và phòng khám không thể thay đổi. Nếu ca khám đã có lịch hẹn đặt
              trước, hệ thống chỉ cho phép tăng sức chứa.
            </div>

            <Input
              label="Ngày khám (*)"
              type="date"
              value={updateSlotData.date}
              onChange={(e) =>
                setUpdateSlotData({ ...updateSlotData, date: e.target.value })
              }
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Giờ bắt đầu (*)"
                type="time"
                value={updateSlotData.startTime}
                onChange={(e) =>
                  setUpdateSlotData({ ...updateSlotData, startTime: e.target.value })
                }
                required
              />
              <Input
                label="Giờ kết thúc (*)"
                type="time"
                value={updateSlotData.endTime}
                onChange={(e) =>
                  setUpdateSlotData({ ...updateSlotData, endTime: e.target.value })
                }
                required
              />
            </div>

            <Input
              label="Sức chứa tối đa (BN) (*)"
              type="number"
              min={1}
              max={20}
              value={String(updateSlotData.capacity)}
              onChange={(e) =>
                setUpdateSlotData({ ...updateSlotData, capacity: Number(e.target.value) })
              }
              required
            />
          </form>
        )}
      </Modal>

      {/* 8. MODAL XÁC NHẬN ĐÓNG KHUNG GIỜ (CLOSE CONFIRM) */}
      <Modal
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        title="Xác nhận Đóng Khung Giờ Khám"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCloseConfirmOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmCloseSlot}
              disabled={isClosingSlot}
              isLoading={isClosingSlot}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Đóng khung giờ
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-sm flex items-start gap-2 border border-rose-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              Bạn có chắc chắn muốn đóng nhận đăng ký cho <strong>Ca khám #{selectedSlot?.id}</strong>?
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Hành động này sẽ ngăn không cho người bệnh và nhân viên tiếp đón đặt lịch mới vào khung này.
            Các lịch hẹn đã đặt trước đó vẫn được giữ nguyên vẹn. Khung giờ đã đóng sẽ không thể mở lại.
          </p>
        </div>
      </Modal>

      {/* 9. LIGHTBOX PHÓNG TO ẢNH ĐẠI DIỆN BÁC SĨ */}
      {zoomedAvatar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setZoomedAvatar(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">{zoomedAvatar.name}</h3>
              <button
                type="button"
                onClick={() => setZoomedAvatar(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-50">
              <img
                src={zoomedAvatar.url}
                alt={zoomedAvatar.name}
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClinicSlotsPage;
