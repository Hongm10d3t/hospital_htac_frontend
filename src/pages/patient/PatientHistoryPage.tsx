import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  patientHistoryService,
  type PatientVisitSummary,
  type PatientVisitDetail,
  type PatientPrescriptionSummary,
  type PatientPrescriptionDetail,
} from '../../services/patientHistoryService';
import {
  patientAuthService,
  type PatientProfileResponse,
} from '../../services/patientAuthService';
import { cn } from '../../lib/utils';
import {
  FileText,
  Activity,
  Pill,
  Calendar,
  Stethoscope,
  AlertCircle,
  ChevronRight,
  Printer,
  RefreshCw,
  CalendarDays,
  FileCheck2,
  CalendarPlus,
  HeartPulse,
} from 'lucide-react';

/**
 * F02.06 — Sổ sức khỏe Điện tử & Lịch sử Khám bệnh Cá nhân (Electronic Health Record - EHR)
 * Kết nối các API:
 * - GET /api/v1/patients/me/visits (Danh sách lượt khám)
 * - GET /api/v1/patients/me/visits/{id} (Chi tiết bệnh án lượt khám & đơn thuốc)
 * - GET /api/v1/patients/me/prescriptions (Danh sách đơn thuốc điện tử)
 * - GET /api/v1/patients/me/prescriptions/{id} (Chi tiết toa thuốc & hướng dẫn dùng)
 * - GET /api/v1/patients/me (Thông tin hồ sơ y tế bệnh nhân)
 */
