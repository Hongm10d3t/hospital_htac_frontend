import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  patientHistoryService,
  type PatientPrescriptionSummary,
  type PatientPrescriptionDetail,
  type PatientVisitSummary,
} from '../../services/patientHistoryService';
import {
  patientAuthService,
  type PatientProfileResponse,
} from '../../services/patientAuthService';
import {
  Pill,
  Search,
  Calendar,
  Printer,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  Stethoscope,
  CalendarCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * F02 — Trang Danh Sách Đơn Thuốc Điện Tử Dành Cho Bệnh Nhân (Patient Prescriptions Portal)
 * 
 * Tính năng:
 * - Truy cập nhanh tất cả các đơn thuốc đã được bác sĩ kê.
 * - Liên kết trực tiếp với Đợt khám tương ứng (Mã lượt khám, Ngày khám, Chẩn đoán y khoa của Bác sĩ).
 * - Tránh nhầm lẫn giữa các đợt khám/đơn thuốc của các chuyên khoa khác nhau.
 * - Xem chi tiết toa thuốc: tên thuốc, hàm lượng, số lượng, hướng dẫn uống cụ thể.
 * - In đơn thuốc điện tử khổ A5 / A4 chuẩn bệnh viện.
 * - Lọc tìm kiếm theo mã đơn, mã lượt khám, chẩn đoán bệnh lý hoặc khoảng ngày kê.
 */
export const PatientPrescriptionsPage: React.FC = () => {
  const { hospitalConfig, user } = useAuth();
  const toast = useToast();

  // 1. Dữ liệu đơn thuốc, danh sách lượt khám liên kết & hồ sơ người bệnh
  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionSummary[]>([]);
  const [visitsMap, setVisitsMap] = useState<Map<number, PatientVisitSummary>>(new Map());
  const [patientProfile, setPatientProfile] = useState<PatientProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Bộ lọc tìm kiếm
  const [searchKw, setSearchKw] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // 3. Modal xem chi tiết toa thuốc
  const [selectedDetail, setSelectedDetail] = useState<PatientPrescriptionDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Tải hồ sơ bệnh nhân để lấy thông tin in ấn
  useEffect(() => {
    patientAuthService
      .getMyPatientProfile()
      .then(setPatientProfile)
      .catch((err) => console.warn('[PatientPrescriptions] Lỗi tải profile:', err));
  }, []);

  // Tải đồng thời danh sách đơn thuốc & lượt khám để liên kết dữ liệu
  const loadPrescriptionsAndVisits = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prescRes, visitsRes] = await Promise.all([
        patientHistoryService.getMyPrescriptions({
          from: fromDate || undefined,
          to: toDate || undefined,
          size: 50,
        }),
        patientHistoryService.getMyVisits({ size: 100 }),
      ]);

      // Ánh xạ lượt khám theo visitId để tra cứu O(1)
      const vMap = new Map<number, PatientVisitSummary>();
      (visitsRes.items || []).forEach((v) => {
        vMap.set(v.id, v);
      });

      setVisitsMap(vMap);
      setPrescriptions(prescRes.items || []);
    } catch (err) {
      console.warn('[PatientPrescriptions] Lỗi tải đơn thuốc & lượt khám:', err);
      toast.error('Không thể tải danh sách đơn thuốc. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, toast]);

  useEffect(() => {
    loadPrescriptionsAndVisits();
  }, [loadPrescriptionsAndVisits]);

  // Xem chi tiết đơn thuốc
  const handleOpenDetail = async (prescriptionId: number) => {
    setIsModalOpen(true);
    setIsLoadingDetail(true);
    try {
      const detail = await patientHistoryService.getMyPrescriptionDetail(prescriptionId);
      setSelectedDetail(detail);
    } catch (err) {
      console.warn('[PatientPrescriptions] Lỗi xem chi tiết đơn:', err);
      toast.error('Không thể tải chi tiết đơn thuốc này.');
      setIsModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Lọc theo từ khóa tìm kiếm (Mã đơn, Mã lượt khám, Chẩn đoán bệnh của Bác sĩ, Lời dặn)
  const filteredPrescriptions = prescriptions.filter((p) => {
    if (!searchKw.trim()) return true;
    const kw = searchKw.toLowerCase().trim();
    const matchCode = p.prescriptionCode.toLowerCase().includes(kw);
    const matchId = String(p.id).includes(kw);
    const matchVisitId = String(p.visitId).includes(kw);
    const matchNote = p.note?.toLowerCase().includes(kw) || false;

    // Lấy thông tin lượt khám liên kết để tìm kiếm theo chẩn đoán & mã lượt khám
    const linkedVisit = visitsMap.get(p.visitId);
    const matchVisitCode = linkedVisit?.visitCode?.toLowerCase().includes(kw) || false;
    const matchDiagnosis = linkedVisit?.diagnosis?.toLowerCase().includes(kw) || false;

    return matchCode || matchId || matchVisitId || matchNote || matchVisitCode || matchDiagnosis;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 antialiased">
      {/* =========================================================================
          1. TIÊU ĐỀ TRANG & BREADCRUMB
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <Pill className="w-3.5 h-3.5 text-sky-600" />
            <span>Tủ Thuốc &amp; Đơn Thuốc Điện Tử (E-Prescriptions)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Đơn Thuốc Của Tôi</span>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {filteredPrescriptions.length} đơn thuốc
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            Tra cứu nhanh các đơn thuốc theo từng đợt khám bệnh, xem chẩn đoán y khoa liên kết, hướng dẫn liều dùng chi tiết và in toa thuốc điện tử.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPrescriptionsAndVisits}
          disabled={isLoading}
          className="p-2.5 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : 'text-slate-400'}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* =========================================================================
          2. THANH BỘ LỌC TÌM KIẾM NHANH (TÌM THEO MÃ ĐƠN, MÃ LƯỢT KHÁM, BỆNH LÝ)
         ========================================================================= */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn thuốc, Mã đợt khám, Bệnh lý (VD: dạ dày, viêm mũi...) hoặc lời dặn..."
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold">Từ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold">Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {(searchKw || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchKw('');
                setFromDate('');
                setToDate('');
              }}
              className="text-xs text-sky-700 hover:text-sky-900 font-bold px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. DANH SÁCH ĐƠN THUỐC DẠNG THẺ KÈM THÔNG TIN LIÊN KẾT LƯỢT KHÁM
         ========================================================================= */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <span>Đang tải danh sách đơn thuốc &amp; thông tin các đợt khám...</span>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs space-y-3 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <Pill className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">Không tìm thấy đơn thuốc nào</h3>
          <p className="text-slate-400 max-w-md mx-auto text-xs">
            {searchKw || fromDate || toDate
              ? 'Không có đơn thuốc nào khớp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc.'
              : 'Bạn chưa có đơn thuốc nào được kê hoặc các đơn thuốc đang trong quá trình khám chưa phát hành.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPrescriptions.map((presc) => {
            const issuedDate = new Date(presc.issuedAt);
            const isIssued = presc.status === 'ISSUED';
            const linkedVisit = visitsMap.get(presc.visitId);

            return (
              <div
                key={presc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3.5">
                  {/* HÀNG 1: MÃ ĐƠN & TRẠNG THÁI */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="font-mono font-black text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                        {presc.prescriptionCode}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Mã đơn #{presc.id}
                      </div>
                    </div>

                    <Badge
                      status={isIssued ? 'COMPLETED' : 'CANCELLED'}
                      variant="subtle"
                      className="text-[10px] shrink-0"
                    >
                      {isIssued ? 'ĐÃ PHÁT HÀNH' : presc.status}
                    </Badge>
                  </div>

                  {/* HÀNG 2: KHỐI THÔNG TIN LIÊN KẾT ĐỢT KHÁM & CHẨN ĐOÁN (TRÁNH NHẦM LẪN) */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-bold text-sky-900">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Đợt khám:</span>
                        <span className="font-mono text-sky-700">
                          {linkedVisit?.visitCode || `#${presc.visitId}`}
                        </span>
                      </span>
                      <span className="text-slate-500 font-medium">
                        {linkedVisit?.queueDate
                          ? new Date(linkedVisit.queueDate).toLocaleDateString('vi-VN')
                          : issuedDate.toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {/* Chẩn đoán bệnh lý của bác sĩ */}
                    <div className="text-slate-800">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                        Chẩn đoán y khoa:
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                        {linkedVisit?.diagnosis || 'Khám chuyên khoa ngoại trú / Chưa cập nhật'}
                      </div>
                    </div>

                    {/* Hẹn tái khám (nếu có) */}
                    {linkedVisit?.followUpDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold pt-1 border-t border-sky-200/50">
                        <CalendarCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Hẹn tái khám: {new Date(linkedVisit.followUpDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    )}
                  </div>

                  {/* HÀNG 3: THỜI GIAN KÊ ĐƠN */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Giờ kê: <strong>{issuedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong> ngày {issuedDate.toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* HÀNG 4: LỜI DẶN DÙNG THUỐC CỦA BÁC SĨ */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Lời dặn của Bác sĩ:
                    </span>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 italic line-clamp-2">
                      {presc.note ? `“${presc.note}”` : 'Không có ghi chú thêm từ Bác sĩ điều trị.'}
                    </div>
                  </div>
                </div>

                {/* HÀNG 5: HÀNH ĐỘNG (XEM TOA THUỐC & BỆNH ÁN) */}
                <div className="pt-2 space-y-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center rounded-2xl"
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenDetail(presc.id)}
                  >
                    Xem Chi Tiết Toa Thuốc
                  </Button>

                  <Link
                    to="/patient/history"
                    className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-sky-700 py-1 transition-colors"
                  >
                    <span>Xem toàn bộ bệnh án đợt khám này</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          4. MODAL CHI TIẾT TOA THUỐC ĐIỆN TỬ & IN TOA (PRESCRIPTION DETAIL MODAL)
         ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Chi Tiết Đơn Thuốc Điện Tử"
        size="lg"
      >
        {isLoadingDetail ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
            <span>Đang tải thông tin toa thuốc...</span>
          </div>
        ) : selectedDetail ? (
          (() => {
            const currentVisit = visitsMap.get(selectedDetail.prescription.visitId);

            return (
              <div className="space-y-6">
                {/* KHUNG MÔ PHỎNG ĐƠN THUỐC BẢN IN */}
                <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200 text-xs space-y-5">
                  {/* Header bệnh viện */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div className="space-y-0.5">
                      <div className="font-black text-sm uppercase text-slate-900">
                        {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {hospitalConfig?.address || 'Hà Nội'} • Hotline: {hospitalConfig?.phone || '1900 8888'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-sky-800">
                        {selectedDetail.prescription.prescriptionCode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Ngày kê: {new Date(selectedDetail.prescription.issuedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* Tiêu đề Toa thuốc */}
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black uppercase text-sky-900 tracking-tight">
                      ĐƠN THUỐC ĐIỆN TỬ NGOẠI TRÚ
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Bác sĩ chuyên khoa chỉ định theo hồ sơ khám bệnh ngoại trú
                    </p>
                  </div>

                  {/* Thông tin bệnh nhân */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>
                      Người bệnh:{' '}
                      <strong className="text-slate-900">
                        {patientProfile?.fullName || user?.fullName || 'Người bệnh'}
                      </strong>
                    </div>
                    <div>
                      Mã bệnh nhân:{' '}
                      <strong className="font-mono text-sky-800">
                        {patientProfile?.patientCode || `PID #${user?.id}`}
                      </strong>
                    </div>
                    <div>
                      Số CCCD: <span>{patientProfile?.citizenId || '---'}</span>
                    </div>
                    <div>
                      Ngày sinh:{' '}
                      <span>
                        {patientProfile?.dateOfBirth
                          ? new Date(patientProfile.dateOfBirth).toLocaleDateString('vi-VN')
                          : '---'}
                      </span>
                    </div>
                  </div>

                  {/* KHỐI THÔNG TIN ĐỢT KHÁM & CHẨN ĐOÁN BỆNH LÝ (LIÊN KẾT RÕ RÀNG) */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2 text-xs">
                    <div className="font-bold text-sky-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Stethoscope className="w-4 h-4 text-sky-600" />
                      <span>Thông Tin Đợt Khám &amp; Bệnh Lý Điều Trị</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      <div>
                        Mã đợt khám:{' '}
                        <strong className="font-mono text-sky-800">
                          {currentVisit?.visitCode || `#${selectedDetail.prescription.visitId}`}
                        </strong>
                      </div>
                      <div>
                        Ngày khám:{' '}
                        <strong>
                          {currentVisit?.queueDate
                            ? new Date(currentVisit.queueDate).toLocaleDateString('vi-VN')
                            : new Date(selectedDetail.prescription.issuedAt).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        Chẩn đoán y khoa của Bác sĩ:{' '}
                        <strong className="text-slate-900">
                          {currentVisit?.diagnosis || 'Khám chuyên khoa ngoại trú'}
                        </strong>
                      </div>
                      {currentVisit?.followUpDate && (
                        <div className="sm:col-span-2 text-amber-800 font-semibold flex items-center gap-1.5 pt-0.5">
                          <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>Hẹn tái khám vào ngày: {new Date(currentVisit.followUpDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bảng danh sách thuốc */}
                  <div className="space-y-2">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Chỉ định dùng thuốc:</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {selectedDetail.items.length} loại thuốc
                      </span>
                    </div>

                    {selectedDetail.items.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-slate-400 italic">
                        Đơn thuốc không có mục thuốc nào.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        {selectedDetail.items.map((item, idx) => (
                          <div key={item.medicineId || idx} className="p-3.5 space-y-1 hover:bg-slate-50/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">
                                  {idx + 1}
                                </span>
                                <span>{item.medicineName}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-sky-800 text-sm font-mono">
                                  {item.quantity}
                                </span>{' '}
                                <span className="text-slate-500 text-[11px]">{item.baseUnit}</span>
                              </div>
                            </div>

                            {/* Hướng dẫn uống / liều dùng */}
                            <div className="pl-7 text-[11px] text-slate-600 flex items-start gap-1.5">
                              <span className="font-semibold text-slate-700">Cách dùng:</span>
                              <span className="italic">{item.usageInstruction || 'Theo chỉ định của Bác sĩ'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lời dặn của bác sĩ */}
                  {selectedDetail.prescription.note && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Lời dặn của Bác sĩ điều trị:</span>
                      </div>
                      <div className="italic pl-5.5 text-amber-900">
                        &ldquo;{selectedDetail.prescription.note}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Hướng dẫn nhận thuốc */}
                  <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Vui lòng mang mã đơn đến Quầy Dược Ngoại Trú để nhận thuốc.</span>
                    <span className="font-mono text-slate-400">HTAC-RX-VERIFIED</span>
                  </div>
                </div>

                {/* Các nút hành động */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Link
                    to="/patient/history"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    <span>Xem bệnh án chi tiết đợt khám</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                      Đóng
                    </Button>
                    <Button
                      variant="primary"
                      leftIcon={<Printer className="w-4 h-4" />}
                      onClick={() => window.print()}
                    >
                      In Đơn Thuốc Này
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>
    </div>
  );
};
