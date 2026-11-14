import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  User,
  AlertCircle,
  Check,
  X,
  Package,
} from 'lucide-react';
import {
  purchaseRequestService,
  type PurchaseRequestResponse,
  type PurchaseRequestStatus,
} from '../../services/purchaseRequestService';
import {
  staffAccountService,
  type StaffAccountResponse,
} from '../../services/staffAccountService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useToast } from '../../components/ui/Toast';
import { formatDateVn, formatTimeVn } from '../../lib/dateUtils';
import { cn } from '../../lib/utils';

export const PurchaseRequestsPage: React.FC = () => {
  const { toast } = useToast();

  // === 1. STATE DỮ LIỆU ===
  const [requests, setRequests] = useState<PurchaseRequestResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(false);

  // Danh bạ nhân viên để map userId sang Họ tên
  const [staffs, setStaffs] = useState<StaffAccountResponse[]>([]);
  const staffMap = useMemo(() => new Map(staffs.map((s) => [s.id, s])), [staffs]);

  // === 2. BỘ LỌC & TÌM KIẾM ===
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // === 3. STATE DRAWER CHI TIẾT & MODAL ===
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modal Phê duyệt
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Modal Từ chối
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // === 4. LOAD DANH MỤC NHÂN VIÊN ===
  const loadStaffs = useCallback(async () => {
    try {
      const res = await staffAccountService.listStaffAccounts({ size: 100 });
      setStaffs(res.items || []);
    } catch {
      console.warn('Không thể nạp danh sách nhân viên để đối chiếu tên');
    }
  }, []);

  useEffect(() => {
    loadStaffs();
  }, [loadStaffs]);

  // === 5. LOAD DANH SÁCH ĐỀ XUẤT NHẬP THUỐC ===
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await purchaseRequestService.listRequests({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        page,
        size: pageSize,
        sort: 'id,DESC',
      });
      setRequests(res.items || []);
      setTotalItems(res.totalItems || 0);
    } catch {
      toast({
        type: 'error',
        title: 'Lỗi nạp dữ liệu',
        message: 'Không thể tải danh sách đề xuất nhập thuốc từ máy chủ.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, page, pageSize, toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Thống kê nhanh theo các trạng thái
  const stats = useMemo(() => {
    const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
    const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
    const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
    return { pendingCount, approvedCount, rejectedCount, total: totalItems };
  }, [requests, totalItems]);

  // Danh sách đã lọc theo thanh tìm kiếm client-side (mã đề xuất, căn cứ)
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase().trim();
    return requests.filter(
      (r) =>
        r.requestCode.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q))
    );
  }, [requests, searchQuery]);

  // Mở Drawer chi tiết khi click dòng
  const handleSelectRequest = (item: PurchaseRequestResponse) => {
    setSelectedRequest(item);
    setIsDetailOpen(true);
  };

  // === 6. XỬ LÝ PHÊ DUYỆT (APPROVE) ===
  const handleOpenApprove = (req: PurchaseRequestResponse) => {
    setSelectedRequest(req);
    setApproveNote('');
    setIsApproveOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    setIsSubmittingApprove(true);
    try {
      const updated = await purchaseRequestService.approveRequest(
        selectedRequest.id,
        approveNote
      );
      toast({
        type: 'success',
        title: 'Phê duyệt thành công',
        message: `Đề xuất ${updated.requestCode} đã được phê duyệt thành công.`,
      });
      setIsApproveOpen(false);
      setSelectedRequest(updated);
      loadRequests();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'Không thể phê duyệt đề xuất. Vui lòng kiểm tra lại trạng thái.';
      toast({
        type: 'error',
        title: 'Phê duyệt thất bại',
        message: msg,
      });
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  // === 7. XỬ LÝ TỪ CHỐI (REJECT) ===
  const handleOpenReject = (req: PurchaseRequestResponse) => {
    setSelectedRequest(req);
    setRejectReason('');
    setRejectError(null);
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối để Dược sĩ phụ trách nắm rõ.');
      return;
    }

    setIsSubmittingReject(true);
    try {
      const updated = await purchaseRequestService.rejectRequest(
        selectedRequest.id,
        rejectReason
      );
      toast({
        type: 'success',
        title: 'Đã từ chối đề xuất',
        message: `Đề xuất ${updated.requestCode} đã được đánh dấu từ chối.`,
      });
      setIsRejectOpen(false);
      setSelectedRequest(updated);
      loadRequests();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'Không thể từ chối đề xuất vào lúc này.';
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: msg,
      });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Định nghĩa các cột hiển thị trong DataTable
  const columns: Column<PurchaseRequestResponse>[] = [
    {
      key: 'requestCode',
      header: 'Mã đề xuất',
      width: '140px',
      render: (item) => (
        <div className="font-mono font-bold text-blue-700 text-sm">
          {item.requestCode}
        </div>
      ),
    },
    {
      key: 'createdBy',
      header: 'Dược sĩ lập',
      render: (item) => {
        const creator = staffMap.get(item.createdBy);
        return (
          <div>
            <div className="font-medium text-slate-800">
              {creator ? creator.fullName : `User #${item.createdBy}`}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {formatTimeVn(item.createdAt)} {formatDateVn(item.createdAt)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'supplierId',
      header: 'Nhà cung cấp',
      width: '140px',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {item.supplierId ? `NCC #${item.supplierId}` : '---'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Thuốc đề xuất',
      align: 'center',
      width: '120px',
      render: (item) => {
        const totalQty = item.items.reduce((sum, line) => sum + Number(line.quantity), 0);
        return (
          <div className="text-center">
            <span className="font-bold text-slate-900">{item.items.length} loại</span>
            <div className="text-xs text-slate-500">{totalQty.toLocaleString('vi-VN')} ĐV</div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      width: '150px',
      render: (item) => (
        <Badge
          status={item.status as PurchaseRequestStatus}
          variant="subtle"
        />
      ),
    },
    {
      key: 'reviewed',
      header: 'Kiểm duyệt',
      render: (item) => {
        if (!item.reviewedBy) return <span className="text-slate-400 text-xs">Chưa duyệt</span>;
        const reviewer = staffMap.get(item.reviewedBy);
        return (
          <div className="text-xs">
            <div className="font-semibold text-slate-800">
              {reviewer ? reviewer.fullName : `Admin #${item.reviewedBy}`}
            </div>
            {item.reviewedAt && (
              <div className="text-slate-400 font-mono">
                {formatDateVn(item.reviewedAt)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: '180px',
      render: (item) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()} // Không kích hoạt row click
        >
          {item.status === 'PENDING' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenReject(item)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                title="Từ chối đề xuất"
              >
                Từ chối
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenApprove(item)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Phê duyệt đề xuất"
              >
                Duyệt
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectRequest(item)}
            >
              Chi tiết
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. HEADER & QUICK STATS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Phê duyệt Đề xuất Nhập thuốc & Dược phẩm
            </h1>
            <Badge status="ACTIVE" variant="subtle" withDot={false}>
              M07 Procurement
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Kiểm soát mua sắm, phê duyệt hoặc từ chối các đề xuất bổ sung tồn kho từ Quầy Dược bệnh viện.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={loadRequests}
            disabled={isLoading}
            leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* QUICK STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Chờ phê duyệt
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Đã phê duyệt
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.approvedCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Đã từ chối
            </div>
            <div className="text-2xl font-bold text-rose-600">{stats.rejectedCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tổng số đề xuất
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          </div>
        </div>
      </div>

      {/* 2. BỘ LỌC TABS & THANH TÌM KIẾM */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PENDING', label: 'Chờ duyệt', highlight: stats.pendingCount > 0 },
              { id: 'APPROVED', label: 'Đã duyệt' },
              { id: 'REJECTED', label: 'Đã từ chối' },
              { id: 'DRAFT', label: 'Bản nháp' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setPage(0);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5',
                  selectedStatus === tab.id
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>{tab.label}</span>
                {tab.id === 'PENDING' && stats.pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                    {stats.pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Tìm theo mã PR hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU ĐỀ XUẤT (DATATABLE) */}
      <DataTable<PurchaseRequestResponse>
        columns={columns}
        data={{
          items: filteredRequests,
          page,
          size: pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize) || 1,
        }}
        isLoading={isLoading}
        emptyMessage="Không có đề xuất nhập thuốc nào phù hợp với bộ lọc."
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={handleSelectRequest}
        rowKey="id"
      />

      {/* 4. DRAWER CHI TIẾT ĐỀ XUẤT (DETAIL DRAWER) */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Chi tiết Đề xuất ${selectedRequest?.requestCode || ''}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {selectedRequest?.status === 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenReject(selectedRequest)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Từ chối đề xuất
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
                Đóng lại
              </Button>
              {selectedRequest?.status === 'PENDING' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleOpenApprove(selectedRequest)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Phê duyệt đề xuất
                </Button>
              )}
            </div>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Header trạng thái */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Trạng thái đề xuất
                </div>
                <div className="mt-1">
                  <Badge
                    status={selectedRequest.status as PurchaseRequestStatus}
                    variant="solid"
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tổng số mặt hàng
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {selectedRequest.items.length} loại thuốc
                </div>
              </div>
            </div>

            {/* Thông báo kết quả phê duyệt / từ chối */}
            {selectedRequest.status === 'APPROVED' && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đề xuất đã được Ban Giám đốc / Admin phê duyệt
                </div>
                <div className="text-xs text-emerald-700">
                  Người duyệt:{' '}
                  <strong>
                    {staffMap.get(selectedRequest.reviewedBy || 0)?.fullName ||
                      `Admin #${selectedRequest.reviewedBy}`}
                  </strong>{' '}
                  • Thời gian:{' '}
                  {selectedRequest.reviewedAt
                    ? `${formatTimeVn(selectedRequest.reviewedAt)} ${formatDateVn(selectedRequest.reviewedAt)}`
                    : '---'}
                </div>
                {selectedRequest.reviewNote && (
                  <div className="mt-2 text-xs bg-white/70 p-2 rounded border border-emerald-200">
                    <strong>Ghi chú duyệt:</strong> {selectedRequest.reviewNote}
                  </div>
                )}
              </div>
            )}

            {selectedRequest.status === 'REJECTED' && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-sm text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Đề xuất đã bị từ chối
                </div>
                <div className="text-xs text-rose-700">
                  Người từ chối:{' '}
                  <strong>
                    {staffMap.get(selectedRequest.reviewedBy || 0)?.fullName ||
                      `Admin #${selectedRequest.reviewedBy}`}
                  </strong>{' '}
                  • Thời gian:{' '}
                  {selectedRequest.reviewedAt
                    ? `${formatTimeVn(selectedRequest.reviewedAt)} ${formatDateVn(selectedRequest.reviewedAt)}`
                    : '---'}
                </div>
                {selectedRequest.reviewNote && (
                  <div className="mt-2 text-xs bg-white/80 p-2.5 rounded border border-rose-200 text-rose-900 font-medium">
                    <strong>Lý do từ chối:</strong> {selectedRequest.reviewNote}
                  </div>
                )}
              </div>
            )}

            {/* Thông tin hành chính & Người lập */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Thông tin người lập & Căn cứ đề xuất
              </h3>
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dược sĩ lập đề xuất:</span>
                  <span className="font-semibold text-slate-800">
                    {staffMap.get(selectedRequest.createdBy)?.fullName ||
                      `User #${selectedRequest.createdBy}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số điện thoại liên hệ:</span>
                  <span className="text-slate-700">
                    {staffMap.get(selectedRequest.createdBy)?.phone || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian khởi tạo:</span>
                  <span className="text-slate-700 font-mono">
                    {formatTimeVn(selectedRequest.createdAt)}{' '}
                    {formatDateVn(selectedRequest.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhà cung cấp dự kiến:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRequest.supplierId
                      ? `Nhà cung cấp #${selectedRequest.supplierId}`
                      : 'Chưa chỉ định'}
                  </span>
                </div>
                {selectedRequest.expectedDeliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dự kiến giao hàng:</span>
                    <span className="text-blue-700 font-semibold">
                      {formatDateVn(selectedRequest.expectedDeliveryDate)}
                    </span>
                  </div>
                )}
                {selectedRequest.note && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Căn cứ / Lý do đề xuất:</div>
                    <div className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {selectedRequest.note}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bảng danh sách các mặt hàng thuốc đề xuất */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Danh mục thuốc đề xuất ({selectedRequest.items.length} mặt hàng)
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">STT</th>
                      <th className="py-2.5 px-3">Mã Thuốc</th>
                      <th className="py-2.5 px-3 text-right">Lượng Đề Xuất</th>
                      <th className="py-2.5 px-3 text-right">Đã Nhận</th>
                      <th className="py-2.5 px-3 text-right">Còn Lại</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRequest.items.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          Thuốc #{line.medicineId}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {Number(line.quantity).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                          {Number(line.receivedQuantity).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {Number(line.remainingQuantity).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 italic">
                          {line.note || '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quy tắc nghiệp vụ kiểm duyệt M07 */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quy định phê duyệt M07:</strong> Khi Admin phê duyệt, toàn bộ số lượng thuốc
                trong đề xuất sẽ được khóa và chuyển sang trạng thái <code>APPROVED</code> để Quầy Dược
                tiến hành đặt hàng và lập phiếu nhập kho (`RECEIPT`).
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 5. MODAL XÁC NHẬN PHÊ DUYỆT (APPROVE MODAL) */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title={`Phê duyệt Đề xuất ${selectedRequest?.requestCode || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsApproveOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmApprove}
              disabled={isSubmittingApprove}
              isLoading={isSubmittingApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Xác nhận Phê duyệt
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg text-sm border border-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Bạn đang phê duyệt đề xuất <strong>{selectedRequest?.requestCode}</strong> gồm{' '}
              <strong>{selectedRequest?.items.length} mặt hàng thuốc</strong>.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú phê duyệt (Không bắt buộc)
            </label>
            <textarea
              rows={3}
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="Nhập ghi chú hoặc ý kiến chỉ đạo bổ sung (nếu có)..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              maxLength={2000}
            />
          </div>
        </div>
      </Modal>

      {/* 6. MODAL TỪ CHỐI ĐỀ XUẤT (REJECT MODAL) */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title={`Từ chối Đề xuất ${selectedRequest?.requestCode || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRejectOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReject}
              disabled={isSubmittingReject}
              isLoading={isSubmittingReject}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Xác nhận Từ chối
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 text-rose-900 rounded-lg text-sm border border-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              Theo quy định M07, khi từ chối đề xuất mua sắm, <strong>bắt buộc phải có lý do giải thích</strong>{' '}
              để Dược sĩ phụ trách nắm rõ và điều chỉnh.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Lý do từ chối đề xuất (*)
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              placeholder="Nhập lý do cụ thể (Ví dụ: Tồn kho thực tế vẫn còn đủ cho 3 tuần tới, giá thuốc chưa đàm phán tối ưu, v.v.)..."
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-800',
                rejectError
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-300 focus:ring-blue-500'
              )}
              maxLength={2000}
              required
            />
            {rejectError && <p className="mt-1 text-xs text-rose-600 font-medium">{rejectError}</p>}
            <div className="mt-1 text-right text-[11px] text-slate-400">
              {rejectReason.length}/2000 ký tự
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseRequestsPage;
