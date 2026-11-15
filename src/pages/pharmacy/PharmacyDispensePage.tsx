import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileCheck,
  RotateCcw,
  RefreshCw,
  PackageCheck,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  pharmacyDispenseService,
  type DispensingSnapshotResponse,
  type PrescriptionDetailResponse,
  type DispenseReportLine,
} from '../../services/pharmacyDispenseService';
import { pharmacyCatalogService, type MedicineBatchItem } from '../../services/pharmacyCatalogService';

interface SelectedBatchAllocation {
  batchId: number;
  batchNumber: string;
  expiryDate: string;
  availableStock: number;
  dispenseQuantity: number;
}

export const PharmacyDispensePage: React.FC = () => {
  const toast = useToast();

  // Search & Loading state
  const [searchPrescriptionId, setSearchPrescriptionId] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Data state
  const [snapshot, setSnapshot] = useState<DispensingSnapshotResponse | null>(null);
  const [prescriptionDetail, setPrescriptionDetail] = useState<PrescriptionDetailResponse | null>(null);
  const [dispenseHistory, setDispenseHistory] = useState<DispenseReportLine[]>([]);

  // Allocations: Key = prescriptionItemId, Value = array of allocations
  const [allocations, setAllocations] = useState<Record<number, SelectedBatchAllocation[]>>({});
  // Medicine batches cache: Key = medicineId, Value = list of active batches
  const [batchCache, setBatchCache] = useState<Record<number, MedicineBatchItem[]>>({});

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewLines, setReviewLines] = useState<
    Array<{
      prescriptionItemId: number;
      medicineName: string;
      remainingQuantity: number;
      unfilledQuantity: number;
      reason: string;
      note: string;
    }>
  >([]);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnReason, setReturnReason] = useState<string>('Người bệnh thay đổi phác đồ điều trị');
  const [returnLines, setReturnLines] = useState<
    Array<{
      sourceItemId: number;
      prescriptionItemId: number;
      batchId: number;
      quantity: number;
      condition: string;
      note: string;
    }>
  >([]);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Load prescription data
  const handleLoadPrescription = useCallback(
    async (idToLoad?: number) => {
      const pid = idToLoad ?? parseInt(searchPrescriptionId, 10);
      if (isNaN(pid) || pid <= 0) {
        toast.error('Vui lòng nhập ID đơn thuốc hợp lệ');
        return;
      }

      setLoading(true);
      try {
        const [snapData, detailData, historyData] = await Promise.all([
          pharmacyDispenseService.getDispensingSnapshot(pid),
          pharmacyDispenseService.getPrescriptionDetail(pid).catch(() => null),
          pharmacyDispenseService.getDispenseLinesHistory(pid),
        ]);

        setSnapshot(snapData);
        setPrescriptionDetail(detailData);
        setDispenseHistory(historyData);

        // Fetch batches for each medicine in snapshot
        const newCache: Record<number, MedicineBatchItem[]> = {};
        const newAllocations: Record<number, SelectedBatchAllocation[]> = {};

        for (const item of snapData.items) {
          if (!newCache[item.medicineId]) {
            try {
              const bRes = await pharmacyCatalogService.getBatches(item.medicineId);
              newCache[item.medicineId] = bRes.filter((b) => b.status === 'ACTIVE');
            } catch {
              newCache[item.medicineId] = [];
            }
          }

          // Initial allocation suggestion: Pick first active batch with earliest expiry (FEFO)
          const availableBatches = newCache[item.medicineId] || [];
          if (availableBatches.length > 0 && item.remainingQuantity > 0) {
            const firstBatch = availableBatches[0];
            newAllocations[item.prescriptionItemId] = [
              {
                batchId: firstBatch.id,
                batchNumber: firstBatch.batchNumber,
                expiryDate: firstBatch.expiryDate,
                availableStock: 999, // default indicator
                dispenseQuantity: item.remainingQuantity,
              },
            ];
          } else {
            newAllocations[item.prescriptionItemId] = [];
          }
        }

        setBatchCache(newCache);
        setAllocations(newAllocations);
        toast.success(`Đã nạp thành công đơn thuốc #${pid}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không tìm thấy đơn thuốc hoặc lỗi nạp dữ liệu';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [searchPrescriptionId, toast]
  );

  // Auto load on initial mount
  useEffect(() => {
    handleLoadPrescription(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update allocation
  const handleUpdateBatchQuantity = (itemId: number, batchIndex: number, qty: number) => {
    setAllocations((prev) => {
      const currentList = prev[itemId] ? [...prev[itemId]] : [];
      if (currentList[batchIndex]) {
        currentList[batchIndex] = {
          ...currentList[batchIndex],
          dispenseQuantity: Math.max(0, qty),
        };
      }
      return { ...prev, [itemId]: currentList };
    });
  };

  const handleSelectBatch = (itemId: number, batchIndex: number, medicineId: number, batchId: number) => {
    const medicineBatches = batchCache[medicineId] || [];
    const selected = medicineBatches.find((b) => b.id === batchId);
    if (!selected) return;

    setAllocations((prev) => {
      const currentList = prev[itemId] ? [...prev[itemId]] : [];
      if (currentList[batchIndex]) {
        currentList[batchIndex] = {
          ...currentList[batchIndex],
          batchId: selected.id,
          batchNumber: selected.batchNumber,
          expiryDate: selected.expiryDate,
        };
      }
      return { ...prev, [itemId]: currentList };
    });
  };

  const handleAddBatchLine = (itemId: number, medicineId: number) => {
    const medicineBatches = batchCache[medicineId] || [];
    if (medicineBatches.length === 0) {
      toast.warning('Thuốc này chưa có lô hoạt động');
      return;
    }
    const defaultBatch = medicineBatches[0];
    setAllocations((prev) => {
      const currentList = prev[itemId] ? [...prev[itemId]] : [];
      return {
        ...prev,
        [itemId]: [
          ...currentList,
          {
            batchId: defaultBatch.id,
            batchNumber: defaultBatch.batchNumber,
            expiryDate: defaultBatch.expiryDate,
            availableStock: 999,
            dispenseQuantity: 0,
          },
        ],
      };
    });
  };

  const handleRemoveBatchLine = (itemId: number, batchIndex: number) => {
    setAllocations((prev) => {
      const currentList = prev[itemId] ? [...prev[itemId]] : [];
      currentList.splice(batchIndex, 1);
      return { ...prev, [itemId]: currentList };
    });
  };

  // Perform dispensation: Create DRAFT then POST
  const handlePerformDispense = async () => {
    if (!snapshot) return;

    // Collect dispense items
    const itemsToDispense: Array<{ prescriptionItemId: number; batchId: number; quantity: number }> = [];

    for (const [itemIdStr, allocList] of Object.entries(allocations)) {
      const itemId = parseInt(itemIdStr, 10);
      for (const a of allocList) {
        if (a.dispenseQuantity > 0) {
          itemsToDispense.push({
            prescriptionItemId: itemId,
            batchId: a.batchId,
            quantity: a.dispenseQuantity,
          });
        }
      }
    }

    if (itemsToDispense.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 lô và nhập số lượng phát lớn hơn 0');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Create draft DISPENSE stock document
      const createdDoc = await pharmacyDispenseService.createDispensation({
        prescriptionId: snapshot.prescriptionId,
        occurredAt: new Date().toISOString(),
        items: itemsToDispense,
      });

      // Step 2: Post the stock document to commit changes to inventory
      const postedDoc = await pharmacyDispenseService.postStockDocument(createdDoc.id);

      toast.success(`Cấp phát thành công! Đã ghi sổ phiếu kho #${postedDoc.documentCode}`);
      // Refresh current prescription snapshot
      await handleLoadPrescription(snapshot.prescriptionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình cấp phát thuốc';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open review modal
  const handleOpenReviewModal = () => {
    if (!snapshot) return;
    const initialLines = snapshot.items
      .filter((i) => i.remainingQuantity > 0)
      .map((i) => ({
        prescriptionItemId: i.prescriptionItemId,
        medicineName: i.medicineName,
        remainingQuantity: i.remainingQuantity,
        unfilledQuantity: i.unfilledQuantity > 0 ? i.unfilledQuantity : i.remainingQuantity,
        reason: i.unfilledReason || 'STOCKOUT',
        note: i.unfilledNote || '',
      }));

    if (initialLines.length === 0) {
      toast.info('Tất cả thuốc trong đơn đã được cấp đủ');
      return;
    }

    setReviewLines(initialLines);
    setIsReviewModalOpen(true);
  };

  // Submit unfilled review
  const handleSubmitReview = async () => {
    if (!snapshot) return;
    setSubmitting(true);
    try {
      await pharmacyDispenseService.reviewUnfilled(snapshot.prescriptionId, {
        items: reviewLines.map((r) => ({
          prescriptionItemId: r.prescriptionItemId,
          unfilledQuantity: r.unfilledQuantity,
          reason: r.reason,
          note: r.note,
        })),
      });

      toast.success('Đã cập nhật rà soát thuốc chưa nhận');
      setIsReviewModalOpen(false);
      await handleLoadPrescription(snapshot.prescriptionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật thuốc chưa nhận';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open return modal
  const handleOpenReturnModal = () => {
    if (dispenseHistory.length === 0) {
      toast.warning('Đơn thuốc này chưa có dòng xuất kho nào để trả lại');
      return;
    }

    const defaultReturnLines = dispenseHistory.map((h) => ({
      sourceItemId: h.itemId,
      prescriptionItemId: snapshot?.items[0]?.prescriptionItemId || 0,
      batchId: h.batchId,
      quantity: 1,
      condition: 'INTACT',
      note: 'Bệnh nhân trả lại quầy thuốc',
    }));

    setReturnLines(defaultReturnLines);
    setIsReturnModalOpen(true);
  };

  // Submit patient return
  const handleSubmitReturn = async () => {
    if (!snapshot) return;
    const validLines = returnLines.filter((l) => l.quantity > 0);
    if (validLines.length === 0) {
      toast.warning('Vui lòng nhập số lượng trả lớn hơn 0');
      return;
    }

    setSubmitting(true);
    try {
      const returnDoc = await pharmacyDispenseService.createPatientReturn({
        prescriptionId: snapshot.prescriptionId,
        occurredAt: new Date().toISOString(),
        reason: returnReason,
        items: validLines,
      });

      // Post the return document
      await pharmacyDispenseService.postStockDocument(returnDoc.id);
      toast.success(`Đã tiếp nhận bệnh nhân trả thuốc! Phiếu kho #${returnDoc.documentCode}`);
      setIsReturnModalOpen(false);
      await handleLoadPrescription(snapshot.prescriptionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xử lý trả thuốc';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate summary stats
  const totalItems = snapshot?.items.length || 0;
  const fullyDispensedItems = snapshot?.items.filter((i) => i.remainingQuantity === 0).length || 0;
  const isAllDispensed = totalItems > 0 && totalItems === fullyDispensedItems;

  return (
    <div className="space-y-6">
      {/* 1. Header & Tra cứu nhanh */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Pill className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Bàn Cấp Phát Thuốc Ngoại Trú
                </h1>
                <p className="text-sm text-slate-500">
                  Tra cứu đơn thuốc, kiểm tra tồn quầy (FEFO), xuất phát và rà soát thuốc chưa nhận
                </p>
              </div>
            </div>
          </div>

          {/* Form tra cứu đơn thuốc */}
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="number"
                min="1"
                placeholder="Nhập ID đơn thuốc (VD: 1, 2)..."
                value={searchPrescriptionId}
                onChange={(e) => setSearchPrescriptionId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadPrescription()}
                className="pl-9 text-sm"
              />
            </div>
            <Button
              onClick={() => handleLoadPrescription()}
              isLoading={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              Nạp đơn
            </Button>
            <Button
              variant="outline"
              onClick={() => handleLoadPrescription(snapshot?.prescriptionId)}
              title="Làm mới dữ liệu"
              className="px-3"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>

      {loading && !snapshot && (
        <div className="bg-white rounded-xl p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
          Đang nạp dữ liệu đơn thuốc...
        </div>
      )}

      {snapshot && (
        <div className="space-y-6">
          {/* 2. Banner Thông tin Tổng quan Đơn thuốc & Người bệnh */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 rounded-md text-xs font-semibold uppercase tracking-wider">
                  Mã đơn: #{prescriptionDetail?.prescriptionCode || `PRES-${snapshot.prescriptionId}`}
                </span>
                <span className="text-sm text-emerald-200">
                  ID Hệ thống: #{snapshot.prescriptionId}
                </span>
                {isAllDispensed ? (
                  <Badge className="bg-emerald-400 text-emerald-950 font-bold border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> ĐÃ PHÁT ĐỦ (100%)
                  </Badge>
                ) : (
                  <Badge className="bg-amber-400 text-amber-950 font-bold border-amber-300">
                    <Clock className="w-3.5 h-3.5 mr-1 inline" /> ĐANG CẤP PHÁT ({fullyDispensedItems}/{totalItems} món)
                  </Badge>
                )}
                {snapshot.reviewed && (
                  <Badge className="bg-purple-300 text-purple-950 font-semibold">
                    ĐÃ RÀ SOÁT CHƯA NHẬN
                  </Badge>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenReviewModal}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                  Rà soát chưa nhận
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenReturnModal}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-teal-200" />
                  BN trả thuốc
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  In phiếu xuất
                </Button>
              </div>
            </div>

            {/* Thông tin chi tiết lâm sàng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-sm">
              <div>
                <span className="text-emerald-300 text-xs block">Người bệnh</span>
                <span className="font-semibold text-white">
                  {prescriptionDetail?.patientName || 'Bệnh nhân ngoại trú'}
                </span>
              </div>
              <div>
                <span className="text-emerald-300 text-xs block">Bác sĩ kê đơn</span>
                <span className="font-semibold text-white">
                  {prescriptionDetail?.doctorName || 'Bác sĩ chuyên khoa'}
                </span>
              </div>
              <div>
                <span className="text-emerald-300 text-xs block">Thời điểm kê đơn</span>
                <span className="font-semibold text-white">
                  {prescriptionDetail?.createdAt
                    ? new Date(prescriptionDetail.createdAt).toLocaleString('vi-VN')
                    : 'Hôm nay'}
                </span>
              </div>
              <div>
                <span className="text-emerald-300 text-xs block">Ghi chú lâm sàng</span>
                <span className="text-white/90 truncate block">
                  {prescriptionDetail?.note || 'Không có ghi chú thêm'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Bảng Chi tiết Thuốc trong đơn & Phân bổ Lô kho quầy */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-800">
                  Danh sách Thuốc kê đơn & Phân bổ Lô Quầy phát (COUNTER / AVAILABLE)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Quy tắc FEFO: Ưu tiên xuất các lô có hạn dùng gần nhất
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {snapshot.items.map((item, idx) => {
                const itemAllocations = allocations[item.prescriptionItemId] || [];
                const availableBatches = batchCache[item.medicineId] || [];
                const totalAllocated = itemAllocations.reduce((sum, a) => sum + (Number(a.dispenseQuantity) || 0), 0);
                const isFullySatisfied = item.remainingQuantity === 0;

                return (
                  <div key={item.prescriptionItemId} className="p-5 hover:bg-slate-50/50 transition">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Cột 1: Thông tin thuốc kê */}
                      <div className="lg:w-1/3">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              {item.medicineName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span>Mã thuốc: #{item.medicineId}</span>
                              <span>•</span>
                              <span>Đơn vị: <strong className="text-slate-700">{item.baseUnit}</strong></span>
                            </div>

                            {/* Progress bar số lượng */}
                            <div className="mt-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Liều kê:</span>
                                <span className="font-bold text-slate-800">
                                  {item.prescribedQuantity} {item.baseUnit}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Đã phát:</span>
                                <span className="font-semibold text-emerald-700">
                                  {item.dispensedQuantity} {item.baseUnit}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Còn lại cần phát:</span>
                                <span
                                  className={`font-bold ${
                                    item.remainingQuantity > 0 ? 'text-amber-700' : 'text-slate-500'
                                  }`}
                                >
                                  {item.remainingQuantity} {item.baseUnit}
                                </span>
                              </div>
                              {item.unfilledQuantity > 0 && (
                                <div className="flex justify-between text-rose-600 border-t border-slate-200 pt-1">
                                  <span>Chưa nhận:</span>
                                  <span>
                                    {item.unfilledQuantity} {item.baseUnit} ({item.unfilledReason})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cột 2: Phân bổ Lô & Số lượng phát */}
                      <div className="lg:w-2/3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <PackageCheck className="w-4 h-4 text-emerald-600" />
                            Phân bổ Lô xuất quầy:
                          </span>
                          {!isFullySatisfied && availableBatches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAddBatchLine(item.prescriptionItemId, item.medicineId)}
                              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Thêm lô khác
                            </button>
                          )}
                        </div>

                        {isFullySatisfied ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Mặt hàng này đã được cấp phát đầy đủ ({item.dispensedQuantity} {item.baseUnit}). Không cần phát thêm.</span>
                          </div>
                        ) : availableBatches.length === 0 ? (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Quầy thuốc hiện không có Lô hoạt động nào cho thuốc này. Vui lòng kiểm tra chuyển kho hoặc ghi nhận lý do chưa nhận.</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {itemAllocations.map((alloc, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                              >
                                {/* Chọn Lô */}
                                <div className="flex-1">
                                  <label className="text-[11px] text-slate-500 mb-1 block">
                                    Lô thuốc &amp; Hạn dùng (FEFO)
                                  </label>
                                  <select
                                    value={alloc.batchId}
                                    onChange={(e) =>
                                      handleSelectBatch(
                                        item.prescriptionItemId,
                                        aIdx,
                                        item.medicineId,
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  >
                                    {availableBatches.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        Số lô: {b.batchNumber} (HSD: {b.expiryDate})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Nhập số lượng phát */}
                                <div className="w-32">
                                  <label className="text-[11px] text-slate-500 mb-1 block">
                                    SL phát ({item.baseUnit})
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.remainingQuantity}
                                    step="1"
                                    value={alloc.dispenseQuantity}
                                    onChange={(e) =>
                                      handleUpdateBatchQuantity(
                                        item.prescriptionItemId,
                                        aIdx,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="py-1 px-2 text-xs font-bold text-emerald-700"
                                  />
                                </div>

                                {/* Nút xóa dòng nếu có nhiều lô */}
                                {itemAllocations.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBatchLine(item.prescriptionItemId, aIdx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded self-end sm:self-center"
                                    title="Xóa phân bổ lô này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}

                            {/* Cảnh báo số lượng phân bổ so với cần phát */}
                            <div className="flex items-center justify-between text-xs pt-1 px-1">
                              <span className="text-slate-500">
                                Tổng chuẩn bị phát đợt này:{' '}
                                <strong className="text-emerald-700">
                                  {totalAllocated} {item.baseUnit}
                                </strong>
                              </span>
                              {totalAllocated > item.remainingQuantity && (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Vượt quá lượng cần phát ({item.remainingQuantity})
                                </span>
                              )}
                              {totalAllocated < item.remainingQuantity && totalAllocated > 0 && (
                                <span className="text-amber-600 font-medium">
                                  (Phát một phần: còn lại {item.remainingQuantity - totalAllocated})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chân bảng: Nút xác nhận xuất phát */}
            {!isAllDispensed && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Hệ thống sẽ tạo phiếu xuất DISPENSE và tự động ghi sổ kho Quầy ngay lập tức.
                </div>
                <Button
                  onClick={handlePerformDispense}
                  isLoading={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
                >
                  <PackageCheck className="w-4 h-4 mr-2" />
                  Xác nhận Cấp phát &amp; Ghi sổ kho Quầy
                </Button>
              </div>
            )}
          </div>

          {/* 4. Lịch sử các lần cấp phát trước của đơn này (nếu có) */}
          {dispenseHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Lịch sử các đợt đã cấp phát thuốc cho đơn #{snapshot.prescriptionId}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Thời gian xuất</th>
                      <th className="py-2.5 px-3">Mã phiếu kho</th>
                      <th className="py-2.5 px-3">ID món phiếu</th>
                      <th className="py-2.5 px-3">ID Lô thuốc</th>
                      <th className="py-2.5 px-3 text-right">Số lượng đã xuất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dispenseHistory.map((h, hIdx) => (
                      <tr key={hIdx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {new Date(h.occurredAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                            #{h.documentCode || h.documentId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">#{h.itemId}</td>
                        <td className="py-2.5 px-3">Lô #{h.batchId}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {h.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RÀ SOÁT THUỐC CHƯA NHẬN (UNFILLED REVIEW) */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Ghi nhận &amp; Rà soát Thuốc Chưa Nhận"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Dược sĩ ghi nhận lý do người bệnh không nhận thuốc hoặc bệnh viện tạm hết mặt hàng này:
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reviewLines.map((line, rIdx) => (
              <div key={line.prescriptionItemId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{line.medicineName}</span>
                  <span className="text-amber-700">Còn tồn đơn: {line.remainingQuantity}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      SL chưa nhận
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={line.remainingQuantity}
                      value={line.unfilledQuantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setReviewLines((prev) => {
                          const next = [...prev];
                          next[rIdx].unfilledQuantity = Math.min(val, line.remainingQuantity);
                          return next;
                        });
                      }}
                      className="text-xs py-1 px-2"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Lý do chưa nhận
                    </label>
                    <select
                      value={line.reason}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReviewLines((prev) => {
                          const next = [...prev];
                          next[rIdx].reason = val;
                          return next;
                        });
                      }}
                      className="w-full text-xs py-1.5 px-2 bg-white border border-slate-300 rounded"
                    >
                      <option value="STOCKOUT">STOCKOUT - Kho quầy hết thuốc</option>
                      <option value="DECLINED">DECLINED - Người bệnh từ chối lấy</option>
                      <option value="EXTERNAL">EXTERNAL - Người bệnh mua ngoài</option>
                      <option value="OTHER">OTHER - Lý do khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Ghi chú thêm</label>
                  <Input
                    placeholder="Ghi chú chi tiết lý do..."
                    value={line.note}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReviewLines((prev) => {
                        const next = [...prev];
                        next[rIdx].note = val;
                        return next;
                      });
                    }}
                    className="text-xs py-1 px-2"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
              Đóng
            </Button>
            <Button
              onClick={handleSubmitReview}
              isLoading={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              Lưu rà soát
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: BỆNH NHÂN TRẢ THUỐC (PATIENT RETURN) */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Tiếp Nhận Bệnh Nhân Trả Lại Thuốc (Patient Return)"
      >
        <div className="space-y-4">
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800">
            <p className="font-semibold mb-1">Quy định tiếp nhận trả thuốc:</p>
            Thuốc hoàn trả sẽ được nhập lại vào <strong>Quầy phát - Khu cách ly (COUNTER / QUARANTINE)</strong> để Dược sĩ trưởng kiểm định chất lượng trước khi tái nhập khả dụng.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Lý do trả thuốc:
            </label>
            <Input
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Nhập lý do người bệnh hoàn trả..."
              className="text-xs"
            />
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {returnLines.map((ret, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Dòng xuất kho gốc: #{ret.sourceItemId} (Lô #{ret.batchId})</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">SL trả lại</label>
                    <Input
                      type="number"
                      min="0"
                      value={ret.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setReturnLines((prev) => {
                          const next = [...prev];
                          next[idx].quantity = val;
                          return next;
                        });
                      }}
                      className="text-xs py-1 px-2"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Tình trạng bao bì</label>
                    <select
                      value={ret.condition}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReturnLines((prev) => {
                          const next = [...prev];
                          next[idx].condition = val;
                          return next;
                        });
                      }}
                      className="w-full text-xs py-1.5 px-2 bg-white border border-slate-300 rounded"
                    >
                      <option value="INTACT">INTACT - Còn nguyên vẹn niêm phong</option>
                      <option value="DAMAGED">DAMAGED - Hỏng bao bì / biến dạng</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              onClick={handleSubmitReturn}
              isLoading={submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
            >
              Tạo phiếu trả thuốc &amp; Ghi sổ
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: IN PHIẾU XUẤT THUỐC */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="In Phiếu Cấp Phát Thuốc Ngoại Trú"
      >
        <div className="p-6 bg-white border border-slate-300 rounded-lg text-slate-800 font-sans space-y-4">
          <div className="text-center border-b border-slate-300 pb-3">
            <h2 className="font-bold text-lg text-emerald-800">BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC</h2>
            <p className="text-xs text-slate-500">KHO DƯỢC &amp; QUẦY PHÁT THUỐC NGOẠI TRÚ</p>
            <h3 className="font-bold text-base mt-2">PHIẾU CẤP PHÁT THUỐC</h3>
            <p className="text-xs font-mono">Mã đơn: #{prescriptionDetail?.prescriptionCode || snapshot?.prescriptionId}</p>
          </div>

          <div className="text-xs space-y-1">
            <p><strong>Người bệnh:</strong> {prescriptionDetail?.patientName || 'Bệnh nhân ngoại trú'}</p>
            <p><strong>Bác sĩ chỉ định:</strong> {prescriptionDetail?.doctorName || 'Bác sĩ chuyên khoa'}</p>
            <p><strong>Thời gian in:</strong> {new Date().toLocaleString('vi-VN')}</p>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1.5 text-left">STT</th>
                <th className="border border-slate-300 p-1.5 text-left">Tên thuốc</th>
                <th className="border border-slate-300 p-1.5 text-center">ĐVT</th>
                <th className="border border-slate-300 p-1.5 text-right">SL Kê</th>
                <th className="border border-slate-300 p-1.5 text-right">SL Đã phát</th>
              </tr>
            </thead>
            <tbody>
              {snapshot?.items.map((item, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-medium">{item.medicineName}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{item.baseUnit}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{item.prescribedQuantity}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-emerald-700">{item.dispensedQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between pt-6 text-xs text-center">
            <div>
              <p className="font-bold">Người nhận thuốc</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold">Dược sĩ phát thuốc</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
            Đóng
          </Button>
          <Button
            onClick={() => {
              window.print();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Printer className="w-4 h-4 mr-2" /> In ngay
          </Button>
        </div>
      </Modal>
    </div>
  );
};
