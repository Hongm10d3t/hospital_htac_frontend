import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Truck,
  PackageCheck,
  Building2,
  Eye,
  Trash2,
  Edit,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  purchaseRequestService,
  type PurchaseRequestResponse,
  type PurchaseRequestStatus,
  type PurchaseRequestWrite,
} from '../../services/purchaseRequestService';
import {
  pharmacyCatalogService,
  type MedicineItem,
  type SupplierItem,
} from '../../services/pharmacyCatalogService';
import { useNavigate } from 'react-router-dom';

export const PharmacyPurchaseRequestsPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Filter & list state
  const [requests, setRequests] = useState<PurchaseRequestResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('');

  // Catalogs
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);

  // Order modal state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderRequestId, setOrderRequestId] = useState<number | null>(null);
  const [orderDeliveryDate, setOrderDeliveryDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Close modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [closeRequestId, setCloseRequestId] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState<string>('Đã nhận đủ hàng theo đề xuất');

  // Action loading
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form state for Create / Edit
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formItems, setFormItems] = useState<
    Array<{ medicineId: number; quantity: number; note: string }>
  >([]);

  // Load catalogs
  const loadCatalogs = useCallback(async () => {
    try {
      const [meds, supps] = await Promise.all([
        pharmacyCatalogService.getMedicines({ size: 200 }),
        pharmacyCatalogService.getSuppliers({ size: 100 }),
      ]);
      setMedicines(meds.items || []);
      setSuppliers(supps.items || []);
    } catch {
      // Ignore initial load error
    }
  }, []);

  // Load requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const suppId = filterSupplierId ? parseInt(filterSupplierId, 10) : undefined;
      const res = await purchaseRequestService.listRequests({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        supplierId: suppId,
        size: 50,
      });
      setRequests(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách đề xuất mua thuốc';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSupplierId, toast]);

  useEffect(() => {
    loadCatalogs();
    loadRequests();
  }, [loadCatalogs, loadRequests]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingRequestId(null);
    setFormSupplierId(suppliers[0]?.id ? String(suppliers[0].id) : '');
    setFormNote('');
    setFormItems(
      medicines.length > 0
        ? [{ medicineId: medicines[0].id, quantity: 100, note: '' }]
        : []
    );
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal for DRAFT
  const handleOpenEditModal = (req: PurchaseRequestResponse) => {
    setEditingRequestId(req.id);
    setFormSupplierId(req.supplierId ? String(req.supplierId) : '');
    setFormNote(req.note || '');
    setFormItems(
      req.items.map((i) => ({
        medicineId: i.medicineId,
        quantity: i.quantity,
        note: i.note || '',
      }))
    );
    setIsCreateModalOpen(true);
  };

  // Add line to form
  const handleAddFormItem = () => {
    if (medicines.length === 0) return;
    setFormItems((prev) => [
      ...prev,
      { medicineId: medicines[0].id, quantity: 50, note: '' },
    ]);
  };

  // Submit Create or Update
  const handleSubmitForm = async (autoSubmit: boolean = false) => {
    const sId = parseInt(formSupplierId, 10);
    if (isNaN(sId) || sId <= 0) {
      toast.warning('Vui lòng chọn Nhà cung cấp');
      return;
    }
    if (formItems.length === 0) {
      toast.warning('Vui lòng thêm ít nhất 1 mặt hàng thuốc');
      return;
    }

    const payload: PurchaseRequestWrite = {
      supplierId: sId,
      note: formNote || undefined,
      items: formItems.map((i) => ({
        medicineId: i.medicineId,
        quantity: i.quantity,
        note: i.note || undefined,
      })),
    };

    setActionLoading(true);
    try {
      let savedReq: PurchaseRequestResponse;
      if (editingRequestId) {
        savedReq = await purchaseRequestService.updateRequest(editingRequestId, payload);
        toast.success(`Đã cập nhật đề xuất #${savedReq.requestCode}`);
      } else {
        savedReq = await purchaseRequestService.createRequest(payload);
        toast.success(`Đã tạo đề xuất mua thuốc #${savedReq.requestCode}`);
      }

      if (autoSubmit) {
        const submitted = await purchaseRequestService.submitRequest(savedReq.id);
        toast.success(`Đã gửi đề xuất #${submitted.requestCode} lên Ban Giám đốc duyệt`);
      }

      setIsCreateModalOpen(false);
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu đề xuất mua thuốc';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit request (DRAFT -> PENDING)
  const handleSubmitToAdmin = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await purchaseRequestService.submitRequest(id);
      toast.success(`Đã gửi duyệt đề xuất #${res.requestCode}`);
      loadRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi duyệt đề xuất';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel request (DRAFT/PENDING -> CANCELLED)
  const handleCancelRequest = async (id: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đề xuất mua thuốc #${id}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await purchaseRequestService.cancelRequest(id);
      toast.success(`Đã hủy đề xuất #${res.requestCode}`);
      loadRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hủy đề xuất';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Order Modal
  const handleOpenOrderModal = (id: number) => {
    setOrderRequestId(id);
    setIsOrderModalOpen(true);
  };

  // Submit Order
  const handleSubmitOrder = async () => {
    if (!orderRequestId) return;
    if (!orderDeliveryDate) {
      toast.warning('Vui lòng chọn Ngày giao dự kiến');
      return;
    }

    setActionLoading(true);
    try {
      const res = await purchaseRequestService.orderRequest(orderRequestId, {
        orderedAt: new Date().toISOString(),
        expectedDeliveryDate: orderDeliveryDate,
      });
      toast.success(`Đã ghi nhận đặt hàng đề xuất #${res.requestCode}`);
      setIsOrderModalOpen(false);
      loadRequests();
      if (selectedRequest?.id === orderRequestId) {
        setSelectedRequest(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi ghi nhận đặt hàng';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Close Modal
  const handleOpenCloseModal = (id: number) => {
    setCloseRequestId(id);
    setIsCloseModalOpen(true);
  };

  // Submit Close
  const handleSubmitClose = async () => {
    if (!closeRequestId) return;
    setActionLoading(true);
    try {
      const res = await purchaseRequestService.closeRequest(closeRequestId, closeReason);
      toast.success(`Đã đóng hoàn tất đề xuất #${res.requestCode}`);
      setIsCloseModalOpen(false);
      loadRequests();
      if (selectedRequest?.id === closeRequestId) {
        setSelectedRequest(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đóng đề xuất';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: PurchaseRequestStatus, orderedAt: string | null, closedAt: string | null) => {
    if (closedAt) {
      return (
        <Badge className="bg-slate-700 text-white font-semibold">
          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> ĐÃ ĐÓNG (CLOSED)
        </Badge>
      );
    }
    if (orderedAt) {
      return (
        <Badge className="bg-indigo-600 text-white font-semibold">
          <Truck className="w-3 h-3 mr-1 inline" /> ĐÃ ĐẶT HÀNG (ORDERED)
        </Badge>
      );
    }

    switch (status) {
      case 'DRAFT':
        return (
          <Badge className="bg-slate-200 text-slate-700 border-slate-300">
            <Clock className="w-3 h-3 mr-1 inline" /> BẢN NHÁP (DRAFT)
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-amber-500 text-white font-bold">
            <Clock className="w-3 h-3 mr-1 inline" /> CHỜ DUYỆT (PENDING)
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-600 text-white font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> ĐÃ DUYỆT (APPROVED)
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-rose-600 text-white font-bold">
            <XCircle className="w-3 h-3 mr-1 inline" /> TỪ CHỐI (REJECTED)
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-slate-400 text-white">
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
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Đề Xuất Mua Thuốc &amp; Đặt Hàng (Procurement)
              </h1>
              <p className="text-sm text-slate-500">
                Lập dự trù mua sắm, trình duyệt Ban Giám đốc, đặt hàng nhà cung cấp và theo dõi nhập kho
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> + Lập Đề Xuất Mua Thuốc Mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              className="p-2"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-300 rounded"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp (DRAFT)</option>
              <option value="PENDING">Chờ duyệt (PENDING)</option>
              <option value="APPROVED">Đã duyệt (APPROVED)</option>
              <option value="REJECTED">Từ chối (REJECTED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Nhà cung cấp:</span>
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-300 rounded max-w-xs"
            >
              <option value="">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Danh sách Đề xuất mua thuốc */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">
            Danh Sách Đề Xuất Dự Trù Thuốc ({requests.length})
          </h2>
          <span className="text-xs text-slate-500">
            Quy trình: Dược sĩ lập ➔ Ban Giám đốc duyệt ➔ Đặt hàng ➔ Nhập kho
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Đang tải danh sách đề xuất...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            Không có đề xuất mua thuốc nào theo tiêu chí đã chọn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã Đề Xuất</th>
                  <th className="py-3 px-4">Nhà Cung Cấp</th>
                  <th className="py-3 px-4">Ngày Tạo</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4">Giao Hàng Dự Kiến</th>
                  <th className="py-3 px-4">Số Mặt Hàng</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => {
                  const supplier = suppliers.find((s) => s.id === r.supplierId);
                  const isDraft = r.status === 'DRAFT';
                  const isApproved = r.status === 'APPROVED' && !r.orderedAt && !r.closedAt;
                  const isOrdered = Boolean(r.orderedAt && !r.closedAt);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{r.requestCode}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {supplier?.name || `ID #${r.supplierId || 'Chưa chọn'}`}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(r.status, r.orderedAt, r.closedAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {r.expectedDeliveryDate || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.items.length} loại thuốc
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút Xem chi tiết */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(r);
                              setIsDetailModalOpen(true);
                            }}
                            className="py-1 px-2 text-xs"
                            title="Xem chi tiết đề xuất"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Khi DRAFT: Sửa, Gửi duyệt, Hủy */}
                          {isDraft && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditModal(r)}
                                className="py-1 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                title="Sửa đề xuất"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitToAdmin(r.id)}
                                isLoading={actionLoading}
                                className="py-1 px-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                title="Gửi Ban Giám đốc duyệt"
                              >
                                <Send className="w-3.5 h-3.5 mr-1" /> Gửi duyệt
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(r.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                title="Hủy đề xuất"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Khi APPROVED: Nút Đặt hàng */}
                          {isApproved && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenOrderModal(r.id)}
                              className="py-1 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" /> Đặt hàng
                            </Button>
                          )}

                          {/* Khi ORDERED: Nhập kho & Đóng */}
                          {isOrdered && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/pharmacy/stock-documents')}
                                className="py-1 px-2 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                title="Tạo phiếu nhập kho liên kết"
                              >
                                <PackageCheck className="w-3.5 h-3.5 mr-1" /> Nhập kho
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCloseModal(r.id)}
                                className="py-1 px-2 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Đóng
                              </Button>
                            </>
                          )}
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

      {/* MODAL 1: CHI TIẾT ĐỀ XUẤT */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Chi Tiết Đề Xuất Mua Thuốc: #${selectedRequest?.requestCode}`}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Trạng thái</span>
                {renderStatusBadge(selectedRequest.status, selectedRequest.orderedAt, selectedRequest.closedAt)}
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nhà cung cấp</span>
                <span className="font-semibold text-slate-800">
                  {suppliers.find((s) => s.id === selectedRequest.supplierId)?.name || 'Chưa chọn'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Thời gian lập</span>
                <span className="text-slate-700 font-medium">
                  {new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Dự kiến giao hàng</span>
                <span className="font-semibold text-indigo-700">
                  {selectedRequest.expectedDeliveryDate || 'Chưa đặt hàng'}
                </span>
              </div>

              {selectedRequest.reviewNote && (
                <div className="col-span-2 sm:col-span-4 bg-amber-50 p-2.5 rounded border border-amber-200 text-amber-900">
                  <strong>Ý kiến Ban Giám đốc:</strong> {selectedRequest.reviewNote}
                </div>
              )}

              {selectedRequest.closeNote && (
                <div className="col-span-2 sm:col-span-4 bg-slate-100 p-2.5 rounded border border-slate-200 text-slate-800">
                  <strong>Ghi chú hoàn tất đóng đề xuất:</strong> {selectedRequest.closeNote}
                </div>
              )}
            </div>

            {selectedRequest.note && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong>Căn cứ lập đề xuất:</strong> {selectedRequest.note}
              </div>
            )}

            {/* Bảng chi tiết mặt hàng */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">STT</th>
                    <th className="py-2 px-3">Mặt hàng thuốc</th>
                    <th className="py-2 px-3 text-right">SL Đề xuất</th>
                    <th className="py-2 px-3 text-right">Đã nhập kho</th>
                    <th className="py-2 px-3 text-right">Còn lại</th>
                    <th className="py-2 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRequest.items.map((item, idx) => {
                    const med = medicines.find((m) => m.id === item.medicineId);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {med?.name || `Thuốc #${item.medicineId}`}
                          {med?.code && <span className="text-slate-400 text-[11px] block">{med.code}</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {item.receivedQuantity}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">
                          {item.remainingQuantity}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{item.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: TẠO MỚI / SỬA ĐỀ XUẤT */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingRequestId ? `Sửa Đề Xuất Mua Thuốc: #${editingRequestId}` : 'Lập Đề Xuất Mua Thuốc Mới'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nhà cung cấp (*):
              </label>
              <select
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
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
                Căn cứ / Ghi chú đề xuất:
              </label>
              <Input
                placeholder="VD: Dự trù thuốc phục vụ điều trị ngoại trú tháng..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Danh sách mặt hàng */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-800">
                Danh sách thuốc cần mua ({formItems.length} loại):
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddFormItem}
                className="text-xs py-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm thuốc
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {formItems.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-500 block mb-0.5">Thuốc</label>
                    <select
                      value={item.medicineId}
                      onChange={(e) => {
                        const mId = parseInt(e.target.value, 10);
                        setFormItems((prev) => {
                          const next = [...prev];
                          next[idx].medicineId = mId;
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

                  <div className="w-32">
                    <label className="text-[11px] text-slate-500 block mb-0.5">Số lượng mua</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormItems((prev) => {
                          const next = [...prev];
                          next[idx].quantity = val;
                          return next;
                        });
                      }}
                      className="text-xs py-1 px-2 font-bold"
                    />
                  </div>

                  <div className="w-48">
                    <label className="text-[11px] text-slate-500 block mb-0.5">Ghi chú dòng</label>
                    <Input
                      placeholder="Ưu tiên, nồng độ..."
                      value={item.note}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormItems((prev) => {
                          const next = [...prev];
                          next[idx].note = val;
                          return next;
                        });
                      }}
                      className="text-xs py-1 px-2"
                    />
                  </div>

                  <div className="self-end pb-1">
                    <button
                      type="button"
                      onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSubmitForm(false)}
              isLoading={actionLoading}
              className="text-xs"
            >
              Lưu bản nháp (DRAFT)
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmitForm(true)}
              isLoading={actionLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Lưu &amp; Gửi Duyệt Ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: ĐẶT HÀNG NHÀ CUNG CẤP (ORDER) */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Ghi Nhận Đặt Hàng Nhà Cung Cấp"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Đề xuất đã được Ban Giám đốc phê duyệt. Dược sĩ ghi nhận thời điểm gửi đơn đặt hàng và ngày hẹn giao hàng từ NCC:
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ngày dự kiến nhà cung cấp giao hàng (*):
            </label>
            <Input
              type="date"
              value={orderDeliveryDate}
              onChange={(e) => setOrderDeliveryDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsOrderModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitOrder}
              isLoading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Xác Nhận Đặt Hàng
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: ĐÓNG ĐỀ XUẤT (CLOSE) */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Xác Nhận Đóng Đề Xuất Mua Thuốc"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Đề xuất sẽ được chuyển sang trạng thái <strong>CLOSED</strong> và hoàn tất chu kỳ mua sắm.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ghi chú hoàn tất đóng đề xuất:
            </label>
            <Input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsCloseModalOpen(false)}>
              Quay lại
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitClose}
              isLoading={actionLoading}
              className="bg-slate-700 hover:bg-slate-800 text-white text-xs"
            >
              Đóng Đề Xuất
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