export const PatientHistoryPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, hospitalConfig } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Tab đang xem: 'visits' (Lịch sử khám) hoặc 'prescriptions' (Tủ thuốc / Đơn thuốc)
  const [activeTab, setActiveTab] = useState<'visits' | 'prescriptions'>('visits');

  // Trạng thái dữ liệu
  const [patientProfile, setPatientProfile] = useState<PatientProfileResponse | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(true);
  const [visits, setVisits] = useState<PatientVisitSummary[]>([]);
  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Bộ lọc thời gian
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal Chi tiết Lượt khám (Bệnh án)
  const [selectedVisitDetail, setSelectedVisitDetail] = useState<PatientVisitDetail | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState<boolean>(false);
  const [isLoadingVisitDetail, setIsLoadingVisitDetail] = useState<boolean>(false);

  // Modal Chi tiết Đơn thuốc điện tử
  const [selectedPrescriptionDetail, setSelectedPrescriptionDetail] =
    useState<PatientPrescriptionDetail | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState<boolean>(false);
  const [isLoadingPrescriptionDetail, setIsLoadingPrescriptionDetail] = useState<boolean>(false);

  // 1. Kiểm tra xác thực: Bắt buộc đăng nhập
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.info('Vui lòng đăng nhập để truy cập Sổ sức khỏe điện tử.');
      navigate('/login', {
        state: { from: { pathname: '/patient/history' } },
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // 2. Tải thông tin hồ sơ y tế bệnh nhân
  useEffect(() => {
    if (isAuthenticated) {
      patientAuthService
        .getMyPatientProfile()
        .then((profile) => {
          setPatientProfile(profile);
          setHasProfile(true);
        })
        .catch((err) => {
          console.warn('[PatientHistory] Chưa liên kết hồ sơ y tế:', err);
          setHasProfile(false);
        });
    }
  }, [isAuthenticated]);

  // 3. Tải danh sách lượt khám & đơn thuốc
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [visitsRes, prescriptionsRes] = await Promise.all([
        patientHistoryService
          .getMyVisits({
            from: fromDate || undefined,
            to: toDate || undefined,
            size: 50,
          })
          .catch((err) => {
            console.warn('[PatientHistory] Lỗi tải danh sách lượt khám:', err);
            return { items: [], total: 0, page: 0, size: 50, totalPages: 0 };
          }),
        patientHistoryService
          .getMyPrescriptions({
            from: fromDate || undefined,
            to: toDate || undefined,
            size: 50,
          })
          .catch((err) => {
            console.warn('[PatientHistory] Lỗi tải danh sách đơn thuốc:', err);
            return { items: [], total: 0, page: 0, size: 50, totalPages: 0 };
          }),
      ]);

      setVisits(visitsRes.items);
      setPrescriptions(prescriptionsRes.items);
    } catch (err) {
      toast.error('Không thể tải đầy đủ dữ liệu sổ sức khỏe. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, fromDate, toDate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // 4. Mở modal chi tiết lượt khám
  const handleOpenVisitDetail = async (visitId: number) => {
    setIsLoadingVisitDetail(true);
    setIsVisitModalOpen(true);
    try {
      const detail = await patientHistoryService.getMyVisitDetail(visitId);
      setSelectedVisitDetail(detail);
    } catch (err) {
      toast.error('Không thể tải chi tiết bệnh án lượt khám này.');
      setIsVisitModalOpen(false);
    } finally {
      setIsLoadingVisitDetail(false);
    }
  };

  // 5. Mở modal chi tiết đơn thuốc
  const handleOpenPrescriptionDetail = async (prescriptionId: number) => {
    setIsLoadingPrescriptionDetail(true);
    setIsPrescriptionModalOpen(true);
    try {
      const detail = await patientHistoryService.getMyPrescriptionDetail(prescriptionId);
      setSelectedPrescriptionDetail(detail);
    } catch (err) {
      toast.error('Không thể tải chi tiết đơn thuốc này.');
      setIsPrescriptionModalOpen(false);
    } finally {
      setIsLoadingPrescriptionDetail(false);
    }
  };

  // 6. Lọc danh sách lượt khám theo trạng thái
  const filteredVisits = useMemo(() => {
    if (statusFilter === 'ALL') return visits;
    return visits.filter((v) => v.status === statusFilter);
  }, [visits, statusFilter]);

  // 7. Thống kê nhanh
  const stats = useMemo(() => {
    const totalVisits = visits.length;
    const completedVisits = visits.filter((v) => v.status === 'COMPLETED').length;
    const totalPrescriptions = prescriptions.length;

    // Tìm lịch hẹn tái khám gần nhất trong tương lai
    const now = new Date().toISOString().split('T')[0];
    const upcomingFollowUps = visits
      .filter((v) => v.followUpDate && v.followUpDate >= now)
      .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));

    return {
      totalVisits,
      completedVisits,
      totalPrescriptions,
      nextFollowUpDate: upcomingFollowUps.length > 0 ? upcomingFollowUps[0].followUpDate : null,
    };
  }, [visits, prescriptions]);

  // Map nhãn trạng thái lượt khám
  const getVisitStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge status="COMPLETED">Đã hoàn thành</Badge>;
      case 'IN_PROGRESS':
        return <Badge status="IN_PROGRESS">Đang khám</Badge>;
      case 'WAITING':
        return <Badge status="WAITING">Đang chờ khám</Badge>;
      case 'NOT_COMPLETED':
        return <Badge status="NOT_COMPLETED">Không hoàn thành</Badge>;
      case 'VOIDED':
        return <Badge status="VOIDED">Đã hủy tiếp đón</Badge>;
      default:
        return <Badge status="DEFAULT">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 selection:bg-sky-100 selection:text-sky-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. HEADER: SỔ SỨC KHỎE ĐIỆN TỬ & THÔNG TIN HỒ SƠ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-gradient-to-br from-sky-100/60 to-cyan-50/40 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
                <HeartPulse className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                <span>Hồ sơ Bệnh án Điện tử (EHR) Cá nhân</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Activity className="w-8 h-8 text-sky-600" />
                <span>Sổ Sức Khỏe Điện Tử</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                Tra cứu toàn bộ lịch sử thăm khám, kết quả chẩn đoán y khoa, phác đồ điều trị và toa thuốc điện tử tại{' '}
                <strong>{hospitalConfig?.name || 'Bệnh viện Đa khoa Quốc tế HTAC'}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />}
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CalendarPlus className="w-4 h-4" />}
                onClick={() => navigate('/booking')}
                className="font-bold shadow-md shadow-sky-600/20"
              >
                Đặt lịch khám mới
              </Button>
            </div>
          </div>

          {/* DẢI THÔNG TIN HỒ SƠ BỆNH NHÂN */}
          {patientProfile ? (
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">Họ và tên bệnh nhân:</div>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {patientProfile.fullName}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">Mã hồ sơ y tế:</div>
                <div className="font-mono font-bold text-sky-700 text-sm mt-0.5">
                  {patientProfile.patientCode}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">Số CCCD / Định danh:</div>
                <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  {patientProfile.citizenId || 'Đã liên kết'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">Ngày sinh &amp; Giới tính:</div>
                <div className="font-semibold text-slate-800 text-sm mt-0.5">
                  {patientProfile.dateOfBirth
                    ? new Date(patientProfile.dateOfBirth).toLocaleDateString('vi-VN')
                    : 'Chưa cập nhật'}{' '}
                  • {patientProfile.gender === 'MALE' ? 'Nam' : patientProfile.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                </div>
              </div>
            </div>
          ) : !hasProfile ? (
            <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Tài khoản chưa được liên kết với Hồ sơ y tế tại viện. </span>
                  <span>
                    Vui lòng xuất trình CCCD tại quầy Tiếp đón hoặc liên hệ nhân viên để liên kết dữ liệu khám cũ.
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/booking')}
                className="shrink-0 bg-white"
              >
                Đặt lịch để cấp hồ sơ
              </Button>
            </div>
          ) : null}
        </div>

        {/* 2. CHỈ SỐ THỐNG KÊ NHANH (QUICK METRICS) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Tổng lượt khám</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalVisits}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Đã hoàn thành</div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {stats.completedVisits}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Đơn thuốc đã cấp</div>
              <div className="text-2xl font-black text-indigo-700 tracking-tight">
                {stats.totalPrescriptions}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Hẹn tái khám</div>
              <div className="text-sm font-extrabold text-amber-800">
                {stats.nextFollowUpDate
                  ? new Date(stats.nextFollowUpDate).toLocaleDateString('vi-VN')
                  : 'Không có'}
              </div>
            </div>
          </div>
        </div>

        {/* 3. TABS CHUYỂN ĐỔI CHÍNH: LỊCH SỬ KHÁM vs TỦ THUỐC ĐIỆN TỬ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('visits')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
                activeTab === 'visits'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Lịch sử Khám bệnh ({visits.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('prescriptions')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
                activeTab === 'prescriptions'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <Pill className="w-4 h-4" />
              <span>Tủ thuốc &amp; Toa thuốc ({prescriptions.length})</span>
            </button>
          </div>

          {/* BỘ LỌC KHOẢNG NGÀY */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="outline-none bg-transparent text-xs"
                title="Từ ngày"
              />
              <span className="text-slate-300">—</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="outline-none bg-transparent text-xs"
                title="Đến ngày"
              />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Xóa lọc
              </Button>
            )}
          </div>
        </div>

        {/* 4. NỘI DUNG THEO TAB */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
            <span>Đang tải dữ liệu hồ sơ y tế từ máy chủ...</span>
          </div>
        ) : activeTab === 'visits' ? (
          /* =========================================================================
             TAB 1: LỊCH SỬ KHÁM BỆNH (VISITS TIMELINE)
             ========================================================================= */
          <div className="space-y-4">
            {/* Thanh lọc trạng thái con */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              {[
                { id: 'ALL', label: 'Tất cả trạng thái' },
                { id: 'COMPLETED', label: 'Đã hoàn tất' },
                { id: 'IN_PROGRESS', label: 'Đang khám' },
                { id: 'WAITING', label: 'Đang chờ khám' },
                { id: 'NOT_COMPLETED', label: 'Không hoàn thành' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'text-xs py-1.5 px-3 rounded-xl border transition-all cursor-pointer font-medium',
                    statusFilter === tab.id
                      ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredVisits.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Không tìm thấy lượt khám nào</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {statusFilter === 'ALL'
                      ? 'Bạn chưa có hồ sơ lượt khám bệnh nào được ghi nhận tại bệnh viện.'
                      : 'Không có lượt khám nào phù hợp với bộ lọc đã chọn.'}
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    leftIcon={<CalendarPlus className="w-4 h-4" />}
                    onClick={() => navigate('/booking')}
                    className="font-bold shadow-md shadow-sky-600/20"
                  >
                    Đăng ký đặt lịch khám ngay
                  </Button>
                </div>
              </div>
            ) : (
              /* DANH SÁCH LƯỢT KHÁM DẠNG TIMELINE */
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                {filteredVisits.map((v) => {
                  const arrivalDate = new Date(v.arrivedAt);
                  const isCompleted = v.status === 'COMPLETED';

                  return (
                    <div key={v.id} className="relative group">
                      {/* Nút Timeline Dot */}
                      <div
                        className={cn(
                          'absolute -left-6 sm:-left-8 top-5 w-6 h-6 rounded-full border-4 border-slate-50 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110',
                          isCompleted ? 'bg-emerald-500' : v.status === 'IN_PROGRESS' ? 'bg-sky-500' : 'bg-slate-400'
                        )}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Thẻ lượt khám */}
                      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-4">
                        {/* Header Thẻ */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm shrink-0">
                              <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Lượt Khám Ngày {new Date(v.queueDate).toLocaleDateString('vi-VN')}
                              </div>
                              <div className="font-mono font-black text-sky-800 text-sm sm:text-base">
                                Mã: {v.visitCode}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                              STT: #{v.queueNumber}
                            </span>
                            {getVisitStatusBadge(v.status)}
                          </div>
                        </div>

                        {/* Nội dung kết quả khám */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-slate-400 font-medium">Thời gian tiếp nhận:</div>
                            <div className="font-bold text-slate-800 text-sm mt-0.5">
                              {arrivalDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} —{' '}
                              {arrivalDate.toLocaleDateString('vi-VN')}
                            </div>
                            <div className="text-slate-500">Phòng khám số {v.roomId}</div>
                          </div>

                          <div className="sm:col-span-2">
                            <div className="text-slate-400 font-medium">Chẩn đoán của Bác sĩ:</div>
                            {isCompleted && v.diagnosis ? (
                              <div className="font-bold text-slate-900 text-sm sm:text-base mt-0.5 text-sky-900">
                                {v.diagnosis}
                              </div>
                            ) : isCompleted ? (
                              <div className="text-slate-500 italic mt-0.5">Chưa ghi nhận chẩn đoán</div>
                            ) : (
                              <div className="text-amber-600 font-medium italic mt-0.5">
                                Đang trong quy trình khám bệnh...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* HẸN TÁI KHÁM (NẾU CÓ) */}
                        {v.followUpDate && (
                          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                Hẹn tái khám vào ngày:{' '}
                                <strong>{new Date(v.followUpDate).toLocaleDateString('vi-VN')}</strong>
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/booking')}
                              className="text-xs py-1 h-7 bg-white text-amber-800 border-amber-300"
                            >
                              Đặt hẹn ngay
                            </Button>
                          </div>
                        )}

                        {/* HÀNH ĐỘNG: XEM CHI TIẾT BỆNH ÁN */}
                        <div className="pt-2 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<FileText className="w-4 h-4 text-sky-600" />}
                            rightIcon={<ChevronRight className="w-4 h-4" />}
                            onClick={() => handleOpenVisitDetail(v.id)}
                            className="font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50 border-slate-200"
                          >
                            Xem Bệnh án chi tiết &amp; Đơn thuốc
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             TAB 2: TỦ THUỐC & TOA THUỐC ĐIỆN TỬ (PRESCRIPTIONS)
             ========================================================================= */
          <div className="space-y-4">
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Pill className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Chưa có đơn thuốc nào</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Các đơn thuốc điện tử được Bác sĩ kê và Dược sĩ phê duyệt sẽ xuất hiện đầy đủ tại đây kèm hướng dẫn dùng thuốc chi tiết.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((p) => {
                  const issueDate = new Date(p.issuedAt);
                  const isIssued = p.status === 'ISSUED';

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                              <Pill className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  Đơn Thuốc Điện Tử
                                </span>
                                <span
                                  className="font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200"
                                  title="ID để Quầy Dược nạp đơn"
                                >
                                  ID: #{p.id}
                                </span>
                              </div>
                              <div className="font-mono font-black text-indigo-900 text-base">
                                {p.prescriptionCode}
                              </div>
                            </div>
                          </div>

                          <span
                            className={cn(
                              'text-xs font-bold px-2.5 py-1 rounded-full border',
                              isIssued
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            )}
                          >
                            {isIssued ? 'Đã phát hành' : 'Đã hủy'}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Thời gian kê đơn:</span>
                            <span className="font-bold">
                              {issueDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                              — {issueDate.toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400">Mã lượt khám tương ứng:</span>
                            <span className="font-mono font-bold text-sky-700">Lượt #{p.visitId}</span>
                          </div>

                          {p.note && (
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-xs italic">
                              &ldquo;{p.note}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Pill className="w-4 h-4" />}
                          onClick={() => handleOpenPrescriptionDetail(p.id)}
                          className="font-bold shadow-xs bg-indigo-600 hover:bg-indigo-700"
                        >
                          Xem toa thuốc &amp; Cách dùng
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODAL 1: CHI TIẾT BỆNH ÁN LƯỢT KHÁM (PRINTABLE MEDICAL VISIT SUMMARY)
           ========================================================================= */}
        <Modal
          isOpen={isVisitModalOpen}
          onClose={() => setIsVisitModalOpen(false)}
          title="Tóm Tắt Bệnh Án & Kết Quả Khám Bệnh"
          description="Hồ sơ y tế điện tử chính thức từ cơ sở dữ liệu Bệnh viện Đa khoa Quốc tế HTAC."
          size="lg"
        >
          {isLoadingVisitDetail ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
              <span>Đang tải thông tin chi tiết bệnh án...</span>
            </div>
          ) : selectedVisitDetail ? (
            <div className="space-y-6 pt-2">
              {/* BẢNG BỆNH ÁN IN (PRINTABLE SHEET) */}
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300 space-y-6">
                {/* Header phiếu bệnh án có Logo bệnh viện */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={hospitalConfig?.logoUrl || '/logo.png'}
                      alt="Logo Bệnh viện"
                      className="h-10 w-auto max-w-[120px] object-contain rounded-md bg-white p-0.5 border border-slate-200"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm tracking-tight">
                        {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Hotline: {hospitalConfig?.phone || '1900 6868'} • {hospitalConfig?.address || 'Hà Nội'}
                      </div>
                    </div>
                  </div>
                  {getVisitStatusBadge(selectedVisitDetail.visit.status)}
                </div>

                {/* Tiêu đề & Thông tin hành chính */}
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    PHIẾU KẾT QUẢ KHÁM BỆNH NGOẠI TRÚ
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    Mã lượt khám: <strong className="text-sky-700">{selectedVisitDetail.visit.visitCode}</strong> | Ngày tiếp nhận: {new Date(selectedVisitDetail.visit.queueDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                {/* Thông tin bệnh nhân */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400">Bệnh nhân: </span>
                    <strong className="text-slate-900 uppercase">
                      {patientProfile?.fullName || user?.fullName || user?.username}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Mã bệnh nhân: </span>
                    <strong className="font-mono text-sky-700">
                      {patientProfile?.patientCode || 'Chưa đồng bộ'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Phòng tiếp nhận: </span>
                    <strong>Phòng số {selectedVisitDetail.visit.roomId}</strong>
                  </div>
                </div>

                {/* Chuyên môn y tế: Chẩn đoán & Lâm sàng */}
                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Chẩn đoán xác định */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4" />
                      <span>Chẩn đoán xác định:</span>
                    </div>
                    <div className="font-extrabold text-slate-900 text-base leading-snug">
                      {selectedVisitDetail.visit.diagnosis || 'Chưa ghi nhận'}
                    </div>
                    {selectedVisitDetail.diagnosisCode && (
                      <div className="text-xs text-slate-500 font-mono">
                        Mã phân loại bệnh tật quốc tế (ICD-10):{' '}
                        <strong className="text-slate-800">{selectedVisitDetail.diagnosisCode}</strong>
                      </div>
                    )}
                  </div>

                  {/* Triệu chứng lâm sàng */}
                  {selectedVisitDetail.clinicalNotes && (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Triệu chứng &amp; Ghi nhận khám lâm sàng:
                      </div>
                      <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedVisitDetail.clinicalNotes}
                      </div>
                    </div>
                  )}

                  {/* Hướng xử trí & Lời dặn */}
                  {selectedVisitDetail.treatmentPlan && (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Hướng xử trí &amp; Lời dặn của Bác sĩ:
                      </div>
                      <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedVisitDetail.treatmentPlan}
                      </div>
                    </div>
                  )}

                  {/* Ngày hẹn tái khám */}
                  {selectedVisitDetail.followUpDate && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>
                          Ngày khuyến nghị tái khám:{' '}
                          <strong>{new Date(selectedVisitDetail.followUpDate).toLocaleDateString('vi-VN')}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* DANH SÁCH ĐƠN THUỐC KÈM THEO (NẾU CÓ) */}
                {selectedVisitDetail.prescriptions && selectedVisitDetail.prescriptions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-indigo-600" />
                      <span>Đơn thuốc đã phát hành theo lượt khám này:</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVisitDetail.prescriptions.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-indigo-900">{p.prescriptionCode}</span>
                            <span className="text-slate-400 ml-2">
                              (Kê lúc {new Date(p.issuedAt).toLocaleTimeString('vi-VN')} ngày{' '}
                              {new Date(p.issuedAt).toLocaleDateString('vi-VN')})
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsVisitModalOpen(false);
                              handleOpenPrescriptionDetail(p.id);
                            }}
                            className="text-xs py-1 h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          >
                            Xem chi tiết toa thuốc
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setIsVisitModalOpen(false)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => window.print()}
                >
                  In tóm tắt bệnh án này
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* =========================================================================
            MODAL 2: CHI TIẾT TOA THUỐC ĐIỆN TỬ (PRINTABLE PRESCRIPTION SLIP)
           ========================================================================= */}
        <Modal
          isOpen={isPrescriptionModalOpen}
          onClose={() => setIsPrescriptionModalOpen(false)}
          title="Đơn Thuốc Điện Tử Quốc Gia"
          description="Đơn thuốc ngoại trú chính thức đã được Bác sĩ phê duyệt và Dược sĩ kiểm định."
          size="lg"
        >
          {isLoadingPrescriptionDetail ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <span>Đang tải chi tiết danh mục thuốc kê đơn...</span>
            </div>
          ) : selectedPrescriptionDetail ? (
            <div className="space-y-6 pt-2">
              {/* BẢN IN ĐƠN THUỐC (PRINTABLE PRESCRIPTION SHEET) */}
              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300 space-y-6">
                {/* Header đơn thuốc có Logo bệnh viện */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={hospitalConfig?.logoUrl || '/logo.png'}
                      alt="Logo Bệnh viện"
                      className="h-10 w-auto max-w-[120px] object-contain rounded-md bg-white p-0.5 border border-slate-200"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm tracking-tight">
                        {hospitalConfig?.name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ HTAC'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Khoa Dược Bệnh viện • Hotline: {hospitalConfig?.phone || '1900 6868'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full border border-indigo-200">
                      Mã đơn: {selectedPrescriptionDetail.prescription.prescriptionCode}
                    </span>
                    <span
                      className="font-mono font-black text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs"
                      title="Dùng số ID này để Quầy Dược nạp đơn cấp phát thuốc"
                    >
                      ID Quầy Dược: #{selectedPrescriptionDetail.prescription.id}
                    </span>
                  </div>
                </div>

                {/* Tiêu đề đơn thuốc */}
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    ĐƠN THUỐC ĐIỆN TỬ NGOẠI TRÚ
                  </h3>
                  <div className="text-xs text-slate-500">
                    Ngày kê:{' '}
                    {new Date(selectedPrescriptionDetail.prescription.issuedAt).toLocaleDateString('vi-VN')}{' '}
                    (Thời gian:{' '}
                    {new Date(selectedPrescriptionDetail.prescription.issuedAt).toLocaleTimeString('vi-VN')}
                    )
                  </div>
                </div>

                {/* Thông tin người bệnh */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400">Bệnh nhân: </span>
                    <strong className="text-slate-900 uppercase">
                      {patientProfile?.fullName || user?.fullName || user?.username}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Mã bệnh nhân: </span>
                    <strong className="font-mono text-sky-700">
                      {patientProfile?.patientCode || 'Chưa đồng bộ'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">CCCD/Định danh: </span>
                    <strong>{patientProfile?.citizenId || 'Đã xác thực'}</strong>
                  </div>
                </div>

                {/* BẢNG DANH MỤC THUỐC */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-indigo-600" />
                    <span>Chỉ định dùng thuốc:</span>
                  </div>

                  {selectedPrescriptionDetail.items.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400">
                      Không có thuốc nào trong đơn này.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPrescriptionDetail.items.map((item, idx) => (
                        <div
                          key={item.medicineId || idx}
                          className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                                {idx + 1}
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {item.medicineName}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
                              Số lượng: {item.quantity} {item.baseUnit}
                            </div>
                          </div>

                          <div className="pl-8 text-slate-700 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-900">Cách dùng: </span>
                            <span>{item.usageInstruction}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lời dặn của Bác sĩ kê đơn */}
                {selectedPrescriptionDetail.prescription.note && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Lời dặn của Bác sĩ điều trị:</span>
                    </div>
                    <div className="italic pl-5">
                      &ldquo;{selectedPrescriptionDetail.prescription.note}&rdquo;
                    </div>
                  </div>
                )}

                {/* Chữ ký xác nhận */}
                <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs border-t border-slate-200 text-slate-500">
                  <div>
                    <div className="font-bold text-slate-700">DƯỢC SĨ CẤP PHÁT</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">(Đã ký duyệt điện tử)</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-700">BÁC SĨ KÊ ĐƠN</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">(Đã ký số y tế)</div>
                  </div>
                </div>
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setIsPrescriptionModalOpen(false)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  In đơn thuốc điện tử này
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
};
