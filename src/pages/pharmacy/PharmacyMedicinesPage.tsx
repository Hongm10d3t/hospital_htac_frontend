import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ui/Toast';
import {
  pharmacyCatalogService,
  type MedicineDto,
  type MedicineWritePayload,
  type SupplierDto,
  type SupplierWritePayload,
  type MedicineBatchDto,
  type MedicineBatchWritePayload,
} from '../../services/pharmacyCatalogService';
import { cn } from '../../lib/utils';
import {
  Pill,
  Truck,
  Layers,
  Search,
  Plus,
  Edit,
  Lock,
  Unlock,
  X,
  RefreshCw,
} from 'lucide-react';

/**
 * F05.01 — Danh mục Thuốc, Nhà cung cấp & Lô thuốc (Catalog & Batches)
 * Phân hệ Dược sĩ & Kho thuốc (Pharmacist Portal)
 * Phong cách OPERATE: Quản lý 3 tab chuyên sâu, kiểm soát số lô và hạn dùng nghiêm ngặt.
 */
export const PharmacyMedicinesPage: React.FC = () => {
  const toast = useToast();

  // Tab active: 'medicines' | 'suppliers' | 'batches'
  const [activeTab, setActiveTab] = useState<'medicines' | 'suppliers' | 'batches'>('medicines');

  // ==========================================
  // TAB 1: THUỐC (MEDICINES)
  // ==========================================
  const [medicines, setMedicines] = useState<MedicineDto[]>([]);
  const [medSearch, setMedSearch] = useState<string>('');
  const [medActiveFilter, setMedActiveFilter] = useState<string>('ALL');
  const [isLoadingMed, setIsLoadingMed] = useState<boolean>(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState<boolean>(false);
  const [editingMed, setEditingMed] = useState<MedicineDto | null>(null);
  const [medForm, setMedForm] = useState<MedicineWritePayload>({
    code: '',
    name: '',
    activeIngredient: '',
    strength: '',
    dosageForm: 'Viên nén',
    baseUnit: 'viên',
    minimumStock: 100,
    leadTimeDays: 7,
    active: true,
  });

  const loadMedicines = useCallback(async () => {
    setIsLoadingMed(true);
    try {
      const res = await pharmacyCatalogService.listMedicines({
        term: medSearch,
        active: medActiveFilter === 'ALL' ? undefined : medActiveFilter === 'ACTIVE',
        size: 100,
        sort: 'name,ASC',
      });
      setMedicines(res.items);
    } catch (err) {
      console.warn('[PharmacyMedicines] Lỗi tải thuốc:', err);
      setMedicines([]);
    } finally {
      setIsLoadingMed(false);
    }
  }, [medSearch, medActiveFilter]);

  useEffect(() => {
    if (activeTab === 'medicines') loadMedicines();
  }, [activeTab, loadMedicines]);

  const handleOpenMedModal = (med?: MedicineDto) => {
    if (med) {
      setEditingMed(med);
      setMedForm({
        code: med.code,
        name: med.name,
        activeIngredient: med.activeIngredient,
        strength: med.strength,
        dosageForm: med.dosageForm,
        baseUnit: med.baseUnit,
        minimumStock: med.minimumStock,
        leadTimeDays: med.leadTimeDays,
        active: med.active,
      });
    } else {
      setEditingMed(null);
      setMedForm({
        code: '',
        name: '',
        activeIngredient: '',
        strength: '',
        dosageForm: 'Viên nén',
        baseUnit: 'viên',
        minimumStock: 100,
        leadTimeDays: 7,
        active: true,
      });
    }
    setIsMedModalOpen(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.code.trim() || !medForm.name.trim()) {
      toast.warning('Vui lòng nhập đầy đủ Mã thuốc và Tên thuốc.');
      return;
    }

    try {
      if (editingMed) {
        await pharmacyCatalogService.updateMedicine(editingMed.id, medForm);
        toast.success(`Cập nhật thuốc ${medForm.name} thành công!`);
      } else {
        await pharmacyCatalogService.createMedicine(medForm);
        toast.success(`Thêm mới thuốc ${medForm.name} thành công!`);
      }
      setIsMedModalOpen(false);
      loadMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu thông tin thuốc.');
    }
  };

  // ==========================================
  // TAB 2: NHÀ CUNG CẤP (SUPPLIERS)
  // ==========================================
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [supSearch, setSupSearch] = useState<string>('');
  const [isLoadingSup, setIsLoadingSup] = useState<boolean>(false);
  const [isSupModalOpen, setIsSupModalOpen] = useState<boolean>(false);
  const [editingSup, setEditingSup] = useState<SupplierDto | null>(null);
  const [supForm, setSupForm] = useState<SupplierWritePayload>({
    code: '',
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    active: true,
  });

  const loadSuppliers = useCallback(async () => {
    setIsLoadingSup(true);
    try {
      const res = await pharmacyCatalogService.listSuppliers({
        term: supSearch,
        size: 100,
        sort: 'name,ASC',
      });
      setSuppliers(res.items);
    } catch (err) {
      console.warn('[PharmacyMedicines] Lỗi tải NCC:', err);
      setSuppliers([]);
    } finally {
      setIsLoadingSup(false);
    }
  }, [supSearch]);

  useEffect(() => {
    if (activeTab === 'suppliers') loadSuppliers();
  }, [activeTab, loadSuppliers]);

  const handleOpenSupModal = (sup?: SupplierDto) => {
    if (sup) {
      setEditingSup(sup);
      setSupForm({
        code: sup.code,
        name: sup.name,
        contactName: sup.contactName || '',
        phone: sup.phone || '',
        email: sup.email || '',
        address: sup.address || '',
        active: sup.active,
      });
    } else {
      setEditingSup(null);
      setSupForm({
        code: '',
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        active: true,
      });
    }
    setIsSupModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supForm.code.trim() || !supForm.name.trim()) {
      toast.warning('Vui lòng nhập Mã và Tên Nhà cung cấp.');
      return;
    }

    try {
      if (editingSup) {
        await pharmacyCatalogService.updateSupplier(editingSup.id, supForm);
        toast.success(`Cập nhật nhà cung cấp ${supForm.name} thành công!`);
      } else {
        await pharmacyCatalogService.createSupplier(supForm);
        toast.success(`Thêm mới nhà cung cấp ${supForm.name} thành công!`);
      }
      setIsSupModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu nhà cung cấp.');
    }
  };

  // ==========================================
  // TAB 3: LÔ THUỐC (BATCHES)
  // ==========================================
  const [batches, setBatches] = useState<MedicineBatchDto[]>([]);
  const [batchSearch, setBatchSearch] = useState<string>('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('ALL');
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [editingBatch, setEditingBatch] = useState<MedicineBatchDto | null>(null);
  const [batchForm, setBatchForm] = useState<MedicineBatchWritePayload>({
    medicineId: 1,
    batchNumber: '',
    expiryDate: '',
    status: 'ACTIVE',
    blockReason: '',
  });

  const loadBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const res = await pharmacyCatalogService.listBatches({
        term: batchSearch,
        status: batchStatusFilter === 'ALL' ? undefined : batchStatusFilter,
        size: 100,
        sort: 'expiryDate,ASC',
      });
      setBatches(res.items);
    } catch (err) {
      console.warn('[PharmacyMedicines] Lỗi tải lô thuốc:', err);
      setBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  }, [batchSearch, batchStatusFilter]);

  useEffect(() => {
    if (activeTab === 'batches') {
      loadBatches();
      // Đảm bảo có danh sách thuốc để chọn khi tạo lô
      if (medicines.length === 0) {
        pharmacyCatalogService.listMedicines({ size: 100 }).then((r) => setMedicines(r.items));
      }
    }
  }, [activeTab, loadBatches, medicines.length]);

  const handleOpenBatchModal = (b?: MedicineBatchDto) => {
    if (b) {
      setEditingBatch(b);
      setBatchForm({
        medicineId: b.medicineId,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        status: b.status,
        blockReason: b.blockReason || '',
      });
    } else {
      setEditingBatch(null);
      setBatchForm({
        medicineId: medicines.length > 0 ? medicines[0].id : 1,
        batchNumber: '',
        expiryDate: '',
        status: 'ACTIVE',
        blockReason: '',
      });
    }
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.batchNumber.trim() || !batchForm.expiryDate) {
      toast.warning('Vui lòng nhập Số lô và Hạn sử dụng.');
      return;
    }
    if (batchForm.status === 'BLOCKED' && !batchForm.blockReason?.trim()) {
      toast.warning('Lô bị KHÓA (BLOCKED) bắt buộc phải nhập lý do khóa.');
      return;
    }

    try {
      if (editingBatch) {
        await pharmacyCatalogService.updateBatch(editingBatch.id, batchForm);
        toast.success(`Cập nhật số lô ${batchForm.batchNumber} thành công!`);
      } else {
        await pharmacyCatalogService.createBatch(batchForm);
        toast.success(`Tạo mới số lô ${batchForm.batchNumber} thành công!`);
      }
      setIsBatchModalOpen(false);
      loadBatches();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu số lô.');
    }
  };

  // Toggle Khóa / Mở khóa nhanh lô thuốc
  const handleToggleBlockBatch = async (batch: MedicineBatchDto) => {
    const isBlocking = batch.status === 'ACTIVE';
    const reason = isBlocking
      ? prompt('Nhập lý do khóa lô thuốc này (bắt buộc):', 'Nghi ngờ chất lượng / Cảnh báo từ NSX')
      : null;

    if (isBlocking && (!reason || !reason.trim())) {
      toast.warning('Bạn chưa nhập lý do khóa.');
      return;
    }

    try {
      await pharmacyCatalogService.updateBatch(batch.id, {
        medicineId: batch.medicineId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        status: isBlocking ? 'BLOCKED' : 'ACTIVE',
        blockReason: isBlocking ? reason!.trim() : null,
      });
      toast.success(isBlocking ? `Đã khóa lô ${batch.batchNumber}` : `Đã mở khóa lô ${batch.batchNumber}`);
      loadBatches();
    } catch (err: any) {
      toast.error(err.message || 'Không thể thay đổi trạng thái lô.');
    }
  };

  // Kiểm tra hạn sử dụng của lô
  const checkExpiryStatus = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: 'Đã hết hạn', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (diffDays <= 30) return { label: `Sắp hết hạn (${diffDays} ngày)`, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { label: `Còn hạn (${diffDays} ngày)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900 pb-16">
      {/* =========================================================================
          1. HEADER & CHUYỂN TAB CHUYÊN MÔN DƯỢC
         ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Phân hệ Dược sĩ &amp; Kho thuốc (F05.01)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Danh Mục Thuốc, Nhà Cung Cấp &amp; Lô Hạn Dùng
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Quản trị danh mục dược phẩm toàn viện, ngưỡng tồn an toàn, thông tin nhà cung ứng và kiểm soát khóa lô thuốc có vấn đề.
          </p>
        </div>

        {/* 3 NÚT TAB */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('medicines')}
            className={cn(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'medicines' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Thuốc ({medicines.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={cn(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'suppliers' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Nhà Cung Cấp ({suppliers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batches')}
            className={cn(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'batches' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lô &amp; Hạn Dùng ({batches.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: DANH MỤC THUỐC (MEDICINES)
         ========================================================================= */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo Mã thuốc, Biệt dược, Hoạt chất..."
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <select
                value={medActiveFilter}
                onChange={(e) => setMedActiveFilter(e.target.value)}
                className="text-xs p-2 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenMedModal()}
              className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Mới Thuốc</span>
            </button>
          </div>

          {isLoadingMed ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
              <span>Đang nạp danh mục thuốc...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Mã Thuốc</th>
                    <th className="py-3 px-3">Tên Biệt Dược</th>
                    <th className="py-3 px-3">Hoạt Chất &amp; Hàm Lượng</th>
                    <th className="py-3 px-3">Dạng / Đơn Vị</th>
                    <th className="py-3 px-3 text-right">Tồn An Toàn</th>
                    <th className="py-3 px-3 text-right">Lead Time</th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{m.code}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{m.name}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div>{m.activeIngredient}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{m.strength}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {m.dosageForm} ({m.baseUnit})
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {m.minimumStock}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {m.leadTimeDays} ngày
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            m.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          )}
                        >
                          {m.active ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenMedModal(m)}
                          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-emerald-700"
                          title="Sửa thông tin thuốc"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: NHÀ CUNG CẤP (SUPPLIERS)
         ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm NCC theo Mã, Tên công ty, SĐT..."
                value={supSearch}
                onChange={(e) => setSupSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => handleOpenSupModal()}
              className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhà Cung Cấp</span>
            </button>
          </div>

          {isLoadingSup ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
              <span>Đang tải danh sách nhà cung ứng...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-3xl bg-slate-50/70 border border-slate-200 space-y-3 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-[10px] font-bold text-emerald-700">{s.code}</div>
                        <div className="font-black text-slate-900 text-sm leading-snug">{s.name}</div>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                          s.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {s.active ? 'Hợp tác' : 'Ngừng'}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1 text-slate-600">
                      <div>Liên hệ: <strong>{s.contactName || '---'}</strong></div>
                      <div>SĐT: <strong className="font-mono">{s.phone || '---'}</strong></div>
                      <div>Email: <span className="font-mono text-slate-500">{s.email || '---'}</span></div>
                      <div className="text-[11px] text-slate-500 truncate">Đ/C: {s.address || '---'}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenSupModal(s)}
                      className="py-1 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Sửa thông tin</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: LÔ THUỐC & HẠN DÙNG (BATCHES)
         ========================================================================= */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo Số lô thuốc..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <select
                value={batchStatusFilter}
                onChange={(e) => setBatchStatusFilter(e.target.value)}
                className="text-xs p-2 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Tất cả lô</option>
                <option value="ACTIVE">ACTIVE (Khả dụng)</option>
                <option value="BLOCKED">BLOCKED (Bị khóa)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBatchModal()}
              className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Mới Số Lô</span>
            </button>
          </div>

          {isLoadingBatches ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
              <span>Đang nạp danh mục số lô &amp; hạn dùng...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Mã Thuốc</th>
                    <th className="py-3 px-3">Số Lô (Batch No)</th>
                    <th className="py-3 px-3">Hạn Sử Dụng (Expiry)</th>
                    <th className="py-3 px-3">Tình Trạng Hạn</th>
                    <th className="py-3 px-3 text-center">Trạng Thái Lô</th>
                    <th className="py-3 px-3">Lý Do Khóa (nếu có)</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => {
                    const expStatus = checkExpiryStatus(b.expiryDate);
                    const isBlocked = b.status === 'BLOCKED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{b.medicineCode}</td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">{b.batchNumber}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {new Date(b.expiryDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', expStatus.color)}>
                            {expStatus.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            )}
                          >
                            {isBlocked ? 'BLOCKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate italic" title={b.blockReason || ''}>
                          {b.blockReason || '---'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleBlockBatch(b)}
                              className={cn(
                                'p-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors',
                                isBlocked
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
                              )}
                              title={isBlocked ? 'Mở khóa lô' : 'Khóa lô thuốc'}
                            >
                              {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              <span>{isBlocked ? 'Mở khóa' : 'Khóa'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenBatchModal(b)}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600"
                              title="Sửa lô"
                            >
                              <Edit className="w-3.5 h-3.5" />
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
          MODAL TẠO/SỬA THUỐC
         ========================================================================= */}
      {isMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingMed ? `Cập Nhật Thuốc: ${editingMed.code}` : 'Thêm Mới Thuốc Vào Danh Mục'}
              </h3>
              <button type="button" onClick={() => setIsMedModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mã Thuốc *</label>
                  <input
                    type="text"
                    disabled={!!editingMed}
                    value={medForm.code}
                    onChange={(e) => setMedForm({ ...medForm, code: e.target.value.toUpperCase() })}
                    placeholder="VD: PARA500"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tên Biệt Dược *</label>
                  <input
                    type="text"
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                    placeholder="VD: Panadol Extra"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hoạt Chất *</label>
                  <input
                    type="text"
                    disabled={!!editingMed}
                    value={medForm.activeIngredient}
                    onChange={(e) => setMedForm({ ...medForm, activeIngredient: e.target.value })}
                    placeholder="VD: Paracetamol, Caffeine"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hàm Lượng *</label>
                  <input
                    type="text"
                    disabled={!!editingMed}
                    value={medForm.strength}
                    onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                    placeholder="VD: 500mg/65mg"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Dạng Bào Chế *</label>
                  <input
                    type="text"
                    disabled={!!editingMed}
                    value={medForm.dosageForm}
                    onChange={(e) => setMedForm({ ...medForm, dosageForm: e.target.value })}
                    placeholder="VD: Viên nén bao phim"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đơn Vị Cơ Sở *</label>
                  <input
                    type="text"
                    disabled={!!editingMed}
                    value={medForm.baseUnit}
                    onChange={(e) => setMedForm({ ...medForm, baseUnit: e.target.value })}
                    placeholder="VD: viên, gói, chai"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ngưỡng Tồn An Toàn</label>
                  <input
                    type="number"
                    min={0}
                    value={medForm.minimumStock}
                    onChange={(e) => setMedForm({ ...medForm, minimumStock: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Lead Time (ngày giao hàng)</label>
                  <input
                    type="number"
                    min={0}
                    value={medForm.leadTimeDays}
                    onChange={(e) => setMedForm({ ...medForm, leadTimeDays: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="med-active-check"
                  checked={medForm.active}
                  onChange={(e) => setMedForm({ ...medForm, active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="med-active-check" className="font-bold text-slate-700 cursor-pointer">
                  Thuốc đang hoạt động (cho phép kê đơn và nhập kho)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMedModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Lưu Thuốc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL TẠO/SỬA NHÀ CUNG CẤP
         ========================================================================= */}
      {isSupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingSup ? `Sửa Nhà Cung Cấp: ${editingSup.code}` : 'Thêm Nhà Cung Cấp Mới'}
              </h3>
              <button type="button" onClick={() => setIsSupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mã NCC *</label>
                  <input
                    type="text"
                    value={supForm.code}
                    onChange={(e) => setSupForm({ ...supForm, code: e.target.value.toUpperCase() })}
                    placeholder="VD: DUOC_HAU_GIANG"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tên Doanh Nghiệp *</label>
                  <input
                    type="text"
                    value={supForm.name}
                    onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                    placeholder="VD: Dược Hậu Giang (DHG Pharma)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Người Liên Hệ</label>
                  <input
                    type="text"
                    value={supForm.contactName || ''}
                    onChange={(e) => setSupForm({ ...supForm, contactName: e.target.value })}
                    placeholder="Họ tên người phụ trách"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={supForm.phone || ''}
                    onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                    placeholder="VD: 0292 3899 999"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Giao Dịch</label>
                <input
                  type="email"
                  value={supForm.email || ''}
                  onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                  placeholder="contact@supplier.vn"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Địa Chỉ Trụ Sở</label>
                <input
                  type="text"
                  value={supForm.address || ''}
                  onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                  placeholder="Khu công nghiệp, tỉnh thành..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sup-active-check"
                  checked={supForm.active}
                  onChange={(e) => setSupForm({ ...supForm, active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="sup-active-check" className="font-bold text-slate-700 cursor-pointer">
                  Đối tác đang hoạt động (cho phép lập đề xuất mua)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Lưu Nhà Cung Cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL TẠO/SỬA SỐ LÔ THUỐC (BATCHES)
         ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingBatch ? `Cập Nhật Lô: ${editingBatch.batchNumber}` : 'Tạo Số Lô Mới Cho Thuốc'}
              </h3>
              <button type="button" onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Thuốc Áp Dụng *</label>
                <select
                  disabled={!!editingBatch}
                  value={batchForm.medicineId}
                  onChange={(e) => setBatchForm({ ...batchForm, medicineId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-none"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} ({m.strength})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số Lô (Batch No) *</label>
                  <input
                    type="text"
                    disabled={!!editingBatch}
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value.toUpperCase() })}
                    placeholder="VD: LOT-2026-A1"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hạn Dùng (Expiry) *</label>
                  <input
                    type="date"
                    disabled={!!editingBatch}
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Trạng Thái Lô *</label>
                <select
                  value={batchForm.status}
                  onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Bình thường, cho phép xuất cấp)</option>
                  <option value="BLOCKED">BLOCKED (Khóa lô, cấm xuất cấp)</option>
                </select>
              </div>

              {batchForm.status === 'BLOCKED' && (
                <div className="space-y-1 animate-in fade-in">
                  <label className="font-bold text-rose-700">Lý do khóa lô (bắt buộc) *</label>
                  <textarea
                    rows={2}
                    value={batchForm.blockReason || ''}
                    onChange={(e) => setBatchForm({ ...batchForm, blockReason: e.target.value })}
                    placeholder="VD: Nghi ngờ biến màu, thu hồi từ NSX..."
                    className="w-full p-2.5 rounded-xl border border-rose-300 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Lưu Số Lô
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
