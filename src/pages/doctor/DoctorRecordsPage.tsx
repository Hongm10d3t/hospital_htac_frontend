import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import {
  doctorWorklistService,
  type DoctorVisitResponse,
  type DoctorPrescriptionResponse,
  type PatientVisitSummary,
  type PatientVisitDetail,
  type DoctorSlotResponse,
} from '../../services/doctorWorklistService';
import {
  clinicDirectoryService,
  type ClinicRoomResponse,
} from '../../services/clinicDirectoryService';
import { cn } from '../../lib/utils';
import {
  Stethoscope,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pill,
  History,
  FileText,
  Building2,
  ChevronRight,
  ArrowLeft,
  X,
  Play,
  Plus,
  Activity,
  HeartPulse,
  RefreshCw,
} from 'lucide-react';

// Danh sách các mã ICD-10 phổ biến thường gặp trong khám ngoại trú
const COMMON_ICD10_LIST = [
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'J00', name: 'Viêm mũi họng cấp (cảm thường)' },
  { code: 'J06.9', name: 'Nhiễm khuẩn hô hấp trên cấp tính' },
  { code: 'K29.7', name: 'Viêm dạ dày, không xác định' },
  { code: 'K21.9', name: 'Bệnh trào ngược dạ dày - thực quản' },
  { code: 'E11.9', name: 'Đái tháo đường típ 2, không biến chứng' },
  { code: 'M54.5', name: 'Đau thắt lưng (đau lưng dưới)' },
  { code: 'G43.9', name: 'Đau nửa đầu (Migraine)' },
  { code: 'R42', name: 'Chóng mặt và hoa mắt' },
  { code: 'R50.9', name: 'Sốt, không đặc hiệu' },
];

// Các mẫu câu khám thực thể thường dùng
const CLINICAL_NOTE_TEMPLATES = [
  'Tim đều, T1 T2 rõ, không âm thổi bệnh lý. Phổi thông khí tốt, không rale.',
  'Bụng mềm, không chướng, gan lách không to, ấn không đau.',
  'Họng sạch, niêm mạc hồng, amidan hai bên không sưng đỏ.',
  'Huyết động ổn định, tỉnh táo tiếp xúc tốt, da niêm mạc hồng.',
];

/**
 * F04.02 — Ghi nhận Bệnh án & Chẩn đoán Y khoa (Clinical Records)
 * Phân hệ Bác sĩ khám bệnh & Kê đơn (Doctor Portal)
 * Phong cách OPERATE: Ghi chép chuẩn y khoa, chọn nhanh ICD-10, chốt ca dứt khoát.
 */
