import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  publicDoctorService,
  type DoctorPublicResponse,
  type PublicClinicSlotResponse,
} from '../../services/publicDoctorService';
import { authService, type HospitalConfig } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Drawer } from '../../components/ui/Drawer';
import {
  Stethoscope,
  Search,
  Calendar,
  Clock,
  Award,
  BookOpen,
  Maximize2,
  X,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { resolveAvatarSrc, cn } from '../../lib/utils';
import { formatDateVn, formatTimeVn, getDayOfWeekNameVn } from '../../lib/dateUtils';

export const DoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryDoctorId = searchParams.get('doctorId');

  const [hospitalConfig, setHospitalConfig] = useState<HospitalConfig | null>(null);
  const [doctors, setDoctors] = useState<DoctorPublicResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Bộ lọc & Tìm kiếm
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'experience' | 'name' | 'title'>('experience');

  // Drawer Chi tiết Bác sĩ
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorPublicResponse | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [doctorSlots, setDoctorSlots] = useState<PublicClinicSlotResponse[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Lightbox Phóng to ảnh
  const [zoomedImage, setZoomedImage] = useState<{ src: string; name: string; title?: string } | null>(null);

  // Tải cấu hình viện
  useEffect(() => {
    authService.getHospitalConfig().then(setHospitalConfig).catch(console.warn);
  }, []);

  // Tải danh bạ bác sĩ công khai
  const loadDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await publicDoctorService.listDoctors({
        size: 100, // Lấy toàn bộ danh bạ bác sĩ công khai
        sort: 'practiceStartYear,ASC',
      });
      setDoctors(res.items || []);
    } catch (err) {
      console.warn('Lỗi tải danh bạ bác sĩ:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Trích xuất danh sách chuyên khoa duy nhất từ dữ liệu bác sĩ
  const specialtyOptions = useMemo(() => {
    const map = new Map<number, string>();
    doctors.forEach((d) => {
      if (d.specialtyId && d.specialtyName) {
        map.set(d.specialtyId, d.specialtyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [doctors]);

  // Bộ lọc & Sắp xếp danh sách bác sĩ phía client
  const filteredDoctors = useMemo(() => {
    let result = [...doctors];

    // Lọc theo Chuyên khoa
    if (selectedSpecialtyId !== 'ALL') {
      const specId = Number(selectedSpecialtyId);
      result = result.filter((d) => d.specialtyId === specId);
    }

    // Lọc theo từ khóa tìm kiếm (Tên, chuyên khoa, kỹ thuật, học hàm)
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.specialtyName?.toLowerCase().includes(q) ||
          d.professionalTitle?.toLowerCase().includes(q) ||
          d.clinicalExpertise?.toLowerCase().includes(q) ||
          d.introduction?.toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    if (sortBy === 'experience') {
      result.sort((a, b) => {
        const yearA = a.practiceStartYear || 9999;
        const yearB = b.practiceStartYear || 9999;
        return yearA - yearB; // Năm bắt đầu nhỏ hơn -> thâm niên cao hơn
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.professionalTitle || '').localeCompare(b.professionalTitle || '', 'vi'));
    }

    return result;
  }, [doctors, selectedSpecialtyId, searchKeyword, sortBy]);

  // Tải lịch khám khả dụng của bác sĩ khi mở Drawer
  const loadDoctorSlots = useCallback(async (doctorId: number) => {
    setIsLoadingSlots(true);
    try {
      const res = await publicDoctorService.searchSlots({
        doctorId,
        size: 30,
        sort: 'startAt,ASC',
      });
      // Chỉ lấy các ca khám còn chỗ trong tương lai
      const now = new Date().toISOString();
      const availableList = (res.items || []).filter(
        (s) => s.startAt >= now && s.available > 0
      );
      setDoctorSlots(availableList);
    } catch (err) {
      console.warn('Không thể tải lịch khám khả dụng:', err);
      setDoctorSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  // Mở Drawer chi tiết khi click bác sĩ
  const handleOpenDoctorDetail = useCallback(
    (doc: DoctorPublicResponse) => {
      setSelectedDoctor(doc);
      setIsDrawerOpen(true);
      loadDoctorSlots(doc.userId);
      setSearchParams({ doctorId: String(doc.userId) });
    },
    [loadDoctorSlots, setSearchParams]
  );

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedDoctor(null);
    setSearchParams({});
  };

  // Tự động mở Drawer nếu có query param doctorId trên URL
  useEffect(() => {
    if (queryDoctorId && doctors.length > 0 && !selectedDoctor) {
      const found = doctors.find((d) => String(d.userId) === queryDoctorId);
      if (found) {
        setSelectedDoctor(found);
        setIsDrawerOpen(true);
        loadDoctorSlots(found.userId);
      }
    }
  }, [queryDoctorId, doctors, selectedDoctor, loadDoctorSlots]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* 1. HEADER & GIỚI THIỆU */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-sky-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-200 text-xs font-semibold backdrop-blur-xs border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Đội ngũ Y khoa Chuyên sâu • {doctors.length}+ Bác sĩ
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Danh bạ Bác sĩ Bệnh viện Đa khoa HTAC
          </h1>
          <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
            Quy tụ các Giáo sư, Tiến sĩ, Bác sĩ Chuyên khoa II giàu kinh nghiệm từ các bệnh viện tuyến đầu.
            Chúng tôi luôn lắng nghe, thấu cảm và đồng hành vì sức khỏe của bạn.
          </p>
        </div>

        {/* Nền đồ họa trang trí */}
        <div className="absolute top-1/2 right-12 -translate-y-1/2 hidden lg:block opacity-10 pointer-events-none">
          <Stethoscope className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* 2. BỘ LỌC & TÌM KIẾM THÔNG MINH */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Ô tìm kiếm từ khóa */}
          <div className="md:col-span-5">
            <Input
              placeholder="Tìm theo tên bác sĩ, chuyên môn hoặc học hàm..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Lọc theo Chuyên khoa */}
          <div className="md:col-span-4">
            <Select
              value={selectedSpecialtyId}
              onChange={(e) => setSelectedSpecialtyId(e.target.value)}
            >
              <option value="ALL">-- Tất cả chuyên khoa ({doctors.length}) --</option>
              {specialtyOptions.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Sắp xếp */}
          <div className="md:col-span-3">
            <Select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'experience' | 'name' | 'title')
              }
            >
              <option value="experience">Nhiều năm kinh nghiệm nhất</option>
              <option value="name">Họ và tên (A – Z)</option>
              <option value="title">Theo học vị (PGS, TS, ThS)</option>
            </Select>
          </div>
        </div>

        {/* Thanh kết quả tìm kiếm */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Hiển thị <strong className="text-slate-800">{filteredDoctors.length}</strong> /{' '}
            {doctors.length} bác sĩ
          </div>
          {(searchKeyword || selectedSpecialtyId !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchKeyword('');
                setSelectedSpecialtyId('ALL');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 3. DANH SÁCH THẺ CARD BÁC SĨ (GRID VIEW) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4"
            >
              <div className="w-24 h-24 rounded-full bg-slate-200 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
              <div className="h-10 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto stroke-[1.5]" />
          <h3 className="text-base font-bold text-slate-800">
            Không tìm thấy bác sĩ nào phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Vui lòng thử tìm kiếm bằng từ khóa khác hoặc chuyển sang xem tất cả chuyên khoa.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchKeyword('');
              setSelectedSpecialtyId('ALL');
            }}
          >
            Xem toàn bộ danh bạ
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => {
            const avatarSrc = resolveAvatarSrc(doc.avatarUrl);
            const yearsOfExp = doc.practiceStartYear
              ? new Date().getFullYear() - doc.practiceStartYear
              : null;

            return (
              <div
                key={doc.userId}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-5 text-center">
                  {/* Avatar bác sĩ kèm nút phóng to */}
                  <div className="relative w-28 h-28 mx-auto">
                    <div
                      className="w-full h-full rounded-full overflow-hidden border-3 border-blue-100 shadow-sm group-hover:scale-105 transition-transform duration-200 cursor-pointer bg-slate-100"
                      onClick={() =>
                        avatarSrc &&
                        setZoomedImage({
                          src: avatarSrc,
                          name: doc.fullName,
                          title: doc.professionalTitle || undefined,
                        })
                      }
                      title="Bấm để xem ảnh phóng to"
                    >
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={doc.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Stethoscope className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    {avatarSrc && (
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: avatarSrc,
                            name: doc.fullName,
                            title: doc.professionalTitle || undefined,
                          })
                        }
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white shadow-md text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                        title="Phóng to ảnh"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Thông tin chức danh & chuyên khoa */}
                  <div className="space-y-1.5">
                    {doc.professionalTitle && (
                      <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                        {doc.professionalTitle}
                      </div>
                    )}
                    <h3
                      onClick={() => handleOpenDoctorDetail(doc)}
                      className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      {doc.fullName}
                    </h3>
                    <div className="text-xs font-semibold text-sky-600">
                      {doc.specialtyName || 'Chuyên khoa'}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {doc.position || 'Bác sĩ điều trị'}
                      {yearsOfExp ? ` • ${yearsOfExp} năm kinh nghiệm` : ''}
                    </div>
                  </div>

                  {/* Giới thiệu chuyên môn ngắn */}
                  {doc.clinicalExpertise && (
                    <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{doc.clinicalExpertise}"
                    </p>
                  )}
                </div>

                {/* Nút hành động */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleOpenDoctorDetail(doc)}
                  >
                    Xem hồ sơ
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs shadow-xs"
                    onClick={() => navigate(`/booking?doctorId=${doc.userId}`)}
                  >
                    Đặt lịch khám
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DRAWER CHI TIẾT HỒ SƠ BÁC SĨ (DOCTOR DETAIL DRAWER) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={selectedDoctor?.fullName ? `Bác sĩ ${selectedDoctor.fullName}` : 'Hồ sơ Bác sĩ'}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500">
              Đặt lịch hẹn trước tối đa {hospitalConfig?.advanceBookingDays || 14} ngày
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCloseDrawer}>
                Đóng lại
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (selectedDoctor) {
                    navigate(`/booking?doctorId=${selectedDoctor.userId}`);
                  }
                }}
                leftIcon={<Calendar className="w-4 h-4" />}
              >
                Đặt lịch khám với Bác sĩ này
              </Button>
            </div>
          </div>
        }
      >
        {selectedDoctor && (
          <div className="space-y-6">
            {/* Header thông tin cá nhân */}
            <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="relative shrink-0">
                <div
                  className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white cursor-pointer"
                  onClick={() => {
                    const src = resolveAvatarSrc(selectedDoctor.avatarUrl);
                    if (src) {
                      setZoomedImage({
                        src,
                        name: selectedDoctor.fullName,
                        title: selectedDoctor.professionalTitle || undefined,
                      });
                    }
                  }}
                >
                  {selectedDoctor.avatarUrl ? (
                    <img
                      src={resolveAvatarSrc(selectedDoctor.avatarUrl)!}
                      alt={selectedDoctor.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                      <Stethoscope className="w-10 h-10" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                {selectedDoctor.professionalTitle && (
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider">
                    {selectedDoctor.professionalTitle}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedDoctor.fullName}
                </h2>
                <div className="text-sm font-semibold text-blue-700">
                  {selectedDoctor.specialtyName || 'Chuyên khoa'}
                </div>
                <div className="text-xs text-slate-500">
                  {selectedDoctor.position || 'Bác sĩ điều trị'}
                  {selectedDoctor.practiceStartYear
                    ? ` • ${new Date().getFullYear() - selectedDoctor.practiceStartYear} năm kinh nghiệm y khoa`
                    : ''}
                </div>
              </div>
            </div>

            {/* Tiểu sử & Lời ngỏ */}
            {selectedDoctor.introduction && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Giới thiệu &amp; Quá trình công tác
                </h3>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedDoctor.introduction}
                </div>
              </div>
            )}

            {/* Kỹ thuật chuyên sâu */}
            {selectedDoctor.clinicalExpertise && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Kỹ thuật chuyên môn thế mạnh
                </h3>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedDoctor.clinicalExpertise}
                </div>
              </div>
            )}

            {/* Chứng chỉ & Đào tạo */}
            {selectedDoctor.certifications && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Bằng cấp &amp; Chứng chỉ đào tạo
                </h3>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedDoctor.certifications}
                </div>
              </div>
            )}

            {/* LỊCH KHÁM KHẢ DỤNG SẮP TỚI */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Lịch khám khả dụng sắp tới
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadDoctorSlots(selectedDoctor.userId)}
                  disabled={isLoadingSlots}
                  className="text-xs"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoadingSlots && 'animate-spin')} />
                  Làm mới
                </Button>
              </div>

              {isLoadingSlots ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Đang kiểm tra lịch khám khả dụng...
                </div>
              ) : doctorSlots.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs text-slate-600 font-medium">
                    Bác sĩ hiện chưa mở ca khám trực tuyến trong những ngày tới.
                  </div>
                  <div className="text-xs text-slate-400">
                    Bạn vẫn có thể liên hệ Tổng đài{' '}
                    <strong className="text-blue-700">{hospitalConfig?.phone || '1900 8888'}</strong> để
                    được tư vấn xếp lịch trực tiếp.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {doctorSlots.map((slot) => {
                    const slotDate = new Date(slot.startAt);

                    return (
                      <div
                        key={slot.id}
                        onClick={() =>
                          navigate(
                            `/booking?doctorId=${selectedDoctor.userId}&slotId=${slot.id}`
                          )
                        }
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {getDayOfWeekNameVn(slotDate)}, {formatDateVn(slotDate)}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                            Còn {slot.available} chỗ
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="font-semibold text-blue-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeVn(slot.startAt)} – {formatTimeVn(slot.endAt)}
                          </span>
                          <span className="text-slate-500">{slot.roomName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* 5. LIGHTBOX PHÓNG TO ẢNH ĐẠI DIỆN */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{zoomedImage.name}</h3>
                {zoomedImage.title && (
                  <span className="text-xs text-blue-600 font-medium">
                    {zoomedImage.title}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-50">
              <img
                src={zoomedImage.src}
                alt={zoomedImage.name}
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsPage;
