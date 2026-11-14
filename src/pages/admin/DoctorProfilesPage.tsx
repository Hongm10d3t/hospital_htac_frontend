import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  doctorProfileService,
  type DoctorProfileAdminResponse,
  type UpdateDoctorProfileRequest,
} from '../../services/doctorProfileService';
import {
  clinicDirectoryService,
  type SpecialtyResponse,
} from '../../services/clinicDirectoryService';
import {
  staffAccountService,
  type StaffAccountResponse,
} from '../../services/staffAccountService';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Grid,
  Info,
  List,
  Search,
  Stethoscope,
  User,
  X,
  ZoomIn,
} from 'lucide-react';
import { ApiError, type PageResponse } from '../../services/api';

interface PreviewImageData {
  src: string;
  name: string;
  title?: string;
  specialty?: string;
  position?: string;
}

export const DoctorProfilesPage: React.FC = () => {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const queryDoctorId = searchParams.get('doctorId');

  const [profilesData, setProfilesData] = useState<PageResponse<DoctorProfileAdminResponse>>({
    items: [],
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [publicFilter, setPublicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Danh mục tham chiếu: Chuyên khoa và Tài khoản nhân viên
  const [specialties, setSpecialties] = useState<SpecialtyResponse[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountResponse[]>([]);

  // Drawer Chỉnh sửa Hồ sơ Bác sĩ
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DoctorProfileAdminResponse | null>(null);
  const [editSpecialtyId, setEditSpecialtyId] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [position, setPosition] = useState('');
  const [practiceStartYear, setPracticeStartYear] = useState<number | ''>('');
  const [introduction, setIntroduction] = useState('');
  const [clinicalExpertise, setClinicalExpertise] = useState('');
  const [certifications, setCertifications] = useState('');
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Modal Phóng to Ảnh đại diện (Lightbox)
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);

  // Bản đồ tra cứu Chuyên khoa theo ID
  const specialtyMap = useMemo(() => {
    const map = new Map<number, SpecialtyResponse>();
    specialties.forEach((s) => map.set(s.id, s));
    return map;
  }, [specialties]);

  // Bản đồ tra cứu Tài khoản theo userId
  const staffMap = useMemo(() => {
    const map = new Map<number, StaffAccountResponse>();
    staffAccounts.forEach((acc) => map.set(acc.id, acc));
    return map;
  }, [staffAccounts]);

  // ==================== TẢI DỮ LIỆU ====================

  const loadReferenceData = useCallback(async () => {
    try {
      const [specRes, staffRes] = await Promise.all([
        clinicDirectoryService.listSpecialties({ size: 100 }),
        staffAccountService.listStaffAccounts({ size: 100 }),
      ]);
      setSpecialties(specRes.items);
      setStaffAccounts(staffRes.items);
    } catch (err) {
      console.warn('[DoctorProfiles] Lỗi tải dữ liệu tham chiếu:', err);
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const specIdParam = specialtyFilter === 'all' ? undefined : Number(specialtyFilter);
      const res = await doctorProfileService.listProfiles({
        specialtyId: specIdParam,
        page,
        size: 20,
        sort: 'userId,asc',
      });
      setProfilesData(res);
    } catch (err) {
      toast.error('Không thể tải danh sách hồ sơ bác sĩ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [specialtyFilter, page, toast]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Tự động mở hồ sơ nếu có doctorId từ liên kết của Quản lý nhân viên
  useEffect(() => {
    if (queryDoctorId && profilesData.items.length > 0) {
      const docIdNum = Number(queryDoctorId);
      const target = profilesData.items.find((p) => p.userId === docIdNum);
      if (target) {
        openEditDrawer(target);
      }
    }
  }, [queryDoctorId, profilesData.items]);

  // ==================== LỌC DỮ LIỆU TẠI CLIENT ====================

  const filteredProfiles = useMemo(() => {
    return profilesData.items.filter((item) => {
      // Lọc trạng thái công khai
      if (publicFilter === 'true' && !item.publicProfile) return false;
      if (publicFilter === 'false' && item.publicProfile) return false;

      // Tìm kiếm theo tên bác sĩ hoặc chức vụ/học vị
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const staff = staffMap.get(item.userId);
        const nameMatch = staff?.fullName.toLowerCase().includes(q) || false;
        const titleMatch = item.professionalTitle?.toLowerCase().includes(q) || false;
        const posMatch = item.position?.toLowerCase().includes(q) || false;
        if (!nameMatch && !titleMatch && !posMatch) return false;
      }

      return true;
    });
  }, [profilesData.items, publicFilter, searchQuery, staffMap]);

  // ==================== HÀNH ĐỘNG DRAWER ====================

  const openEditDrawer = (profile: DoctorProfileAdminResponse) => {
    setEditingProfile(profile);
    setEditSpecialtyId(profile.specialtyId);
    setAvatarUrl(profile.avatarUrl || '');
    setProfessionalTitle(profile.professionalTitle || '');
    setPosition(profile.position || '');
    setPracticeStartYear(profile.practiceStartYear || '');
    setIntroduction(profile.introduction || '');
    setClinicalExpertise(profile.clinicalExpertise || '');
    setCertifications(profile.certifications || '');
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setDrawerError(null);

    const currentYear = new Date().getFullYear();
    const startYearNum = practiceStartYear ? Number(practiceStartYear) : null;

    if (startYearNum && (startYearNum < 1900 || startYearNum > currentYear)) {
      setDrawerError(`Năm bắt đầu hành nghề phải từ năm 1900 đến năm ${currentYear}`);
      return;
    }

    if (avatarUrl.trim() && !/^https:\/\/[^\s]+$/.test(avatarUrl.trim())) {
      setDrawerError('Đường dẫn ảnh đại diện avatarUrl bắt buộc phải là URL HTTPS hợp lệ');
      return;
    }

    setDrawerSubmitting(true);
    try {
      const payload: UpdateDoctorProfileRequest = {
        specialtyId: Number(editSpecialtyId),
        avatarUrl: avatarUrl.trim() || null,
        professionalTitle: professionalTitle.trim() || null,
        position: position.trim() || null,
        practiceStartYear: startYearNum,
        introduction: introduction.trim() || null,
        clinicalExpertise: clinicalExpertise.trim() || null,
        certifications: certifications.trim() || null,
      };

      await doctorProfileService.updateProfile(editingProfile.userId, payload);
      toast.success('Cập nhật hồ sơ bác sĩ thành công!');
      setDrawerOpen(false);
      loadProfiles();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'DOCTOR_SPECIALTY_LOCKED' || err.status === 409) {
          setDrawerError('Bác sĩ đã có lịch ca khám trong hệ thống, không thể đổi chuyên khoa.');
        } else {
          setDrawerError(err.message || 'Lỗi khi cập nhật hồ sơ bác sĩ');
        }
      } else {
        setDrawerError('Có lỗi xảy ra khi kết nối máy chủ');
      }
    } finally {
      setDrawerSubmitting(false);
    }
  };

  // ==================== BẬT / TẮT CÔNG KHAI (M02.03) ====================

  const handleTogglePublish = async (profile: DoctorProfileAdminResponse) => {
    const staff = staffMap.get(profile.userId);
    const doctorName = staff?.fullName || `Bác sĩ #${profile.userId}`;

    try {
      if (profile.publicProfile) {
        await doctorProfileService.unpublish(profile.userId);
        toast.info(`Đã ẩn hồ sơ ${doctorName} khỏi Cổng Bệnh nhân`);
      } else {
        await doctorProfileService.publish(profile.userId);
        toast.success(`Đã công khai hồ sơ ${doctorName} trên Cổng Bệnh nhân!`);
      }
      loadProfiles();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Không thể thay đổi trạng thái công khai');
      } else {
        toast.error('Có lỗi xảy ra khi thao tác');
      }
    }
  };

  // Hàm chuẩn hóa URL ảnh hiển thị an toàn
  const resolveAvatarSrc = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        if (parsed.pathname.includes('/image_doctors/')) {
          return parsed.pathname;
        }
        return url;
      } catch {
        return url;
      }
    }
    return url;
  };

  // ==================== CẤU HÌNH CỘT BẢNG ====================

  const columns: Column<DoctorProfileAdminResponse>[] = [
    {
      key: 'avatar',
      header: 'Ảnh',
      width: '70px',
      align: 'center',
      render: (item) => {
        const src = resolveAvatarSrc(item.avatarUrl);
        const staff = staffMap.get(item.userId);
        const initials = staff?.fullName ? staff.fullName.charAt(0) : 'BS';
        const spec = specialtyMap.get(item.specialtyId);

        return (
          <div className="flex items-center justify-center">
            {src ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage({
                    src,
                    name: staff?.fullName || `Bác sĩ #${item.userId}`,
                    title: item.professionalTitle || undefined,
                    specialty: spec?.name,
                    position: item.position || undefined,
                  });
                }}
                className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-zoom-in"
                title="Bấm để phóng to ảnh đại diện"
              >
                <img
                  src={src}
                  alt={staff?.fullName || 'Bác sĩ'}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs transition-transform group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs border border-sky-200">
                {initials}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'doctorInfo',
      header: 'Bác sĩ / Học hàm / Chức vụ',
      render: (item) => {
        const staff = staffMap.get(item.userId);
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm hover:text-sky-700 transition-colors">
                {staff?.fullName || `Bác sĩ #${item.userId}`}
              </span>
              {item.professionalTitle && (
                <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {item.professionalTitle}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              {item.position && <span className="font-medium text-slate-700">{item.position}</span>}
              {staff && <span className="text-slate-400 font-mono text-[11px]">@{staff.username}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'specialty',
      header: 'Chuyên khoa',
      width: '180px',
      render: (item) => {
        const spec = specialtyMap.get(item.specialtyId);
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800">{spec ? spec.name : `Khoa #${item.specialtyId}`}</span>
            {spec && <div className="text-[10px] text-slate-400 font-mono">{spec.code}</div>}
          </div>
        );
      },
    },
    {
      key: 'experience',
      header: 'Kinh nghiệm',
      width: '140px',
      render: (item) => {
        if (!item.practiceStartYear) return <span className="text-xs text-slate-400">-</span>;
        const years = new Date().getFullYear() - item.practiceStartYear;
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800">{years} năm</span>
            <div className="text-[10px] text-slate-400">Từ năm {item.practiceStartYear}</div>
          </div>
        );
      },
    },
    {
      key: 'publicProfile',
      header: 'Công khai Portal',
      width: '150px',
      align: 'center',
      render: (item) => (
        <Badge status={item.publicProfile ? 'ACTIVE' : 'VOIDED'} variant="subtle">
          {item.publicProfile ? 'Đã công khai' : 'Đang ẩn'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '130px',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditDrawer(item);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
            title="Chỉnh sửa hồ sơ"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePublish(item);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              item.publicProfile
                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
            title={item.publicProfile ? 'Ẩn hồ sơ khỏi Cổng Bệnh nhân' : 'Công khai hồ sơ ra Cổng Bệnh nhân'}
          >
            {item.publicProfile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. HEADER TRANG */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-sky-600" />
            Quản trị 62 Hồ sơ Bác sĩ Chuyên khoa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cập nhật học hàm/học vị, ảnh đại diện, thâm niên và quản lý hiển thị công khai trên Cổng Bệnh nhân (M02.02 &amp; M02.03).
          </p>
        </div>

        {/* Nút chuyển chế độ xem Table / Grid */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
              }`}
              title="Xem dạng bảng (Click dòng để xem chi tiết)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
              }`}
              title="Xem dạng thẻ card"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. THANH BỘ LỌC VÀ TÌM KIẾM */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc chuyên khoa */}
          <select
            value={specialtyFilter}
            onChange={(e) => {
              setSpecialtyFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500 max-w-xs"
          >
            <option value="all">Tất cả chuyên khoa ({specialties.length})</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Lọc trạng thái công khai */}
          <select
            value={publicFilter}
            onChange={(e) => setPublicFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Tất cả trạng thái hiển thị</option>
            <option value="true">Đã công khai trên Portal</option>
            <option value="false">Đang ẩn</option>
          </select>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên bác sĩ, học vị, chức vụ..."
            className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 w-64 sm:w-80"
          />
        </div>
      </div>

      {/* Gợi ý UX */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        <span>Mẹo: Bạn có thể click trực tiếp vào bất kỳ dòng nào trong bảng hoặc thẻ card để mở nhanh chi tiết hồ sơ bác sĩ; click vào ảnh đại diện để phóng to.</span>
      </div>

      {/* 3. HIỂN THỊ DỮ LIỆU (DẠNG BẢNG HOẶC DẠNG THẺ GRID) */}
      {viewMode === 'table' ? (
        <DataTable<DoctorProfileAdminResponse>
          columns={columns}
          data={{
            ...profilesData,
            items: filteredProfiles,
          }}
          isLoading={loading}
          emptyMessage="Không tìm thấy bác sĩ nào phù hợp"
          currentPage={page}
          onPageChange={setPage}
          onRowClick={(item) => openEditDrawer(item)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProfiles.map((p) => {
            const staff = staffMap.get(p.userId);
            const spec = specialtyMap.get(p.specialtyId);
            const src = resolveAvatarSrc(p.avatarUrl);
            const years = p.practiceStartYear ? new Date().getFullYear() - p.practiceStartYear : null;

            return (
              <div
                key={p.userId}
                onClick={() => openEditDrawer(p)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer hover:border-sky-300"
              >
                <div className="p-5 text-center flex flex-col items-center">
                  <div className="relative mb-3">
                    {src ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage({
                            src,
                            name: staff?.fullName || `Bác sĩ #${p.userId}`,
                            title: p.professionalTitle || undefined,
                            specialty: spec?.name,
                            position: p.position || undefined,
                          });
                        }}
                        className="relative group/avatar rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-zoom-in"
                        title="Bấm để xem ảnh phóng to"
                      >
                        <img
                          src={src}
                          alt={staff?.fullName || 'Bác sĩ'}
                          className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md shadow-slate-200/50 transition-transform group-hover/avatar:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                        {staff?.fullName ? staff.fullName.charAt(0) : 'BS'}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                        p.publicProfile ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={p.publicProfile ? 'Đang công khai' : 'Đang ẩn'}
                    />
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-sky-700 transition-colors">
                    {staff?.fullName || `Bác sĩ #${p.userId}`}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1">
                    {p.professionalTitle && (
                      <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {p.professionalTitle}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{p.position || 'Bác sĩ chuyên khoa'}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 w-full text-xs text-slate-600 space-y-1.5 text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Khoa:</span>
                      <span className="font-semibold text-slate-800 truncate">{spec?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thâm niên:</span>
                      <span className="font-semibold text-slate-800">
                        {years ? `${years} năm` : 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePublish(p);
                    }}
                    className={`font-semibold flex items-center gap-1 cursor-pointer ${
                      p.publicProfile ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    {p.publicProfile ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{p.publicProfile ? 'Ẩn' : 'Công khai'}</span>
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDrawer(p);
                    }}
                  >
                    Sửa hồ sơ
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DRAWER CHỈNH SỬA HỒ SƠ BÁC SĨ */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="lg"
        title="Chỉnh sửa Hồ sơ Chuyên môn Bác sĩ"
        description="Thông tin học hàm/học vị, quá trình đào tạo và kỹ thuật chuyên sâu xuất hiện trên Cổng Bệnh nhân."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {drawerError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{drawerError}</span>
            </div>
          )}

          {/* Header Bác sĩ đang chỉnh sửa */}
          {editingProfile && (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {resolveAvatarSrc(avatarUrl || editingProfile.avatarUrl) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const src = resolveAvatarSrc(avatarUrl || editingProfile.avatarUrl);
                      if (src) {
                        setPreviewImage({
                          src,
                          name: staffMap.get(editingProfile.userId)?.fullName || `Bác sĩ #${editingProfile.userId}`,
                          title: professionalTitle || editingProfile.professionalTitle || undefined,
                          specialty: specialtyMap.get(editSpecialtyId)?.name,
                          position: position || editingProfile.position || undefined,
                        });
                      }
                    }}
                    className="relative group rounded-full focus:outline-none cursor-zoom-in"
                    title="Bấm để xem ảnh phóng to"
                  >
                    <img
                      src={resolveAvatarSrc(avatarUrl || editingProfile.avatarUrl)!}
                      alt="Avatar"
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-lg">
                    BS
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {staffMap.get(editingProfile.userId)?.fullName || `Bác sĩ #${editingProfile.userId}`}
                  </h4>
                  <div className="text-xs text-sky-700 font-mono">
                    User ID: #{editingProfile.userId} | @{staffMap.get(editingProfile.userId)?.username}
                  </div>
                  <div className="mt-1">
                    <Badge status={editingProfile.publicProfile ? 'ACTIVE' : 'VOIDED'} variant="subtle">
                      {editingProfile.publicProfile ? 'Đang công khai Portal' : 'Đang ẩn khỏi Portal'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTogglePublish(editingProfile)}
              >
                {editingProfile.publicProfile ? 'Ẩn hồ sơ' : 'Công khai ngay'}
              </Button>
            </div>
          )}

          {/* Chọn Chuyên khoa */}
          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Chuyên khoa phụ trách <span className="text-rose-500 font-bold">*</span>
            </label>
            <select
              value={editSpecialtyId}
              onChange={(e) => setEditSpecialtyId(Number(e.target.value))}
              required
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.active && s.id !== editingProfile?.specialtyId}>
                  {s.name} ({s.code}) {!s.active ? '- [Ngừng hoạt động]' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Lưu ý: Nếu bác sĩ đã có lịch ca khám trong hệ thống, backend sẽ chặn đổi chuyên khoa (`DOCTOR_SPECIALTY_LOCKED`).
            </p>
          </div>

          {/* Học vị & Chức vụ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Học hàm / Học vị (Chức danh)"
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
              placeholder="Ví dụ: GS.TS, PGS.TS.BS, TS.BS, ThS.BS..."
              helperText="Tối đa 100 ký tự"
            />

            <Input
              label="Chức vụ tại bệnh viện"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ví dụ: Trưởng khoa Nội, Bác sĩ điều trị..."
              helperText="Tối đa 150 ký tự"
            />
          </div>

          {/* Năm bắt đầu hành nghề & URL ảnh đại diện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Năm bắt đầu hành nghề"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={practiceStartYear}
              onChange={(e) => setPracticeStartYear(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ví dụ: 2012"
              helperText={`Hệ thống tự tính thâm niên (Từ 1900 đến ${new Date().getFullYear()})`}
            />

            <Input
              label="Đường dẫn Avatar (HTTPS)"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://localhost:5173/image_doctors/doctor-001.jpg"
              helperText="Bắt buộc là URL HTTPS (tối đa 500 ký tự)"
            />
          </div>

          {/* Giới thiệu tiểu sử */}
          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Giới thiệu tiểu sử bác sĩ
            </label>
            <textarea
              rows={3}
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="Tóm tắt quá trình công tác, thành tựu và phong cách khám chữa bệnh..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Thế mạnh chuyên môn */}
          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Kỹ thuật &amp; Thế mạnh chuyên sâu
            </label>
            <textarea
              rows={3}
              value={clinicalExpertise}
              onChange={(e) => setClinicalExpertise(e.target.value)}
              placeholder="Các bệnh lý chuyên sâu, kỹ thuật can thiệp hoặc phẫu thuật thế mạnh..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Chứng chỉ & Đào tạo */}
          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Chứng chỉ đào tạo &amp; Tu nghiệp
            </label>
            <textarea
              rows={2}
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="Các chứng chỉ chuyên khoa, khóa tu nghiệp trong và ngoài nước..."
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              disabled={drawerSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={drawerSubmitting}>
              Lưu hồ sơ bác sĩ
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 5. MODAL LIGHTBOX PHÓNG TO ẢNH ĐẠI DIỆN */}
      {previewImage &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            {/* Backdrop làm mờ */}
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in"
              onClick={() => setPreviewImage(null)}
              aria-hidden="true"
            />

            {/* Nội dung ảnh phóng to */}
            <div className="relative z-10 max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-full flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  Ảnh đại diện Bác sĩ
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Khung ảnh sắc nét */}
              <div className="p-6 flex flex-col items-center justify-center w-full bg-gradient-to-b from-slate-50 to-white">
                <img
                  src={previewImage.src}
                  alt={previewImage.name}
                  className="max-h-[60vh] w-auto max-w-full rounded-2xl object-contain shadow-lg border border-slate-200"
                />

                <div className="text-center mt-4">
                  <h3 className="font-extrabold text-slate-900 text-lg">{previewImage.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {previewImage.title && (
                      <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                        {previewImage.title}
                      </span>
                    )}
                    {previewImage.position && (
                      <span className="text-xs text-slate-600 font-medium">{previewImage.position}</span>
                    )}
                  </div>
                  {previewImage.specialty && (
                    <div className="text-xs text-slate-500 mt-1">Khoa: {previewImage.specialty}</div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
