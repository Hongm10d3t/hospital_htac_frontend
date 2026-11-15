import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  doctorPrescriptionService,
  type MedicineSelectionResponse,
  type PrescriptionLineRequest,
} from '../../services/doctorPrescriptionService';
import {
  doctorWorklistService,
  type DoctorVisitResponse,
  type DoctorPrescriptionResponse,
} from '../../services/doctorWorklistService';
import { cn } from '../../lib/utils';
import {
  Pill,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Printer,
  ArrowLeft,
  X,
  FileText,
  Send,
  Save,
  RefreshCw,
} from 'lucide-react';

// Các mẫu hướng dẫn dùng thuốc thông dụng
const USAGE_TEMPLATES = [
  'Ngày uống 2 lần, mỗi lần 1 viên sau ăn sáng – tối',
  'Ngày uống 3 lần, mỗi lần 1 viên sau các bữa ăn',
  'Uống 1 viên vào buổi tối trước khi đi ngủ',
  'Uống 1 viên khi đau hoặc sốt trên 38.5°C (cách 4–6 tiếng)',
  'Uống 1 gói pha 150ml nước ấm trước ăn 30 phút',
];

/**
 * F04.03 — Kê đơn Thuốc Điện tử (E-Prescription) & Tra Cứu Danh Mục Thuốc
 * Phân hệ Bác sĩ khám bệnh & Kê đơn (Doctor Portal)
 * Phong cách OPERATE: Kê đơn chuẩn xác, bảo vệ an toàn liều lượng, phát hành tức thì.
 */