export const DoctorRecordsPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Visit ID từ query param
  const visitIdParam = searchParams.get('visitId');

  // 2. Dữ liệu Lượt khám hiện tại
  const [currentVisit, setCurrentVisit] = useState<DoctorVisitResponse | null>(null);
  const [isLoadingVisit, setIsLoadingVisit] = useState<boolean>(false);

  // 3. Danh sách phòng khám
  const [rooms, setRooms] = useState<ClinicRoomResponse[]>([]);

  // 4. Các trường Form Bệnh Án
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [diagnosisCode, setDiagnosisCode] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [treatmentPlan, setTreatmentPlan] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  // 5. Chỉ số sinh tồn phụ trợ
  const [vitals, setVitals] = useState({
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    temperature: '',
    weight: '',
    spo2: '',
  });

  // 6. Trạng thái hành động
  const [isSavingClinical, setIsSavingClinical] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // 7. Danh sách Đơn thuốc của lượt khám này
  const [prescriptions, setPrescriptions] = useState<DoctorPrescriptionResponse[]>([]);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState<boolean>(false);

  // 8. Modal Báo vắng (Not Complete)
  const [isNotCompleteModalOpen, setIsNotCompleteModalOpen] = useState<boolean>(false);
  const [notCompleteReason, setNotCompleteReason] = useState<string>('');
  const [isSubmittingNotComplete, setIsSubmittingNotComplete] = useState<boolean>(false);

  // 9. Modal / Drawer Tiền sử khám bệnh
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [pastVisits, setPastVisits] = useState<PatientVisitSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [selectedPastDetail, setSelectedPastDetail] = useState<PatientVisitDetail | null>(null);
  const [isLoadingPastDetail, setIsLoadingPastDetail] = useState<boolean>(false);

  // 10. Nếu chưa chọn visitId: Chọn từ ca trực
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [todaySlots, setTodaySlots] = useState<DoctorSlotResponse[]>([]);
  const [slotVisits, setSlotVisits] = useState<DoctorVisitResponse[]>([]);
  const [selectedSlotForLookup, setSelectedSlotForLookup] = useState<number | null>(null);

  // Tải Master Data phòng khám
  useEffect(() => {
    clinicDirectoryService
      .listClinicRooms({ size: 100 })
      .then((res) => setRooms(res.items))
      .catch((err) => console.warn('[DoctorRecords] Lỗi tải phòng khám:', err));
  }, []);

  const roomMap = useMemo(() => {
    const map = new Map<number, ClinicRoomResponse>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  // Nạp dữ liệu lượt khám khi có visitId trên URL
  const loadVisitData = useCallback(async (id: number) => {
    setIsLoadingVisit(true);
    try {
      const v = await doctorWorklistService.getVisit(id);
      setCurrentVisit(v);
      // Điền vào form bệnh án
      setClinicalNotes(v.clinicalNotes || '');
      setDiagnosisCode(v.diagnosisCode || '');
      setDiagnosis(v.diagnosis || '');
      setTreatmentPlan(v.treatmentPlan || '');
      setFollowUpDate(v.followUpDate || '');

      // Tải danh sách đơn thuốc của lượt khám
      setIsLoadingPrescriptions(true);
      doctorWorklistService
        .getVisitPrescriptions(id)
        .then((rxList) => setPrescriptions(rxList))
        .catch((err) => console.warn('[DoctorRecords] Lỗi tải đơn thuốc:', err))
        .finally(() => setIsLoadingPrescriptions(false));
    } catch (err: any) {
      toast.error(err.message || 'Không tìm thấy thông tin lượt khám hoặc bạn không được phân công lượt này.');
      setCurrentVisit(null);
    } finally {
      setIsLoadingVisit(false);
    }
  }, [toast]);

  useEffect(() => {
    if (visitIdParam) {
      const idNum = Number(visitIdParam);
      if (!isNaN(idNum) && idNum > 0) {
        loadVisitData(idNum);
      }
    } else {
      setCurrentVisit(null);
      // Nạp ca trực hôm nay để bác sĩ chọn bệnh nhân
      doctorWorklistService
        .getDoctorSlots({ date: todayStr, size: 50 })
        .then((res) => {
          setTodaySlots(res.items);
          if (res.items.length > 0) {
            setSelectedSlotForLookup(res.items[0].id);
          }
        })
        .catch((err) => console.warn('[DoctorRecords] Lỗi tải ca trực:', err));
    }
  }, [visitIdParam, loadVisitData, todayStr]);

  // Nạp danh sách bệnh nhân khi chọn ca trực (khi chưa có visitId)
  useEffect(() => {
    if (!visitIdParam && selectedSlotForLookup) {
      doctorWorklistService
        .getSlotWaitingVisits(selectedSlotForLookup, { size: 100 })
        .then((res) => setSlotVisits(res.items))
        .catch(() => setSlotVisits([]));
    }
  }, [visitIdParam, selectedSlotForLookup]);

  // 1. Thao tác Bắt đầu khám (nếu đang ở WAITING)
  const handleStartExam = async () => {
    if (!currentVisit) return;
    setIsStarting(true);
    try {
      const started = await doctorWorklistService.startVisit(currentVisit.id);
      setCurrentVisit(started);
      toast.success(`Đã chuyển lượt khám sang trạng thái Đang khám (IN_PROGRESS).`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể bắt đầu ca khám.');
    } finally {
      setIsStarting(false);
    }
  };

  // 2. Thao tác Lưu Ghi Nhận Bệnh Án: PUT /api/v1/doctor/visits/{id}/clinical
  const handleSaveClinicalNotes = async (silent = false) => {
    if (!currentVisit) return;

    if (currentVisit.status !== 'IN_PROGRESS') {
      toast.warning('Lượt khám phải ở trạng thái Đang khám (IN_PROGRESS) để ghi nhận bệnh án.');
      return;
    }

    setIsSavingClinical(true);
    try {
      // Ghép chỉ số sinh tồn vào đầu clinicalNotes nếu có
      let notesToSave = clinicalNotes;
      const vitalSummary: string[] = [];
      if (vitals.bpSystolic && vitals.bpDiastolic) vitalSummary.push(`HA: ${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg`);
      if (vitals.pulse) vitalSummary.push(`Mạch: ${vitals.pulse} bpm`);
      if (vitals.temperature) vitalSummary.push(`Nhiệt độ: ${vitals.temperature}°C`);
      if (vitals.spo2) vitalSummary.push(`SpO2: ${vitals.spo2}%`);
      if (vitals.weight) vitalSummary.push(`Cân nặng: ${vitals.weight} kg`);

      if (vitalSummary.length > 0 && !notesToSave.includes('[Sinh hiệu:')) {
        notesToSave = `[Sinh hiệu: ${vitalSummary.join(', ')}]\n` + notesToSave;
      }

      const updated = await doctorWorklistService.updateClinical(currentVisit.id, {
        clinicalNotes: notesToSave,
        diagnosisCode: diagnosisCode || null,
        diagnosis: diagnosis || null,
        treatmentPlan: treatmentPlan || null,
        followUpDate: followUpDate || null,
      });

      setCurrentVisit(updated);
      if (!silent) {
        toast.success('Đã lưu bệnh án & chẩn đoán thành công!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu ghi nhận bệnh án.');
    } finally {
      setIsSavingClinical(false);
    }
  };

  // 3. Thao tác Hoàn Tất Ca Khám: POST /api/v1/doctor/visits/{id}/complete
  const handleCompleteVisit = async () => {
    if (!currentVisit) return;

    if (!diagnosis.trim()) {
      toast.warning('Bắt buộc phải nhập Kết luận Chẩn đoán trước khi hoàn tất ca khám.');
      return;
    }

    setIsCompleting(true);
    try {
      // Trước khi complete, tự động lưu toàn bộ dữ liệu form hiện tại
      await doctorWorklistService.updateClinical(currentVisit.id, {
        clinicalNotes: clinicalNotes || null,
        diagnosisCode: diagnosisCode || null,
        diagnosis: diagnosis.trim(),
        treatmentPlan: treatmentPlan || null,
        followUpDate: followUpDate || null,
      });

      const completed = await doctorWorklistService.completeVisit(currentVisit.id);
      setCurrentVisit(completed);
      toast.success(
        `Hoàn tất ca khám cho bệnh nhân ${completed.patient.fullName}! Lượt khám đã kết thúc.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Không thể hoàn tất ca khám.');
    } finally {
      setIsCompleting(false);
    }
  };

  // 4. Thao tác Báo vắng / Bỏ dở: POST /api/v1/doctor/visits/{id}/not-complete
  const handleConfirmNotComplete = async () => {
    if (!currentVisit || !notCompleteReason.trim()) {
      toast.warning('Vui lòng nhập lý do không hoàn thành ca khám.');
      return;
    }

    setIsSubmittingNotComplete(true);
    try {
      const res = await doctorWorklistService.notCompleteVisit(currentVisit.id, notCompleteReason.trim());
      setCurrentVisit(res);
      setIsNotCompleteModalOpen(false);
      toast.info(`Lượt khám ${res.visitCode} đã được chuyển sang Bỏ dở (NOT_COMPLETED).`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật trạng thái bỏ dở.');
    } finally {
      setIsSubmittingNotComplete(false);
    }
  };

  // 5. Mở Drawer Xem Tiền Sử
  const handleOpenPatientHistory = async () => {
    if (!currentVisit) return;
    setIsHistoryDrawerOpen(true);
    setSelectedPastDetail(null);
    setIsLoadingHistory(true);
    try {
      const res = await doctorWorklistService.getPatientHistory(currentVisit.id, {
        size: 50,
        sort: 'arrivedAt,DESC',
      });
      setPastVisits(res.items);
    } catch (err: any) {
      toast.warning('Không thể nạp lịch sử khám trước đây của người bệnh.');
      setPastVisits([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Xem chi tiết lần khám cũ
  const handleViewPastDetail = async (pastVisitId: number) => {
    if (!currentVisit) return;
    setIsLoadingPastDetail(true);
    try {
      const detail = await doctorWorklistService.getPatientHistoryDetail(
        currentVisit.id,
        pastVisitId
      );
      setSelectedPastDetail(detail);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải chi tiết lần khám cũ.');
    } finally {
      setIsLoadingPastDetail(false);
    }
  };

  // Đặt nhanh ngày tái khám (+X ngày)
  const setQuickFollowUp = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().slice(0, 10));
  };

  // Tính tuổi
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

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900 pb-16">
      {isLoadingVisit && (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <span>Đang nạp hồ sơ bệnh án...</span>
        </div>
      )}

      {/* =========================================================================
          TRƯỜNG HỢP 1: CHƯA CHỌN BỆNH NHÂN (HIỂN THỊ DANH SÁCH CHỌN)
         ========================================================================= */}
      {!isLoadingVisit && !visitIdParam && !currentVisit && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
                <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                <span>Phân hệ Bác sĩ Khám bệnh (F04.02)</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Ghi Nhận Bệnh Án &amp; Chẩn Đoán Y Khoa
              </h1>
              <p className="text-xs text-slate-500">
                Vui lòng chọn một ca trực hoặc người bệnh đang chờ để mở hồ sơ bệnh án.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/doctor/worklist')}
              className="py-2.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Bàn Khám &amp; Hàng Đợi</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Chọn bệnh nhân trong ca trực hôm nay:</span>
              <span className="font-mono text-slate-400">Ngày {todayStr}</span>
            </div>

            {todaySlots.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Bạn không có ca trực nào mở hôm nay.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {todaySlots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSlotForLookup(s.id)}
                      className={cn(
                        'text-xs py-2 px-3.5 rounded-xl border font-bold transition-all shrink-0',
                        selectedSlotForLookup === s.id
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {roomMap.get(s.roomId)?.name || `Phòng ${s.roomId}`} ({new Date(s.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  {slotVisits.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Không có bệnh nhân nào trong hàng đợi ca này.
                    </div>
                  ) : (
                    slotVisits.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => setSearchParams({ visitId: String(v.id) })}
                        className="p-3.5 hover:bg-sky-50 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-sky-800 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200">
                            #{v.queueNumber}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {v.patient.fullName} ({calculateAge(v.patient.dateOfBirth)})
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Mã BN: {v.patient.patientCode} • Lượt: {v.visitCode}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            {v.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TRƯỜNG HỢP 2: ĐÃ CHỌN LƯỢT KHÁM CỤ THỂ (BÀN GHI BỆNH ÁN HOÀN CHỈNH)
         ========================================================================= */}
      {!isLoadingVisit && currentVisit && (
        <div className="space-y-6">
          {/* HEADER LƯỢT KHÁM: THÔNG TIN BỆNH NHÂN & HÀNH ĐỘNG CHÍNH */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* THÔNG TIN BỆNH NHÂN */}
              <div className="flex items-start sm:items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/doctor/worklist')}
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                  title="Quay lại bàn khám"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sky-800 text-base bg-sky-100/70 px-2.5 py-0.5 rounded-xl border border-sky-300">
                      STT #{currentVisit.queueNumber}
                    </span>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                      {currentVisit.patient.fullName}
                    </h1>
                    <span
                      className={cn(
                        'text-xs font-bold px-2.5 py-0.5 rounded-full',
                        currentVisit.patient.gender === 'FEMALE'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {currentVisit.patient.gender === 'FEMALE' ? 'Nữ' : 'Nam'} • {calculateAge(currentVisit.patient.dateOfBirth)}
                    </span>

                    {/* BADGE TRẠNG THÁI KHÁM */}
                    <span
                      className={cn(
                        'text-xs font-bold px-2.5 py-0.5 rounded-full uppercase',
                        currentVisit.status === 'IN_PROGRESS'
                          ? 'bg-sky-500 text-white animate-pulse'
                          : currentVisit.status === 'COMPLETED'
                          ? 'bg-emerald-500 text-white'
                          : currentVisit.status === 'WAITING'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-700 text-white'
                      )}
                    >
                      {currentVisit.status === 'IN_PROGRESS'
                        ? 'Đang Khám'
                        : currentVisit.status === 'COMPLETED'
                        ? 'Đã Hoàn Tất'
                        : currentVisit.status === 'WAITING'
                        ? 'Chờ Khám'
                        : currentVisit.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap font-mono">
                    <span>Mã BN: <strong className="text-sky-800">{currentVisit.patient.patientCode}</strong></span>
                    <span>•</span>
                    <span>Mã lượt: <strong className="text-slate-700">{currentVisit.visitCode}</strong></span>
                    <span>•</span>
                    <span>Phòng: <strong className="text-slate-800">{roomMap.get(currentVisit.roomId)?.name || `Phòng ${currentVisit.roomId}`}</strong></span>
                  </div>
                </div>
              </div>

              {/* BỘ NÚT HÀNH ĐỘNG CHUYÊN MÔN */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* NÚT TIỀN SỬ */}
                <button
                  type="button"
                  onClick={handleOpenPatientHistory}
                  className="py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <History className="w-4 h-4 text-sky-600" />
                  <span>Tiền sử ({pastVisits.length || '---'})</span>
                </button>

                {/* NẾU ĐANG WAITING: NÚT BẮT ĐẦU */}
                {currentVisit.status === 'WAITING' && (
                  <button
                    type="button"
                    disabled={isStarting}
                    onClick={handleStartExam}
                    className="py-2.5 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center gap-2 shadow-xs"
                  >
                    {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>Bắt Đầu Khám</span>
                  </button>
                )}

                {/* NẾU ĐANG IN_PROGRESS: CÁC NÚT LƯU, BỎ DỞ & HOÀN TẤT */}
                {currentVisit.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      type="button"
                      disabled={isSavingClinical}
                      onClick={() => handleSaveClinicalNotes(false)}
                      className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {isSavingClinical ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Lưu Nháp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNotCompleteReason('');
                        setIsNotCompleteModalOpen(true);
                      }}
                      className="py-2.5 px-3.5 rounded-2xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-700 font-bold text-xs transition-colors"
                    >
                      Bỏ Dở
                    </button>

                    <button
                      type="button"
                      disabled={isCompleting || !diagnosis.trim()}
                      onClick={handleCompleteVisit}
                      className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20"
                    >
                      {isCompleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Hoàn Tất Ca Khám</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* CẢNH BÁO NẾU LƯỢT ĐÃ HOÀN TẤT */}
            {currentVisit.status === 'COMPLETED' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Lượt khám này đã được hoàn tất lúc{' '}
                  <strong>{currentVisit.completedAt ? new Date(currentVisit.completedAt).toLocaleTimeString('vi-VN') : ''}</strong>. Hồ sơ bệnh án đã được khóa để chuyển sang Quầy Dược và lưu trữ.
                </span>
              </div>
            )}
          </div>

          {/* =====================================================================
              BỐ CỤC 2 CỘT CHUYÊN MÔN: BỆNH ÁN (TRÁI 8/12) & ĐƠN THUỐC (PHẢI 4/12)
             ===================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI (8/12): HỒ SƠ KHÁM BỆNH ÁN */}
            <div className="lg:col-span-8 space-y-6">
              {/* KHỐI 1: KHÁM LÂM SÀNG & SINH HIỆU */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-600" />
                    <span>1. Diễn Tiến Lâm Sàng &amp; Khám Thực Thể</span>
                  </div>
                  {currentVisit.reason && (
                    <span className="text-xs text-slate-500 italic">
                      Tiếp đón: &ldquo;{currentVisit.reason}&rdquo;
                    </span>
                  )}
                </div>

                {/* DÒNG NHẬP SINH HIỆU NHANH (VITALS) */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    <span>Chỉ số sinh tồn (nhập nhanh):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Huyết áp (mmHg)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="120"
                          value={vitals.bpSystolic}
                          onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                          className="w-12 p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                        />
                        <span>/</span>
                        <input
                          type="text"
                          placeholder="80"
                          value={vitals.bpDiastolic}
                          onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                          className="w-12 p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400">Mạch (bpm)</span>
                      <input
                        type="text"
                        placeholder="75"
                        value={vitals.pulse}
                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                        className="w-full p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400">Thân nhiệt (°C)</span>
                      <input
                        type="text"
                        placeholder="36.5"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        className="w-full p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400">SpO2 (%)</span>
                      <input
                        type="text"
                        placeholder="98"
                        value={vitals.spo2}
                        onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                        className="w-full p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400">Cân nặng (kg)</span>
                      <input
                        type="text"
                        placeholder="60"
                        value={vitals.weight}
                        onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                        className="w-full p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* CÁC MẪU CÂU KHÁM THỰC THỂ GỢI Ý */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">Chèn nhanh mẫu mô tả:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CLINICAL_NOTE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setClinicalNotes((prev) => (prev ? `${prev}\n- ${tmpl}` : `- ${tmpl}`));
                        }}
                        className="text-[11px] py-1 px-2.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-800 border border-slate-200 transition-colors text-left"
                      >
                        + {tmpl.slice(0, 38)}...
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={4}
                  placeholder="Ghi nhận tiền sử bệnh, triệu chứng cơ năng, kết quả khám tim, phổi, tiêu hóa, thần kinh..."
                  value={clinicalNotes}
                  disabled={currentVisit.status === 'COMPLETED'}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500 font-sans"
                />
              </div>

              {/* KHỐI 2: CHẨN ĐOÁN Y KHOA (MÃ ICD-10 & KẾT LUẬN - BẮT BUỘC) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>2. Chẩn Đoán Bệnh (Mã ICD-10 &amp; Kết luận)</span>
                    <span className="text-rose-500 font-black">*</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Bắt buộc phải có để hoàn tất</span>
                </div>

                {/* CHỌN NHANH CÁC MÃ ICD-10 PHỔ BIẾN */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">Mã ICD-10 thường gặp:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ICD10_LIST.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setDiagnosisCode(item.code);
                          setDiagnosis(item.name);
                        }}
                        className={cn(
                          'text-xs py-1 px-2.5 rounded-xl border transition-all flex items-center gap-1.5',
                          diagnosisCode === item.code
                            ? 'bg-sky-600 border-sky-600 text-white font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        )}
                      >
                        <span className="font-mono font-bold">{item.code}</span>
                        <span className="text-[11px] truncate max-w-[140px]">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  {/* Ô MÃ ICD */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="font-bold text-slate-700">Mã ICD-10:</label>
                    <input
                      type="text"
                      placeholder="VD: I10, J00..."
                      value={diagnosisCode}
                      disabled={currentVisit.status === 'COMPLETED'}
                      onChange={(e) => setDiagnosisCode(e.target.value.toUpperCase())}
                      className="w-full p-2.5 font-mono font-bold uppercase rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Ô KẾT LUẬN CHẨN ĐOÁN */}
                  <div className="sm:col-span-9 space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      <span>Kết luận chẩn đoán:</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Tăng huyết áp vô căn độ 1 / Viêm mũi họng cấp tính..."
                      value={diagnosis}
                      disabled={currentVisit.status === 'COMPLETED'}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className={cn(
                        'w-full p-2.5 font-bold rounded-xl border outline-none focus:ring-2 focus:ring-sky-500',
                        !diagnosis.trim() ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 3: HƯỚNG XỬ TRÍ, LỜI DẶN & HẸN TÁI KHÁM */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>3. Hướng Xử Trí &amp; Hẹn Tái Khám</span>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700">Phác đồ điều trị &amp; Lời dặn dò y lệnh:</label>
                  <textarea
                    rows={3}
                    placeholder="Chế độ ăn nhạt, kiêng mỡ động vật; uống nhiều nước ấm; tái khám ngay nếu có dấu hiệu sốt cao hoặc đau tức ngực..."
                    value={treatmentPlan}
                    disabled={currentVisit.status === 'COMPLETED'}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* HẸN TÁI KHÁM */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Ngày hẹn tái khám (khuyến nghị):</label>
                    {followUpDate && (
                      <button
                        type="button"
                        onClick={() => setFollowUpDate('')}
                        className="text-[11px] text-rose-600 hover:underline font-semibold"
                      >
                        Xóa ngày hẹn
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(3)}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs"
                    >
                      + 3 ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(7)}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs"
                    >
                      + 7 ngày (1 tuần)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(14)}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs"
                    >
                      + 14 ngày (2 tuần)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(30)}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs"
                    >
                      + 30 ngày (1 tháng)
                    </button>

                    <input
                      type="date"
                      min={todayStr}
                      value={followUpDate}
                      disabled={currentVisit.status === 'COMPLETED'}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="p-1.5 px-3 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (4/12): ĐƠN THUỐC CỦA CA & TÓM TẮT TIỀN SỬ */}
            <div className="lg:col-span-4 space-y-5">
              {/* KHỐI ĐƠN THUỐC ĐIỆN TỬ */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Pill className="w-4 h-4 text-sky-600" />
                    <span>Đơn Thuốc Điện Tử</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    {prescriptions.length} đơn
                  </span>
                </div>

                {isLoadingPrescriptions ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                    <span>Đang tải đơn thuốc...</span>
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Pill className="w-7 h-7 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">Chưa có đơn thuốc nào cho ca khám này.</p>
                    <p className="text-[11px]">Bác sĩ có thể bấm nút bên dưới để kê đơn chuyển Quầy Dược.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map((rx) => (
                      <div key={rx.id} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                          <span className="font-mono font-black text-sky-800">{rx.prescriptionCode}</span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              rx.status === 'ISSUED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rx.status === 'DRAFT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {rx.status === 'ISSUED' ? 'Đã Phát Hành' : rx.status === 'DRAFT' ? 'Bản Nháp' : rx.status}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {rx.items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between">
                              <div className="pr-2">
                                <div className="font-bold text-slate-800">
                                  {item.medicineName || `Thuốc #${item.medicineId}`}
                                </div>
                                <div className="text-[11px] text-slate-500 italic">
                                  {item.usageInstruction}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-slate-900 shrink-0">
                                x{item.quantity} {item.baseUnit || 'viên'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* NÚT KÊ ĐƠN THUỐC MỚI */}
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/medicines?visitId=${currentVisit.id}`)}
                  className="w-full py-3 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mở Trình Kê Đơn Thuốc (F04.03)</span>
                </button>
              </div>

              {/* KHỐI TÓM TẮT HÀNH CHÍNH & LỊCH HẸN BỆNH NHÂN */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Thông Tin Khám Chi Tiết</span>
                </div>

                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngày khám:</span>
                    <strong className="font-mono text-slate-800">{currentVisit.queueDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Giờ tiếp đón:</span>
                    <span className="font-mono text-slate-800">
                      {new Date(currentVisit.arrivedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {currentVisit.startedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Giờ bắt đầu:</span>
                      <span className="font-mono text-slate-800">
                        {new Date(currentVisit.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {currentVisit.appointmentId && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lịch hẹn online:</span>
                      <strong className="font-mono text-sky-700">#{currentVisit.appointmentId}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER XEM TIỀN SỬ BỆNH ÁN CŨ (PATIENT HISTORY DRAWER)
         ========================================================================= */}
      {isHistoryDrawerOpen && currentVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Tiền Sử Khám Bệnh Của Người Bệnh</span>
                </div>
                <div className="text-lg font-black text-slate-900">
                  {currentVisit.patient.fullName} ({calculateAge(currentVisit.patient.dateOfBirth)})
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryDrawerOpen(false);
                  setSelectedPastDetail(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                      Khám ngày {new Date(selectedPastDetail.visit.queueDate).toLocaleDateString('vi-VN')} ({selectedPastDetail.visit.visitCode})
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
                      <div className="font-bold text-slate-700">Khám lâm sàng:</div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        {selectedPastDetail.clinicalNotes}
                      </div>
                    </div>
                  )}

                  {selectedPastDetail.treatmentPlan && (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700">Phác đồ &amp; Lời dặn:</div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        {selectedPastDetail.treatmentPlan}
                      </div>
                    </div>
                  )}

                  {/* ĐƠN THUỐC CŨ ĐÃ KÊ */}
                  <div className="space-y-2 pt-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-sky-600" />
                      <span>Đơn thuốc đã cấp ({selectedPastDetail.prescriptions.length})</span>
                    </div>

                    {selectedPastDetail.prescriptions.length === 0 ? (
                      <div className="text-slate-400 italic">Không có đơn thuốc nào trong lần khám này.</div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedPastDetail.prescriptions.map((rx) => (
                          <div key={rx.id} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 pb-1 border-b border-slate-100">
                              <span>Mã: {rx.prescriptionCode}</span>
                              <span className="font-bold text-emerald-700">{rx.status}</span>
                            </div>
                            {rx.items.map((it) => (
                              <div key={it.id} className="flex justify-between text-xs">
                                <div>
                                  <div className="font-bold text-slate-800">{it.medicineName || `Thuốc #${it.medicineId}`}</div>
                                  <div className="text-[11px] text-slate-500 italic">{it.instructions}</div>
                                </div>
                                <span className="font-mono font-bold text-slate-700">x{it.quantity} {it.unit || 'viên'}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : pastVisits.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">Bệnh nhân chưa từng khám trước đây tại viện.</p>
                </div>
              ) : (
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
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsHistoryDrawerOpen(false);
                  setSelectedPastDetail(null);
                }}
                className="py-2 px-5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-white"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL XÁC NHẬN BỎ DỞ / BÁO VẮNG (NOT COMPLETE)
         ========================================================================= */}
      {isNotCompleteModalOpen && currentVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Báo Vắng / Bỏ Dở Ca Khám
                </h3>
                <p className="text-xs text-slate-500">
                  Lượt khám: <strong className="font-mono text-slate-800">{currentVisit.visitCode}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Ghi nhận bệnh nhân bỏ dở ca khám (ví dụ: bệnh nhân ra về khi chưa hoàn tất hoặc từ chối khám tiếp). Lưu ý: Nếu đã có đơn thuốc ISSUED thì cần hủy đơn trước.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">
                Lý do bỏ dở <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                value={notCompleteReason}
                onChange={(e) => setNotCompleteReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsNotCompleteModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmittingNotComplete || !notCompleteReason.trim()}
                onClick={handleConfirmNotComplete}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-colors"
              >
                {isSubmittingNotComplete ? 'Đang xử lý...' : 'Xác nhận bỏ dở'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
