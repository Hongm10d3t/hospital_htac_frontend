import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Printer,
  RefreshCw,
  History,
  ChevronRight,
  TrendingDown,
  Building2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  pharmacyInventoryService,
  type MedicineInventoryResponse,
  type StockMovementResponse,
} from '../../services/pharmacyInventoryService';
import { Link } from 'react-router-dom';

export const PharmacyInventoryPage: React.FC = () => {
  const toast = useToast();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'BELOW_MIN' | 'EXPIRY_ALERT'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [inventoryList, setInventoryList] = useState<MedicineInventoryResponse[]>([]);

  // Position Drawer / Modal
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineInventoryResponse | null>(null);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState<boolean>(false);

  // Stock Movement (Thẻ kho) Modal
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string>('');
  const [movementsLoading, setMovementsLoading] = useState<boolean>(false);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);

  // Load Inventory Data
  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyInventoryService.searchInventory({
        term: searchTerm || undefined,
        size: 200,
        sort: 'code,ASC',
      });
      setInventoryList(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải danh mục tồn kho thuốc';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Open Movements (Thẻ kho)
  const handleOpenMovements = async (batchId: number, batchNumber: string) => {
    setSelectedBatchId(batchId);
    setSelectedBatchNumber(batchNumber);
    setIsMovementModalOpen(true);
    setMovementsLoading(true);
    try {
      const res = await pharmacyInventoryService.getBatchMovements(batchId, {
        size: 50,
        sort: 'occurredAt,DESC',
      });
      setMovements(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải thẻ kho lô thuốc';
      toast.error(msg);
    } finally {
      setMovementsLoading(false);
    }
  };

  // Filtered List based on Quick Toggle
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      if (filterMode === 'BELOW_MIN') {
        return item.belowMinimum;
      }
      if (filterMode === 'EXPIRY_ALERT') {
        return item.expiryAlerts && item.expiryAlerts.length > 0;
      }
      return true;
    });
  }, [inventoryList, filterMode]);

  // Calculate Metrics
  const totalMedicines = inventoryList.length;
  const belowMinCount = inventoryList.filter((i) => i.belowMinimum).length;
  const expiryAlertCount = inventoryList.reduce(
    (acc, curr) => acc + (curr.expiryAlerts ? curr.expiryAlerts.length : 0),
    0
  );
  const totalPhysicalQuantity = inventoryList.reduce(
    (acc, curr) => acc + (Number(curr.physicalQuantity) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Boxes className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Báo Cáo Tồn Kho &amp; Cảnh Báo An Toàn Dược
              </h1>
              <p className="text-sm text-slate-500">
                Theo dõi tồn kho khả dụng hai cấp (Kho chính &amp; Quầy phát), cảnh báo thiếu hụt và lô thuốc sắp hết hạn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              <Printer className="w-4 h-4 mr-1.5" /> In Báo Cáo Tồn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInventory}
              title="Làm mới"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Card 1: Tổng mặt hàng */}
          <div
            onClick={() => setFilterMode('ALL')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase">
                Mặt hàng quản lý
              </span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalMedicines}</span>
              <span className="text-xs text-slate-500">loại thuốc</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Tổng số lượng: {totalPhysicalQuantity.toLocaleString('vi-VN')} đơn vị
            </div>
          </div>

          {/* Card 2: Cảnh báo dưới mức an toàn */}
          <div
            onClick={() => setFilterMode('BELOW_MIN')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              filterMode === 'BELOW_MIN'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-rose-50/50 border-rose-200 hover:bg-rose-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase">
                Dưới mức tồn an toàn
              </span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-700">{belowMinCount}</span>
              <span className="text-xs text-rose-600">loại cần nhập</span>
            </div>
            <div className="mt-1 text-[11px] text-rose-600 font-medium">
              {belowMinCount > 0 ? 'Cần lập đề xuất mua sắm' : 'Mức tồn an toàn đạt chuẩn'}
            </div>
          </div>

          {/* Card 3: Cảnh báo hạn dùng */}
          <div
            onClick={() => setFilterMode('EXPIRY_ALERT')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              filterMode === 'EXPIRY_ALERT'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase">
                Lô cảnh báo hạn dùng
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{expiryAlertCount}</span>
              <span className="text-xs text-amber-600">lô thuốc</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-700 font-medium">
              Sắp hết hạn trong ngưỡng cảnh báo
            </div>
          </div>

          {/* Card 4: Liên kết nhanh lập đề xuất */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900 uppercase">
                  Dự trù &amp; Mua sắm
                </span>
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-indigo-700 mt-2">
                Lập đề xuất mua thuốc từ các cảnh báo thiếu hụt.
              </p>
            </div>
            <Link
              to="/pharmacy/purchase-requests"
              className="mt-2 inline-flex items-center text-xs font-bold text-indigo-700 hover:text-indigo-900"
            >
              Lập đề xuất mua ngay <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Tìm theo tên thuốc, hoạt chất, mã thuốc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={filterMode === 'ALL' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('ALL')}
              className="text-xs"
            >
              Tất cả ({inventoryList.length})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'BELOW_MIN' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('BELOW_MIN')}
              className={`text-xs ${
                filterMode === 'BELOW_MIN'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'text-rose-700 border-rose-300'
              }`}
            >
              Thiếu hụt ({belowMinCount})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'EXPIRY_ALERT' ? 'primary' : 'outline'}
              onClick={() => setFilterMode('EXPIRY_ALERT')}
              className={`text-xs ${
                filterMode === 'EXPIRY_ALERT'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'text-amber-800 border-amber-300'
              }`}
            >
              Cảnh báo hạn dùng ({expiryAlertCount})
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Bảng Dữ liệu Tồn kho thuốc */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">
            Danh Sách Tồn Kho Chi Tiết Theo Mặt Hàng ({filteredInventory.length})
          </h2>
          <span className="text-xs text-slate-500">
            Tồn khả dụng = Tồn tại Quầy &amp; Kho chính thuộc nhóm AVAILABLE
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Đang tải dữ liệu báo cáo tồn kho...
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            Không có mặt hàng thuốc nào theo tiêu chí bộ lọc đã chọn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã Thuốc</th>
                  <th className="py-3 px-4">Tên Thuốc &amp; Quy Cách</th>
                  <th className="py-3 px-4 text-center">ĐVT</th>
                  <th className="py-3 px-4 text-right">Mức An Toàn</th>
                  <th className="py-3 px-4 text-right">Tồn Vật Lý</th>
                  <th className="py-3 px-4 text-right">Tồn Khả Dụng</th>
                  <th className="py-3 px-4">Tình Trạng &amp; Cảnh Báo</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const hasExpiryAlert = item.expiryAlerts && item.expiryAlerts.length > 0;

                  return (
                    <tr key={item.medicineId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        #{item.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.name}
                        <div className="text-[11px] text-slate-400 font-normal">
                          Cảnh báo hạn: {item.expiryWarningDays} ngày
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        {item.baseUnit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {item.minimumStock || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {item.physicalQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                        {item.dispensableQuantity}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {item.belowMinimum ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                              <TrendingDown className="w-3 h-3 mr-1 inline" /> DƯỚI MỨC TỒN ({item.dispensableQuantity}/{item.minimumStock})
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" /> ĐẠT MỨC AN TOÀN
                            </Badge>
                          )}

                          {hasExpiryAlert && (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold">
                              <AlertTriangle className="w-3 h-3 mr-1 inline text-amber-600" />
                              {item.expiryAlerts.length} lô sắp/đã hết hạn
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMedicine(item);
                            setIsPositionModalOpen(true);
                          }}
                          className="py-1 px-2.5 text-xs hover:bg-emerald-50 hover:text-emerald-700 border-slate-300"
                        >
                          <Layers className="w-3.5 h-3.5 mr-1" /> Chi tiết kho &amp; Lô
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: CHI TIẾT VỊ TRÍ TỒN & PHÂN BỔ LÔ CỦA THUỐC */}
      <Modal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        title={`Vị Trí Tồn Kho & Lô Thuốc: ${selectedMedicine?.name} (${selectedMedicine?.code})`}
      >
        {selectedMedicine && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Mức tồn tối thiểu</span>
                <span className="font-bold text-slate-800">
                  {selectedMedicine.minimumStock} {selectedMedicine.baseUnit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tổng tồn vật lý</span>
                <span className="font-bold text-slate-800">
                  {selectedMedicine.physicalQuantity} {selectedMedicine.baseUnit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tồn khả dụng xét cấp</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {selectedMedicine.dispensableQuantity} {selectedMedicine.baseUnit}
                </span>
              </div>
            </div>

            {/* Cảnh báo hạn dùng nếu có */}
            {selectedMedicine.expiryAlerts && selectedMedicine.expiryAlerts.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Cảnh báo hạn dùng cho {selectedMedicine.expiryAlerts.length} lô thuốc:
                </span>
                <div className="divide-y divide-amber-200">
                  {selectedMedicine.expiryAlerts.map((alert, aIdx) => (
                    <div key={aIdx} className="py-1 flex justify-between items-center text-amber-800">
                      <span>Lô #{alert.batchNumber} (HSD: {alert.expiryDate})</span>
                      <span className="font-semibold">
                        {alert.expired ? 'ĐÃ HẾT HẠN' : `Còn ${alert.daysUntilExpiry} ngày`} (SL: {alert.physicalQuantity})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bảng vị trí tồn chi tiết (Kho & Lô) */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Lô Thuốc</th>
                    <th className="py-2.5 px-3">Hạn Dùng</th>
                    <th className="py-2.5 px-3">Vị Trí Kho &amp; Nhóm</th>
                    <th className="py-2.5 px-3">Trạng Thái Lô</th>
                    <th className="py-2.5 px-3 text-right">Tồn Vật Lý</th>
                    <th className="py-2.5 px-3 text-right">Tồn Khả Dụng</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMedicine.positions && selectedMedicine.positions.length > 0 ? (
                    selectedMedicine.positions.map((pos, pIdx) => (
                      <tr key={pIdx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          #{pos.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {pos.expiryDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{pos.stockLocation}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-slate-500">{pos.stockBucket}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {pos.batchStatus === 'ACTIVE' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                              ACTIVE
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 text-[10px]">
                              BLOCKED
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {pos.physicalQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {pos.dispensableQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenMovements(pos.batchId, pos.batchNumber)}
                            className="py-1 px-2 text-[11px] text-blue-700 hover:bg-blue-50 border-blue-200"
                          >
                            <History className="w-3 h-3 mr-1" /> Thẻ kho
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Chưa có lô nào ghi nhận vị trí tồn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsPositionModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: THẺ KHO LÔ THUỐC (BATCH MOVEMENTS) */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={`Thẻ Kho Lô Thuốc: #${selectedBatchNumber} (ID: ${selectedBatchId})`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Toàn bộ lịch sử các giao dịch phát sinh liên quan đến lô thuốc này:
          </p>

          {movementsLoading ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
              Đang tải lịch sử giao dịch thẻ kho...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Chưa ghi nhận biến động nào cho lô thuốc này.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3">Mã phiếu</th>
                    <th className="py-2 px-3">Loại nghiệp vụ</th>
                    <th className="py-2 px-3">Vị trí kho</th>
                    <th className="py-2 px-3 text-right">Biến động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((mv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {new Date(mv.occurredAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-800">
                        #{mv.documentCode || mv.documentId}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        {mv.type}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {mv.stockLocation} / {mv.stockBucket}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-sm">
                        <span className={mv.deltaQuantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {mv.deltaQuantity >= 0 ? `+${mv.deltaQuantity}` : mv.deltaQuantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsMovementModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