export const DoctorMedicinesPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { hospitalConfig } = useAuth();
  const [searchParams] = useSearchParams();

  // 1. Lượt khám liên kết (nếu có)
  const visitIdParam = searchParams.get('visitId');
  const [currentVisit, setCurrentVisit] = useState<DoctorVisitResponse | null>(null);
  const [isLoadingVisit, setIsLoadingVisit] = useState<boolean>(false);

  // 2. Tra cứu Danh mục thuốc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [medicines, setMedicines] = useState<MedicineSelectionResponse[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState<boolean>(false);
  const [totalMedicines, setTotalMedicines] = useState<number>(0);

  // 3. Đơn thuốc đang soạn (Prescription Cart)
  const [cartItems, setCartItems] = useState<
    Array<{
      medicine: MedicineSelectionResponse;
      quantity: number;
      usageInstruction: string;
    }>
  >([]);
  const [prescriptionNote, setPrescriptionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 4. Danh sách các đơn thuốc đã kê cho lượt khám này
  const [existingPrescriptions, setExistingPrescriptions] = useState<DoctorPrescriptionResponse[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(false);

  // 5. Modal Xem & In Toa thuốc
  const [printPrescription, setPrintPrescription] = useState<DoctorPrescriptionResponse | null>(null);

  // 6. Modal Hủy Đơn Thuốc
  const [cancelModalRx, setCancelModalRx] = useState<DoctorPrescriptionResponse | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Tải danh mục thuốc (tìm kiếm)
  const loadMedicines = useCallback(async (termStr = '') => {
    setIsLoadingMedicines(true);
    try {
      const res = await doctorPrescriptionService.searchMedicines({
        term: termStr,
        size: 50,
        sort: 'name,ASC',
      });
      setMedicines(res.items);
      setTotalMedicines(res.totalItems);
    } catch (err) {
      console.warn('[DoctorMedicines] Lỗi tải thuốc:', err);
      setMedicines([]);
    } finally {
      setIsLoadingMedicines(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines(searchTerm);
  }, [loadMedicines, searchTerm]);

  // Tải thông tin lượt khám & các đơn thuốc cũ nếu có visitId
  const loadVisitAndPrescriptions = useCallback(async (vid: number) => {
    setIsLoadingVisit(true);
    try {
      const v = await doctorWorklistService.getVisit(vid);
      setCurrentVisit(v);

      setIsLoadingExisting(true);
      const rxList = await doctorPrescriptionService.getVisitPrescriptions(vid);
      setExistingPrescriptions(rxList);
    } catch (err: any) {
      toast.error(err.message || 'Không thể nạp thông tin lượt khám.');
      setCurrentVisit(null);
    } finally {
      setIsLoadingVisit(false);
      setIsLoadingExisting(false);
    }
  }, [toast]);

  useEffect(() => {
    if (visitIdParam) {
      const vidNum = Number(visitIdParam);
      if (!isNaN(vidNum) && vidNum > 0) {
        loadVisitAndPrescriptions(vidNum);
      }
    }
  }, [visitIdParam, loadVisitAndPrescriptions]);

  // 1. Thêm thuốc vào đơn soạn thảo
  const handleAddMedicineToCart = (med: MedicineSelectionResponse) => {
    const existingIndex = cartItems.findIndex((it) => it.medicine.id === med.id);
    if (existingIndex >= 0) {
      toast.info(`Thuốc ${med.name} đã có trong đơn. Bạn có thể tăng số lượng.`);
      return;
    }

    setCartItems((prev) => [
      ...prev,
      {
        medicine: med,
        quantity: 10,
        usageInstruction: USAGE_TEMPLATES[0],
      },
    ]);
    toast.success(`Đã thêm ${med.name} vào đơn thuốc.`);
  };

  // 2. Cập nhật số lượng thuốc trong giỏ
  const handleUpdateItemQuantity = (index: number, qty: number) => {
    if (qty <= 0) return;
    setCartItems((prev) => {
      const next = [...prev];
      next[index].quantity = qty;
      return next;
    });
  };

  // 3. Cập nhật hướng dẫn dùng thuốc
  const handleUpdateItemUsage = (index: number, instruction: string) => {
    setCartItems((prev) => {
      const next = [...prev];
      next[index].usageInstruction = instruction;
      return next;
    });
  };

  // 4. Xóa thuốc khỏi đơn soạn thảo
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 5. Lưu Nháp đơn thuốc (DRAFT)
  const handleSaveDraftPrescription = async () => {
    if (!currentVisit) return;
    if (cartItems.length === 0) {
      toast.warning('Đơn thuốc chưa có danh mục thuốc nào. Vui lòng thêm thuốc.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadItems: PrescriptionLineRequest[] = cartItems.map((it) => ({
        medicineId: it.medicine.id,
        quantity: it.quantity,
        usageInstruction: it.usageInstruction.trim(),
      }));

      const created = await doctorPrescriptionService.createPrescription(currentVisit.id, {
        note: prescriptionNote || null,
        items: payloadItems,
      });

      toast.success(`Đã lưu bản nháp đơn thuốc: ${created.prescriptionCode}`);
      setCartItems([]);
      setPrescriptionNote('');
      loadVisitAndPrescriptions(currentVisit.id);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo đơn thuốc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Phát hành đơn thuốc trực tiếp (Tạo DRAFT rồi chuyển ISSUED)
  const handleIssuePrescriptionImmediately = async () => {
    if (!currentVisit) return;
    if (cartItems.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một loại thuốc vào đơn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadItems: PrescriptionLineRequest[] = cartItems.map((it) => ({
        medicineId: it.medicine.id,
        quantity: it.quantity,
        usageInstruction: it.usageInstruction.trim(),
      }));

      // Bước 1: Tạo DRAFT
      const created = await doctorPrescriptionService.createPrescription(currentVisit.id, {
        note: prescriptionNote || null,
        items: payloadItems,
      });

      // Bước 2: Phát hành ISSUED
      const issued = await doctorPrescriptionService.issuePrescription(created.id);

      toast.success(
        `Đã phát hành đơn thuốc ${issued.prescriptionCode} thành công! Đơn đã chuyển sang Quầy Dược.`
      );
      setCartItems([]);
      setPrescriptionNote('');
      loadVisitAndPrescriptions(currentVisit.id);
    } catch (err: any) {
      toast.error(err.message || 'Không thể phát hành đơn thuốc.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Phát hành một đơn DRAFT đã tạo trước đó
  const handleIssueExistingDraft = async (rxId: number) => {
    try {
      const issued = await doctorPrescriptionService.issuePrescription(rxId);
      toast.success(`Đã phát hành đơn thuốc ${issued.prescriptionCode}!`);
      if (currentVisit) loadVisitAndPrescriptions(currentVisit.id);
    } catch (err: any) {
      toast.error(err.message || 'Không thể phát hành đơn thuốc này.');
    }
  };

  // 8. Hủy đơn thuốc kèm lý do
  const handleConfirmCancelPrescription = async () => {
    if (!cancelModalRx || !cancelReason.trim()) {
      toast.warning('Vui lòng nhập lý do hủy đơn thuốc.');
      return;
    }

    setIsCancelling(true);
    try {
      await doctorPrescriptionService.cancelPrescription(cancelModalRx.id, cancelReason.trim());
      toast.success(`Đã hủy đơn thuốc ${cancelModalRx.prescriptionCode}.`);
      setCancelModalRx(null);
      setCancelReason('');
      if (currentVisit) loadVisitAndPrescriptions(currentVisit.id);
    } catch (err: any) {
      toast.error(err.message || 'Không thể hủy đơn thuốc này.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900 pb-16">
      {isLoadingVisit && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <span>Đang nạp thông tin ca khám &amp; đơn thuốc...</span>
        </div>
      )}

      {/* =========================================================================
          1. HEADER TRANG: CHẾ ĐỘ KÊ ĐƠN HOẶC TRA CỨU DANH MỤC THUỐC
         ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <Pill className="w-3.5 h-3.5 text-sky-600" />
            <span>Phân hệ Bác sĩ Khám bệnh &amp; Kê đơn (F04.03)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>{currentVisit ? 'Bàn Kê Đơn Thuốc Ngoại Trú' : 'Tra Cứu Danh Mục Thuốc Viện'}</span>
            {currentVisit && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono">
                Mã BN: {currentVisit.patient.patientCode}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            {currentVisit
              ? `Kê đơn điện tử cho người bệnh: ${currentVisit.patient.fullName} • Chẩn đoán: ${currentVisit.diagnosis || 'Chưa ghi nhận'}`
              : `Tra cứu danh mục biệt dược, hoạt chất, hàm lượng và đơn vị cấp phát khả dụng toàn bệnh viện (${totalMedicines} thuốc).`}
          </p>
        </div>

        {/* NÚT ĐIỀU HƯỚNG */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {currentVisit && (
            <button
              type="button"
              onClick={() => navigate(`/doctor/records?visitId=${currentVisit.id}`)}
              className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Hồ Sơ Bệnh Án</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/doctor/worklist')}
            className="py-2.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <span>Bàn Khám &amp; Hàng Đợi</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. BỐ CỤC KÊ ĐƠN 2 CỘT (DANH MỤC THUỐC 7/12 & ĐƠN SOẠN THẢO 5/12)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =====================================================================
            CỘT TRÁI (7/12): TRA CỨU & DANH SÁCH THUỐC
           ===================================================================== */}
        <div className={cn('space-y-4', currentVisit ? 'lg:col-span-7' : 'lg:col-span-12')}>
          {/* Ô TÌM KIẾM THUỐC */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm thuốc theo Tên biệt dược, Hoạt chất, Mã thuốc hoặc Hàm lượng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-medium text-xs"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Hiển thị <strong>{medicines.length}</strong> / {totalMedicines} thuốc khả dụng</span>
              <span className="italic">Bấm &ldquo;+ Thêm&rdquo; để đưa thuốc vào đơn</span>
            </div>
          </div>

          {/* DANH SÁCH THUỐC */}
          {isLoadingMedicines ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-sky-600" />
              <span>Đang tra cứu danh mục thuốc...</span>
            </div>
          ) : medicines.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2 bg-white rounded-3xl border border-slate-200">
              <Pill className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">Không tìm thấy thuốc nào khớp với từ khóa &ldquo;{searchTerm}&rdquo;.</p>
              <p className="text-[11px]">Vui lòng thử tìm theo tên hoạt chất hoặc tên biệt dược khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {medicines.map((med) => {
                const isSelected = cartItems.some((it) => it.medicine.id === med.id);

                return (
                  <div
                    key={med.id}
                    className={cn(
                      'p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3',
                      isSelected
                        ? 'bg-sky-50/60 border-sky-400 ring-1 ring-sky-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-900 text-xs leading-snug">
                            {med.name}
                          </div>
                          <div className="text-[11px] text-sky-800 font-semibold mt-0.5">
                            {med.activeIngredient || '---'} {med.strength ? `• ${med.strength}` : ''}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                          {med.code}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-2">
                        <span>Dạng: <strong>{med.dosageForm || 'Viên'}</strong></span>
                        <span>•</span>
                        <span>Đơn vị: <strong>{med.baseUnit || 'viên'}</strong></span>
                      </div>
                    </div>

                    {currentVisit && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {isSelected ? (
                          <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                            <span>Đã có trong đơn</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          type="button"
                          onClick={() => handleAddMedicineToCart(med)}
                          className={cn(
                            'py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition-all',
                            isSelected
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Thêm nữa' : 'Kê thuốc này'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =====================================================================
            CỘT PHẢI (5/12): ĐƠN THUỐC ĐANG SOẠN (CHỈ HIỂN THỊ KHI CÓ VISIT)
           ===================================================================== */}
        {currentVisit && (
          <div className="lg:col-span-5 space-y-5 sticky top-6">
            <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-sky-300 shadow-md space-y-4">
              {/* HEADER TOA THUỐC */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                    Rx
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xs uppercase tracking-tight">
                      Toa Thuốc Đang Soạn
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {currentVisit.patient.fullName} (#{currentVisit.visitCode})
                    </div>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {cartItems.length} loại thuốc
                </span>
              </div>

              {/* DANH SÁCH THUỐC TRONG ĐƠN SOẠN */}
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Pill className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">Đơn thuốc hiện đang trống.</p>
                  <p className="text-[11px] text-slate-400">
                    Bấm nút <strong>&ldquo;Kê thuốc này&rdquo;</strong> ở danh mục bên trái để thêm vào toa.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div
                      key={item.medicine.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-900">
                            {idx + 1}. {item.medicine.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {item.medicine.activeIngredient} • {item.medicine.strength}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Xóa khỏi đơn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* SỐ LƯỢNG & ĐƠN VỊ TÍNH */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-500">Số lượng:</span>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                          className="w-16 p-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white"
                        />
                        <span className="text-[11px] text-slate-600 font-bold">
                          {item.medicine.baseUnit || 'viên'}
                        </span>
                      </div>

                      {/* HƯỚNG DẪN DÙNG THUỐC */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold">Cách dùng &amp; liều lượng:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleUpdateItemUsage(idx, e.target.value);
                            }}
                            className="bg-transparent text-sky-700 outline-none font-medium cursor-pointer"
                          >
                            <option value="">Gợi ý mẫu...</option>
                            {USAGE_TEMPLATES.map((tmpl, tIdx) => (
                              <option key={tIdx} value={tmpl}>
                                {tmpl.slice(0, 35)}...
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={item.usageInstruction}
                          onChange={(e) => handleUpdateItemUsage(idx, e.target.value)}
                          placeholder="VD: Ngày 2 lần, mỗi lần 1 viên sau ăn sáng - tối..."
                          className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* GHI CHÚ ĐƠN THUỐC */}
              {cartItems.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                  <label className="font-bold text-slate-700">Lời dặn thêm trên đơn:</label>
                  <textarea
                    rows={2}
                    value={prescriptionNote}
                    onChange={(e) => setPrescriptionNote(e.target.value)}
                    placeholder="VD: Uống thuốc đúng giờ, kiêng đồ ăn cay nóng..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* NÚT THAO TÁC ĐƠN THUỐC */}
              {cartItems.length > 0 && (
                <div className="space-y-2 pt-2">
                  {/* NÚT PHÁT HÀNH TRỰC TIẾP (ISSUED) */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleIssuePrescriptionImmediately}
                    className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Phát Hành Đơn Thuốc (ISSUED)</span>
                  </button>

                  {/* NÚT LƯU NHÁP (DRAFT) */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveDraftPrescription}
                    className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Bản Nháp (DRAFT)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. CÁC ĐƠN THUỐC ĐÃ KÊ CỦA LƯỢT KHÁM HIỆN TẠI
         ========================================================================= */}
      {currentVisit && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Đơn Thuốc Đã Kê Cho Lượt Khám Này ({existingPrescriptions.length})</span>
            </h2>
            <span className="text-xs text-slate-400">
              Đơn ISSUED đã được chuyển trực tiếp sang Quầy Dược để cấp phát.
            </span>
          </div>

          {isLoadingExisting ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              <span>Đang tải các đơn thuốc đã kê...</span>
            </div>
          ) : existingPrescriptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              Chưa có đơn thuốc nào được lưu cho ca khám này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {existingPrescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sky-800 text-sm">
                        {rx.prescriptionCode}
                      </span>
                      <span
                        className="font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200"
                        title="ID để Quầy Dược nạp đơn cấp phát"
                      >
                        ID: #{rx.id}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {rx.issuedAt ? `Phát hành lúc: ${new Date(rx.issuedAt).toLocaleTimeString('vi-VN')} – ${new Date(rx.issuedAt).toLocaleDateString('vi-VN')}` : 'Bản nháp'}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full uppercase',
                      rx.status === 'ISSUED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rx.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    )}
                  >
                    {rx.status === 'ISSUED' ? 'Đã Phát Hành' : rx.status === 'DRAFT' ? 'Nháp' : 'Đã Hủy'}
                  </span>
                </div>

                {/* DANH MỤC THUỐC TRONG ĐƠN */}
                <div className="space-y-2">
                  {rx.items.map((it, idx) => (
                    <div key={it.id} className="flex items-start justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="pr-2">
                        <div className="font-bold text-slate-800">
                          {idx + 1}. {it.medicineName || `Thuốc #${it.medicineId}`}
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          {it.usageInstruction}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        x{it.quantity} {it.baseUnit || 'viên'}
                      </span>
                    </div>
                  ))}
                </div>

                {rx.note && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-[11px] text-slate-600 italic">
                    Lời dặn: &ldquo;{rx.note}&rdquo;
                  </div>
                )}

                {/* THAO TÁC TRÊN ĐƠN */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                  {/* IN TOA THUỐC */}
                  <button
                    type="button"
                    onClick={() => setPrintPrescription(rx)}
                    className="py-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-600" />
                    <span>In Toa</span>
                  </button>

                  {/* NẾU LÀ DRAFT: CÓ THỂ PHÁT HÀNH */}
                  {rx.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => handleIssueExistingDraft(rx.id)}
                      className="py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Phát Hành</span>
                    </button>
                  )}

                  {/* HỦY ĐƠN (NẾU CHƯA BỊ CANCELLED) */}
                  {rx.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelModalRx(rx);
                        setCancelReason('Bác sĩ điều chỉnh lại phác đồ thuốc');
                      }}
                      className="py-1.5 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors"
                    >
                      Hủy Đơn
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* =========================================================================
          4. MODAL XEM & IN TOA THUỐC CHUẨN Y KHOA (PRESCRIPTION PREVIEW)
         ========================================================================= */}
      {printPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 border border-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPrintPrescription(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            {/* MẪU TOA THUỐC BỆNH VIỆN HTAC */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-300 font-sans space-y-4 text-slate-800 text-xs">
              <div className="border-b border-slate-300 pb-3 flex items-start justify-between">
                <div>
                  <div className="font-black text-sm uppercase text-slate-900">
                    {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {hospitalConfig?.address || 'Hà Nội'} • ĐT: {hospitalConfig?.phone || '1900 8888'}
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500 space-y-0.5">
                  <div>Mã: <strong className="text-slate-800">{printPrescription.prescriptionCode}</strong></div>
                  <div>ID Quầy Dược: <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">#{printPrescription.id}</strong></div>
                </div>
              </div>

              <div className="text-center py-1">
                <div className="text-base font-black uppercase tracking-wide text-sky-900">
                  ĐƠN THUỐC ĐIỆN TỬ
                </div>
              </div>

              {currentVisit && (
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                  <div>Họ tên: <strong className="uppercase">{currentVisit.patient.fullName}</strong></div>
                  <div>Tuổi: <strong>{currentVisit.patient.dateOfBirth}</strong> ({currentVisit.patient.gender === 'FEMALE' ? 'Nữ' : 'Nam'})</div>
                  <div className="col-span-2">Chẩn đoán: <strong>{currentVisit.diagnosis || 'Theo dõi điều trị'}</strong> {currentVisit.diagnosisCode ? `(${currentVisit.diagnosisCode})` : ''}</div>
                </div>
              )}

              {/* DANH SÁCH THUỐC */}
              <div className="space-y-2 py-1">
                {printPrescription.items.map((it, idx) => (
                  <div key={it.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                    <div>
                      <div className="font-bold text-slate-900">
                        {idx + 1}. {it.medicineName || `Thuốc #${it.medicineId}`}
                      </div>
                      <div className="text-[11px] text-slate-600 italic">
                        {it.usageInstruction}
                      </div>
                    </div>
                    <div className="font-mono font-bold shrink-0">
                      x{it.quantity} {it.baseUnit || 'viên'}
                    </div>
                  </div>
                ))}
              </div>

              {printPrescription.note && (
                <div className="text-[11px] italic text-slate-600 pt-1">
                  Lời dặn: {printPrescription.note}
                </div>
              )}

              <div className="pt-4 flex justify-between text-[11px] text-slate-600">
                <div>
                  Ngày: {printPrescription.issuedAt ? new Date(printPrescription.issuedAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-center font-bold">
                  Bác sĩ điều trị
                  <div className="pt-8 font-black text-slate-900">
                    Bác sĩ chuyên khoa HTAC
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setPrintPrescription(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>In Toa Thuốc</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintPrescription(null)}
                className="py-3 px-5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL HỦY ĐƠN THUỐC KÈM LÝ DO
         ========================================================================= */}
      {cancelModalRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Xác Nhận Hủy Đơn Thuốc
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Mã đơn: {cancelModalRx.prescriptionCode}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Đơn thuốc sẽ được chuyển sang trạng thái <strong>CANCELLED</strong>. Lưu ý: Chỉ có thể hủy đơn nếu phía Quầy Dược chưa tiến hành xuất kho cấp phát.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">
                Lý do hủy đơn <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCancelModalRx(null);
                  setCancelReason('');
                }}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={isCancelling || !cancelReason.trim()}
                onClick={handleConfirmCancelPrescription}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition-colors"
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
