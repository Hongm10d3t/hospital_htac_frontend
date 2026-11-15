import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Filter,
  XCircle,
  Clock,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  RefreshCw,
  Layers,
  Trash2,
  Check,
  Eye,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  pharmacyStockDocumentService,
  type StockDocumentResponse,
  type StockMovementReportLine,
} from '../../services/pharmacyStockDocumentService';
import {
  pharmacyCatalogService,
  type MedicineItem,
  type SupplierItem,
  type MedicineBatchItem,
} from '../../services/pharmacyCatalogService';

export const PharmacyStockDocumentsPage: React.FC = () => {
  const toast = useToast();

  // Filter & Search states
  const [loading, setLoading] = useState<boolean>(false);
  const [movements, setMovements] = useState<StockMovementReportLine[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [searchDocId, setSearchDocId] = useState<string>('');

  // Catalogs cache
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [batchesByMedicine, setBatchesByMedicine] = useState<Record<number, MedicineBatchItem[]>>({});

  // Document Detail Modal state
  const [selectedDoc, setSelectedDoc] = useState<StockDocumentResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Cancel Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createTab, setCreateTab] = useState<'RECEIPT' | 'TRANSFER' | 'ADJUSTMENT' | 'DISPOSAL' | 'OPENING'>('RECEIPT');

  // Form states for creation
  // Tab 1: Receipt
  const [receiptSupplierId, setReceiptSupplierId] = useState<string>('');
  const [receiptLocation, setReceiptLocation] = useState<string>('MAIN');
  const [receiptBucket, setReceiptBucket] = useState<string>('AVAILABLE');
  const [receiptPurchaseRequestId, setReceiptPurchaseRequestId] = useState<string>('');
  const [receiptNote, setReceiptNote] = useState<string>('');
  const [receiptItems, setReceiptItems] = useState<
    Array<{ medicineId: number; batchId: number; quantity: number; unitCost: number; note: string }>
  >([]);

  // Tab 2: Transfer
  const [transferSourceLocation, setTransferSourceLocation] = useState<string>('MAIN');
  const transferSourceBucket = 'AVAILABLE';
  const [transferDestLocation, setTransferDestLocation] = useState<string>('COUNTER');
  const transferDestBucket = 'AVAILABLE';
  const [transferNote, setTransferNote] = useState<string>('Điều chuyển kho định kỳ cấp phát');
  const [transferItems, setTransferItems] = useState<
    Array<{ medicineId: number; batchId: number; quantity: number; note: string }>
  >([]);

  // Tab 3: Adjustment
  const [adjLocation, setAdjLocation] = useState<string>('COUNTER');
  const adjBucket = 'AVAILABLE';
  const [adjReason, setAdjReason] = useState<string>('Kiểm kê định kỳ tháng');
  const [adjItems, setAdjItems] = useState<
    Array<{ medicineId: number; batchId: number; bookQuantity: number; countedQuantity: number; note: string }>
  >([]);

  // Tab 4: Disposal
  const [exitType, setExitType] = useState<'DISPOSAL' | 'SUPPLIER_RETURN'>('DISPOSAL');
  const [exitLocation, setExitLocation] = useState<string>('MAIN');
  const exitBucket = 'QUARANTINE';
  const [exitSupplierId] = useState<string>('');
  const [exitReason, setExitReason] = useState<string>('Thuốc hỏng bao bì/hết hạn theo quy định');
  const [exitItems, setExitItems] = useState<
    Array<{ medicineId: number; batchId: number; quantity: number; note: string }>
  >([]);

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      const [medsRes, suppsRes] = await Promise.all([
        pharmacyCatalogService.getMedicines({ size: 200 }),
        pharmacyCatalogService.getSuppliers({ size: 100 }),
      ]);
      setMedicines(medsRes.items || []);
      setSuppliers(suppsRes.items || []);
    } catch {
      // Ignore initial catalog load error
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyStockDocumentService.searchMovementLines({
        type: filterType || undefined,
        location: filterLocation || undefined,
        size: 50,
      });
      setMovements(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi nạp nhật ký biến động kho';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterLocation, toast]);

  useEffect(() => {
    loadInitialData();
    loadMovements();
  }, [loadInitialData, loadMovements]);

  // Load batches for a medicine if not yet cached
  const ensureBatchesForMedicine = async (medId: number) => {
    if (batchesByMedicine[medId]) return batchesByMedicine[medId];
    try {
      const bList = await pharmacyCatalogService.getBatches(medId);
      setBatchesByMedicine((prev) => ({ ...prev, [medId]: bList }));
      return bList;
    } catch {
      return [];
    }
  };

  // Open Document detail by ID
  const handleOpenDocDetail = async (id: number) => {
    setActionLoading(true);
    try {
      const doc = await pharmacyStockDocumentService.get(id);
      setSelectedDoc(doc);
      setIsDetailModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không tìm thấy phiếu kho';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Post document
  const handlePostDoc = async (id: number) => {
    if (!window.confirm(`Xác nhận ghi sổ phiếu kho #${id}? Hành động này sẽ cập nhật tồn kho vật lý và không thể hoàn tác.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const updated = await pharmacyStockDocumentService.post(id);
      setSelectedDoc(updated);
      toast.success(`Đã ghi sổ thành công phiếu kho #${updated.documentCode}`);
      loadMovements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi ghi sổ phiếu kho';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel document
  const handleConfirmCancelDoc = async () => {
    if (!selectedDoc) return;
    if (!cancelReason.trim()) {
      toast.warning('Vui lòng nhập lý do hủy phiếu');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await pharmacyStockDocumentService.cancel(selectedDoc.id, cancelReason);
      setSelectedDoc(updated);
      setIsCancelModalOpen(false);
      setCancelReason('');
      toast.success(`Đã hủy phiếu kho #${updated.documentCode}`);
      loadMovements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hủy phiếu kho';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for adding lines in Create Modal
  const handleAddReceiptItem = async () => {
    if (medicines.length === 0) return;
    const defaultMed = medicines[0];
    const bList = await ensureBatchesForMedicine(defaultMed.id);
    const defaultBatchId = bList[0]?.id || 1;
    setReceiptItems((prev) => [
      ...prev,
      { medicineId: defaultMed.id, batchId: defaultBatchId, quantity: 100, unitCost: 5000, note: '' },
    ]);
  };

  const handleAddTransferItem = async () => {
    if (medicines.length === 0) return;
    const defaultMed = medicines[0];
    const bList = await ensureBatchesForMedicine(defaultMed.id);
    const defaultBatchId = bList[0]?.id || 1;
    setTransferItems((prev) => [
      ...prev,
      { medicineId: defaultMed.id, batchId: defaultBatchId, quantity: 50, note: '' },
    ]);
  };

  const handleAddAdjItem = async () => {
    if (medicines.length === 0) return;
    const defaultMed = medicines[0];
    const bList = await ensureBatchesForMedicine(defaultMed.id);
    const defaultBatchId = bList[0]?.id || 1;
    setAdjItems((prev) => [
      ...prev,
      { medicineId: defaultMed.id, batchId: defaultBatchId, bookQuantity: 100, countedQuantity: 100, note: '' },
    ]);
  };

  const handleAddExitItem = async () => {
    if (medicines.length === 0) return;
    const defaultMed = medicines[0];
    const bList = await ensureBatchesForMedicine(defaultMed.id);
    const defaultBatchId = bList[0]?.id || 1;
    setExitItems((prev) => [
      ...prev,
      { medicineId: defaultMed.id, batchId: defaultBatchId, quantity: 10, note: '' },
    ]);
  };

  // Submit creation
  const handleCreateDocument = async (autoPost: boolean = false) => {
    setActionLoading(true);
    try {
      let createdDoc: StockDocumentResponse;

      if (createTab === 'RECEIPT') {
        const suppId = parseInt(receiptSupplierId, 10);
        if (isNaN(suppId) || suppId <= 0) {
          toast.warning('Vui lòng chọn Nhà cung cấp');
          setActionLoading(false);
          return;
        }
        if (receiptItems.length === 0) {
          toast.warning('Vui lòng thêm ít nhất 1 dòng thuốc nhập kho');
          setActionLoading(false);
          return;
        }

        createdDoc = await pharmacyStockDocumentService.createReceipt({
          occurredAt: new Date().toISOString(),
          stockLocation: receiptLocation,
          stockBucket: receiptBucket,
          supplierId: suppId,
          purchaseRequestId: receiptPurchaseRequestId ? parseInt(receiptPurchaseRequestId, 10) : undefined,
          note: receiptNote || undefined,
          items: receiptItems.map((item) => ({
            batchId: item.batchId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            note: item.note || undefined,
          })),
        });
      } else if (createTab === 'TRANSFER') {
        if (transferItems.length === 0) {
          toast.warning('Vui lòng thêm ít nhất 1 mặt hàng điều chuyển');
          setActionLoading(false);
          return;
        }
        createdDoc = await pharmacyStockDocumentService.createTransfer({
          occurredAt: new Date().toISOString(),
          stockLocation: transferSourceLocation,
          stockBucket: transferSourceBucket,
          destinationLocation: transferDestLocation,
          destinationBucket: transferDestBucket,
          note: transferNote,
          releaseConfirmed: true,
          items: transferItems.map((item) => ({
            batchId: item.batchId,
            quantity: item.quantity,
            note: item.note || undefined,
          })),
        });
      } else if (createTab === 'ADJUSTMENT') {
        if (adjItems.length === 0) {
          toast.warning('Vui lòng thêm ít nhất 1 dòng kiểm kê');
          setActionLoading(false);
          return;
        }
        createdDoc = await pharmacyStockDocumentService.createAdjustment({
          occurredAt: new Date().toISOString(),
          stockLocation: adjLocation,
          stockBucket: adjBucket,
          reason: adjReason,
          items: adjItems.map((item) => ({
            batchId: item.batchId,
            bookQuantity: item.bookQuantity,
            countedQuantity: item.countedQuantity,
            note: item.note || undefined,
          })),
        });
      } else if (createTab === 'DISPOSAL') {
        if (exitItems.length === 0) {
          toast.warning('Vui lòng thêm ít nhất 1 dòng thuốc xuất');
          setActionLoading(false);
          return;
        }
        if (exitType === 'DISPOSAL') {
          createdDoc = await pharmacyStockDocumentService.createDisposal({
            occurredAt: new Date().toISOString(),
            stockLocation: exitLocation,
            stockBucket: exitBucket,
            reason: exitReason,
            items: exitItems.map((i) => ({
              batchId: i.batchId,
              quantity: i.quantity,
              note: i.note || undefined,
            })),
          });
        } else {
          const sId = exitSupplierId ? parseInt(exitSupplierId, 10) : undefined;
          createdDoc = await pharmacyStockDocumentService.createSupplierReturn({
            occurredAt: new Date().toISOString(),
            stockLocation: exitLocation,
            stockBucket: exitBucket,
            supplierId: sId,
            reason: exitReason,
            items: exitItems.map((i) => ({
              batchId: i.batchId,
              quantity: i.quantity,
              note: i.note || undefined,
            })),
          });
        }
      } else {
        // OPENING
        createdDoc = await pharmacyStockDocumentService.createOpening({
          occurredAt: new Date().toISOString(),
          stockLocation: 'MAIN',
          stockBucket: 'AVAILABLE',
          note: 'Nhập tồn đầu kỳ hệ thống',
          items: receiptItems.map((item) => ({
            batchId: item.batchId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            note: item.note || undefined,
          })),
        });
      }

      toast.success(`Đã tạo thành công phiếu kho #${createdDoc.documentCode}`);

      if (autoPost) {
        const posted = await pharmacyStockDocumentService.post(createdDoc.id);
        toast.success(`Đã ghi sổ thành công phiếu #${posted.documentCode}`);
      }

      setIsCreateModalOpen(false);
      loadMovements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình tạo phiếu kho';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper badge for document type
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">NHẬP KHO (RECEIPT)</Badge>;
      case 'TRANSFER':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">ĐIỀU CHUYỂN (TRANSFER)</Badge>;
      case 'DISPENSE':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-300">XUẤT PHÁT (DISPENSE)</Badge>;
      case 'ADJUSTMENT':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">KIỂM KÊ (ADJUSTMENT)</Badge>;
      case 'DISPOSAL':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">XUẤT HỦY (DISPOSAL)</Badge>;
      case 'PATIENT_RETURN':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">BN TRẢ THUỐC</Badge>;
      case 'SUPPLIER_RETURN':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">TRẢ NHÀ CUNG CẤP</Badge>;
      case 'OPENING':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">TỒN ĐẦU KỲ</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return (
          <Badge className="bg-emerald-600 text-white font-bold border-emerald-500">
            <Check className="w-3 h-3 mr-1 inline" /> ĐÃ GHI SỔ
          </Badge>
        );
      case 'DRAFT':
        return (
          <Badge className="bg-amber-500 text-white font-bold border-amber-400">
            <Clock className="w-3 h-3 mr-1 inline" /> BẢN NHÁP
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-rose-600 text-white font-bold border-rose-500">
            <XCircle className="w-3 h-3 mr-1 inline" /> ĐÃ HỦY
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Quản Lý Phiếu Kho Nghiệp Vụ
              </h1>
              <p className="text-sm text-slate-500">
                Nhập kho mua hàng, Điều chuyển Kho chính ➔ Quầy phát, Kiểm kê cân kho và Xuất hủy
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setCreateTab('RECEIPT');
                setIsCreateModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1.5" /> + Nhập Mua Hàng
            </Button>
            <Button
              onClick={() => {
                setCreateTab('TRANSFER');
                setIsCreateModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> + Điều Chuyển Kho
            </Button>
            <Button
              onClick={() => {
                setCreateTab('ADJUSTMENT');
                setIsCreateModalOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" /> + Kiểm Kê / Cân Kho
            </Button>
            <Button
              onClick={() => {
                setCreateTab('DISPOSAL');
                setIsCreateModalOpen(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> + Xuất Hủy / Trả NCC
            </Button>
          </div>
        </div>

        {/* Thanh tìm kiếm tra cứu phiếu nhanh theo ID */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tra cứu phiếu theo ID:</span>
            <Input
              type="number"
              placeholder="VD: 1, 2, 3..."
              value={searchDocId}
              onChange={(e) => setSearchDocId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchDocId && handleOpenDocDetail(parseInt(searchDocId, 10))}
              className="w-32 py-1 px-2 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => searchDocId && handleOpenDocDetail(parseInt(searchDocId, 10))}
              isLoading={actionLoading}
              className="text-xs"
            >
              Xem phiếu
            </Button>
          </div>

          <div className="flex-1" />

          {/* Bộ lọc loại nghiệp vụ */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
            >
              <option value="">Tất cả loại nghiệp vụ</option>
              <option value="RECEIPT">Nhập kho (RECEIPT)</option>
              <option value="TRANSFER">Điều chuyển (TRANSFER)</option>
              <option value="DISPENSE">Xuất phát (DISPENSE)</option>
              <option value="ADJUSTMENT">Kiểm kê (ADJUSTMENT)</option>
              <option value="DISPOSAL">Xuất hủy (DISPOSAL)</option>
              <option value="PATIENT_RETURN">BN trả thuốc (PATIENT_RETURN)</option>
              <option value="SUPPLIER_RETURN">Trả NCC (SUPPLIER_RETURN)</option>
              <option value="OPENING">Tồn đầu kỳ (OPENING)</option>
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
            >
              <option value="">Tất cả kho</option>
              <option value="MAIN">Kho chính (MAIN)</option>
              <option value="COUNTER">Quầy phát (COUNTER)</option>
            </select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => loadMovements()}
              title="Làm mới"
              className="p-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Bảng Danh sách Nhật ký biến động xuất nhập kho */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-slate-800 text-sm">
              Nhật Ký Dòng Nghiệp Vụ Kho (Stock Movement Lines)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Hiển thị tối đa 50 giao dịch gần nhất
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            Đang tải dữ liệu chứng từ kho...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            Chưa có dòng biến động kho nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Mã chứng từ</th>
                  <th className="py-3 px-4">Loại phiếu</th>
                  <th className="py-3 px-4">Kho &amp; Nhóm tồn</th>
                  <th className="py-3 px-4">ID Lô thuốc</th>
                  <th className="py-3 px-4 text-right">Biến động (SL)</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(m.occurredAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      #{m.documentCode || m.documentId}
                    </td>
                    <td className="py-3 px-4">{renderTypeBadge(m.type)}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{m.stockLocation}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-slate-500">{m.stockBucket}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      Lô #{m.batchId}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-sm">
                      <span className={m.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDocDetail(m.documentId)}
                        className="text-xs py-1 px-2.5 hover:bg-blue-50 hover:text-blue-700 border-slate-300"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: CHI TIẾT PHIẾU KHO */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Chi Tiết Phiếu Kho: #${selectedDoc?.documentCode || selectedDoc?.id}`}
      >
        {selectedDoc && (
          <div className="space-y-4">
            {/* Header thông tin phiếu */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Loại nghiệp vụ</span>
                {renderTypeBadge(selectedDoc.type)}
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Trạng thái phiếu</span>
                {renderStatusBadge(selectedDoc.status)}
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Thời điểm phát sinh</span>
                <span className="font-medium text-slate-800">
                  {new Date(selectedDoc.occurredAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Kho nguồn / Vị trí</span>
                <span className="font-semibold text-slate-800">
                  {selectedDoc.stockLocation} / {selectedDoc.stockBucket}
                </span>
              </div>

              {selectedDoc.destinationLocation && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Kho đích nhận</span>
                  <span className="font-semibold text-blue-700">
                    {selectedDoc.destinationLocation} / {selectedDoc.destinationBucket}
                  </span>
                </div>
              )}

              {selectedDoc.supplierId && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Nhà cung cấp</span>
                  <span className="font-medium text-slate-800">
                    ID #{selectedDoc.supplierId}
                  </span>
                </div>
              )}

              {selectedDoc.prescriptionId && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Đơn thuốc liên kết</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    #{selectedDoc.prescriptionId}
                  </span>
                </div>
              )}

              {selectedDoc.postedAt && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Thời gian ghi sổ</span>
                  <span className="text-emerald-700 font-medium">
                    {new Date(selectedDoc.postedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              )}
            </div>

            {selectedDoc.note && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Ghi chú phiếu:</strong> {selectedDoc.note}
              </div>
            )}

            {/* Bảng chi tiết mặt hàng */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">ID Lô thuốc</th>
                    <th className="py-2.5 px-3 text-right">Số lượng</th>
                    {selectedDoc.type === 'RECEIPT' && (
                      <th className="py-2.5 px-3 text-right">Đơn giá nhập</th>
                    )}
                    {selectedDoc.type === 'ADJUSTMENT' && (
                      <>
                        <th className="py-2.5 px-3 text-right">Tồn sổ sách</th>
                        <th className="py-2.5 px-3 text-right">Tồn kiểm kê</th>
                      </>
                    )}
                    <th className="py-2.5 px-3">Ghi chú dòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDoc.items.map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500">{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        Lô #{item.batchId}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {item.quantity}
                      </td>
                      {selectedDoc.type === 'RECEIPT' && (
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                          {item.unitCost ? item.unitCost.toLocaleString('vi-VN') + ' đ' : '-'}
                        </td>
                      )}
                      {selectedDoc.type === 'ADJUSTMENT' && (
                        <>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {item.bookQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                            {item.countedQuantity}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-3 text-slate-500">{item.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> In phiếu kho
              </Button>

              <div className="flex items-center gap-2">
                {selectedDoc.status === 'DRAFT' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hủy phiếu
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePostDoc(selectedDoc.id)}
                      isLoading={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Ghi Sổ Kho Ngay
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-xs"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: HỦY PHIẾU KHO NHÁP */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Xác Nhận Hủy Phiếu Kho Nháp"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Phiếu kho sẽ chuyển sang trạng thái <strong>CANCELLED</strong> và không thể ghi sổ được nữa. Vui lòng nhập lý do hủy:
          </p>
          <Input
            placeholder="Nhập lý do hủy phiếu..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="text-xs"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              Quay lại
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCancelDoc}
              isLoading={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
            >
              Xác nhận Hủy
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: TẠO MỚI PHIẾU KHO NGHIỆP VỤ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Lập Phiếu Kho Nghiệp Vụ Mới"
      >
        <div className="space-y-4">
          {/* Tabs selector */}
          <div className="flex border-b border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setCreateTab('RECEIPT')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                createTab === 'RECEIPT'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Nhập mua hàng (RECEIPT)
            </button>
            <button
              type="button"
              onClick={() => setCreateTab('TRANSFER')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                createTab === 'TRANSFER'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Điều chuyển (TRANSFER)
            </button>
            <button
              type="button"
              onClick={() => setCreateTab('ADJUSTMENT')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                createTab === 'ADJUSTMENT'
                  ? 'border-purple-600 text-purple-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Kiểm kê (ADJUSTMENT)
            </button>
            <button
              type="button"
              onClick={() => setCreateTab('DISPOSAL')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                createTab === 'DISPOSAL'
                  ? 'border-rose-600 text-rose-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Xuất hủy / Trả NCC
            </button>
          </div>

          {/* TAB 1: RECEIPT FORM */}
          {createTab === 'RECEIPT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nhà cung cấp (*):
                  </label>
                  <select
                    value={receiptSupplierId}
                    onChange={(e) => setReceiptSupplierId(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="">-- Chọn Nhà cung cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mã Đề xuất mua hàng (tùy chọn):
                  </label>
                  <Input
                    type="number"
                    placeholder="VD: 1, 2..."
                    value={receiptPurchaseRequestId}
                    onChange={(e) => setReceiptPurchaseRequestId(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Kho nhập</label>
                  <select
                    value={receiptLocation}
                    onChange={(e) => setReceiptLocation(e.target.value)}
                    className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="MAIN">Kho chính (MAIN)</option>
                    <option value="COUNTER">Quầy phát (COUNTER)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Nhóm tồn</label>
                  <select
                    value={receiptBucket}
                    onChange={(e) => setReceiptBucket(e.target.value)}
                    className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="AVAILABLE">Khả dụng (AVAILABLE)</option>
                    <option value="QUARANTINE">Cách ly kiểm định (QUARANTINE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Ghi chú phiếu nhập</label>
                <Input
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  placeholder="Ghi chú hóa đơn / số vận đơn..."
                  className="text-xs"
                />
              </div>

              {/* Danh sách dòng nhập kho */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">
                    Chi tiết mặt hàng nhập kho ({receiptItems.length} dòng):
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddReceiptItem}
                    className="text-xs py-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {receiptItems.map((item, idx) => {
                    const mBatches = batchesByMedicine[item.medicineId] || [];
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-0.5">Thuốc</label>
                            <select
                              value={item.medicineId}
                              onChange={async (e) => {
                                const mId = parseInt(e.target.value, 10);
                                const bList = await ensureBatchesForMedicine(mId);
                                setReceiptItems((prev) => {
                                  const next = [...prev];
                                  next[idx].medicineId = mId;
                                  next[idx].batchId = bList[0]?.id || 1;
                                  return next;
                                });
                              }}
                              className="w-full text-xs py-1 px-2 bg-white border border-slate-300 rounded"
                            >
                              {medicines.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-500 block mb-0.5">Lô thuốc</label>
                            <select
                              value={item.batchId}
                              onChange={(e) => {
                                const bId = parseInt(e.target.value, 10);
                                setReceiptItems((prev) => {
                                  const next = [...prev];
                                  next[idx].batchId = bId;
                                  return next;
                                });
                              }}
                              className="w-full text-xs py-1 px-2 bg-white border border-slate-300 rounded"
                            >
                              {mBatches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  Lô: {b.batchNumber} (HSD: {b.expiryDate})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-1/3">
                            <label className="text-[11px] text-slate-500 block mb-0.5">Số lượng</label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setReceiptItems((prev) => {
                                  const next = [...prev];
                                  next[idx].quantity = val;
                                  return next;
                                });
                              }}
                              className="text-xs py-1 px-2 font-bold"
                            />
                          </div>

                          <div className="w-1/3">
                            <label className="text-[11px] text-slate-500 block mb-0.5">Đơn giá (VNĐ)</label>
                            <Input
                              type="number"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setReceiptItems((prev) => {
                                  const next = [...prev];
                                  next[idx].unitCost = val;
                                  return next;
                                });
                              }}
                              className="text-xs py-1 px-2"
                            />
                          </div>

                          <div className="flex-1 flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptItems((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER FORM */}
          {createTab === 'TRANSFER' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-200">
                <div>
                  <span className="text-xs font-semibold text-blue-900 block mb-1">Từ Kho Xuất:</span>
                  <select
                    value={transferSourceLocation}
                    onChange={(e) => setTransferSourceLocation(e.target.value)}
                    className="w-full text-xs py-1 px-2 bg-white border border-slate-300 rounded"
                  >
                    <option value="MAIN">Kho chính (MAIN)</option>
                    <option value="COUNTER">Quầy phát (COUNTER)</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-900 block mb-1">Đến Kho Nhận:</span>
                  <select
                    value={transferDestLocation}
                    onChange={(e) => setTransferDestLocation(e.target.value)}
                    className="w-full text-xs py-1 px-2 bg-white border border-slate-300 rounded"
                  >
                    <option value="COUNTER">Quầy phát (COUNTER)</option>
                    <option value="MAIN">Kho chính (MAIN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Lý do điều chuyển</label>
                <Input
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Danh sách mặt hàng chuyển */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">
                    Thuốc cần điều chuyển ({transferItems.length} dòng):
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddTransferItem}
                    className="text-xs py-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {transferItems.map((item, idx) => {
                    const mBatches = batchesByMedicine[item.medicineId] || [];
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={item.medicineId}
                            onChange={async (e) => {
                              const mId = parseInt(e.target.value, 10);
                              const bList = await ensureBatchesForMedicine(mId);
                              setTransferItems((prev) => {
                                const next = [...prev];
                                next[idx].medicineId = mId;
                                next[idx].batchId = bList[0]?.id || 1;
                                return next;
                              });
                            }}
                            className="text-xs py-1 px-2 bg-white border border-slate-300 rounded"
                          >
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>

                          <select
                            value={item.batchId}
                            onChange={(e) => {
                              const bId = parseInt(e.target.value, 10);
                              setTransferItems((prev) => {
                                const next = [...prev];
                                next[idx].batchId = bId;
                                return next;
                              });
                            }}
                            className="text-xs py-1 px-2 bg-white border border-slate-300 rounded"
                          >
                            {mBatches.map((b) => (
                              <option key={b.id} value={b.id}>Lô {b.batchNumber}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-32">
                            <Input
                              type="number"
                              min="1"
                              placeholder="SL chuyển"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTransferItems((prev) => {
                                  const next = [...prev];
                                  next[idx].quantity = val;
                                  return next;
                                });
                              }}
                              className="text-xs py-1 px-2 font-bold"
                            />
                          </div>
                          <div className="flex-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setTransferItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADJUSTMENT FORM */}
          {createTab === 'ADJUSTMENT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Vị trí kiểm kê</label>
                  <select
                    value={adjLocation}
                    onChange={(e) => setAdjLocation(e.target.value)}
                    className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="COUNTER">Quầy phát (COUNTER)</option>
                    <option value="MAIN">Kho chính (MAIN)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Lý do kiểm kê</label>
                  <Input
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Danh sách dòng kiểm kê */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">
                    Dòng kiểm kê ({adjItems.length}):
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddAdjItem}
                    className="text-xs py-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {adjItems.map((item, idx) => {
                    const diff = item.countedQuantity - item.bookQuantity;
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                        <div className="flex justify-between items-center font-medium">
                          <span>Dòng kiểm kê #{idx + 1} (Lô #{item.batchId})</span>
                          <span className={`font-bold ${diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            Chênh lệch: {diff >= 0 ? `+${diff}` : diff}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-0.5">Tồn sổ sách</label>
                            <Input
                              type="number"
                              min="0"
                              value={item.bookQuantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setAdjItems((prev) => {
                                  const next = [...prev];
                                  next[idx].bookQuantity = val;
                                  return next;
                                });
                              }}
                              className="text-xs py-1 px-2"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-0.5">Tồn thực tế đếm</label>
                            <Input
                              type="number"
                              min="0"
                              value={item.countedQuantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setAdjItems((prev) => {
                                  const next = [...prev];
                                  next[idx].countedQuantity = val;
                                  return next;
                                });
                              }}
                              className="text-xs py-1 px-2 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISPOSAL / SUPPLIER_RETURN */}
          {createTab === 'DISPOSAL' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Loại xuất</label>
                  <select
                    value={exitType}
                    onChange={(e) => setExitType(e.target.value as 'DISPOSAL' | 'SUPPLIER_RETURN')}
                    className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="DISPOSAL">Xuất Hủy (Thuốc hỏng / hết hạn)</option>
                    <option value="SUPPLIER_RETURN">Xuất Trả Nhà Cung Cấp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Kho xuất</label>
                  <select
                    value={exitLocation}
                    onChange={(e) => setExitLocation(e.target.value)}
                    className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded"
                  >
                    <option value="MAIN">Kho chính (MAIN)</option>
                    <option value="COUNTER">Quầy phát (COUNTER)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lý do xuất (*):
                </label>
                <Input
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Danh sách dòng xuất */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">
                    Thuốc xuất ({exitItems.length} dòng):
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddExitItem}
                    className="text-xs py-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {exitItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[11px] text-slate-500 block mb-0.5">ID Lô thuốc</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.batchId}
                            onChange={(e) => {
                              const bId = parseInt(e.target.value, 10) || 1;
                              setExitItems((prev) => {
                                const next = [...prev];
                                next[idx].batchId = bId;
                                return next;
                              });
                            }}
                            className="text-xs py-1 px-2"
                          />
                        </div>

                        <div className="w-32">
                          <label className="text-[11px] text-slate-500 block mb-0.5">SL xuất</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setExitItems((prev) => {
                                const next = [...prev];
                                next[idx].quantity = val;
                                return next;
                              });
                            }}
                            className="text-xs py-1 px-2 font-bold"
                          />
                        </div>

                        <div className="self-end pb-1">
                          <button
                            type="button"
                            onClick={() => setExitItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCreateDocument(false)}
              isLoading={actionLoading}
              className="text-xs"
            >
              Lưu bản nháp (DRAFT)
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateDocument(true)}
              isLoading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Tạo &amp; Ghi sổ ngay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
