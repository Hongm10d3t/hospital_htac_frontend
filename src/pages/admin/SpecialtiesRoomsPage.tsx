import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  clinicDirectoryService,
  type SpecialtyResponse,
  type ClinicRoomResponse,
} from '../../services/clinicDirectoryService';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  Edit2,
  Filter,
  Info,
  MapPin,
  Plus,
  Power,
  RotateCcw,
  Search,
} from 'lucide-react';
import { ApiError, type PageResponse } from '../../services/api';

type TabType = 'specialties' | 'rooms';

export const SpecialtiesRoomsPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('specialties');

  // ==================== 1. QUẢN LÝ CHUYÊN KHOA ====================
  const [specialtiesData, setSpecialtiesData] = useState<PageResponse<SpecialtyResponse>>({
    items: [],
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [specLoading, setSpecLoading] = useState(false);
  const [specActiveFilter, setSpecActiveFilter] = useState<string>('all');
  const [specSearch, setSpecSearch] = useState('');
  const [specPage, setSpecPage] = useState(0);

  // Drawer Chuyên khoa
  const [specDrawerOpen, setSpecDrawerOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<SpecialtyResponse | null>(null);
  const [specCode, setSpecCode] = useState('');
  const [specName, setSpecName] = useState('');
  const [specSubmitting, setSpecSubmitting] = useState(false);
  const [specFormError, setSpecFormError] = useState<string | null>(null);

  // ==================== 2. QUẢN LÝ PHÒNG KHÁM ====================
  const [roomsData, setRoomsData] = useState<PageResponse<ClinicRoomResponse>>({
    items: [],
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomActiveFilter, setRoomActiveFilter] = useState<string>('all');
  const [roomSpecFilter, setRoomSpecFilter] = useState<string>('all');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomPage, setRoomPage] = useState(0);

  // Danh sách toàn bộ chuyên khoa (phục vụ chọn dropdown & hiển thị tên)
  const [allSpecialties, setAllSpecialties] = useState<SpecialtyResponse[]>([]);

  // Drawer Phòng khám
  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ClinicRoomResponse | null>(null);
  const [roomSpecialtyId, setRoomSpecialtyId] = useState<number | ''>('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [roomSubmitting, setRoomSubmitting] = useState(false);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Map tra cứu nhanh tên chuyên khoa theo ID
  const specialtyMap = useMemo(() => {
    const map = new Map<number, SpecialtyResponse>();
    allSpecialties.forEach((s) => map.set(s.id, s));
    return map;
  }, [allSpecialties]);

  // ==================== TẢI DỮ LIỆU ====================

  const loadAllSpecialties = useCallback(async () => {
    try {
      const res = await clinicDirectoryService.listSpecialties({ size: 100 });
      setAllSpecialties(res.items);
    } catch (err) {
      console.warn('[SpecialtiesRooms] Chưa tải được danh sách chuyên khoa:', err);
    }
  }, []);

  const loadSpecialties = useCallback(async () => {
    setSpecLoading(true);
    try {
      const activeParam = specActiveFilter === 'all' ? undefined : specActiveFilter === 'true';
      const res = await clinicDirectoryService.listSpecialties({
        active: activeParam,
        page: specPage,
        size: 20,
        sort: 'id,asc',
      });
      setSpecialtiesData(res);
    } catch (err) {
      toast.error('Không thể tải danh sách chuyên khoa');
      console.error(err);
    } finally {
      setSpecLoading(false);
    }
  }, [specActiveFilter, specPage, toast]);

  const loadClinicRooms = useCallback(async () => {
    setRoomLoading(true);
    try {
      const activeParam = roomActiveFilter === 'all' ? undefined : roomActiveFilter === 'true';
      const specIdParam = roomSpecFilter === 'all' ? undefined : Number(roomSpecFilter);

      const res = await clinicDirectoryService.listClinicRooms({
        specialtyId: specIdParam,
        active: activeParam,
        page: roomPage,
        size: 20,
        sort: 'id,asc',
      });
      setRoomsData(res);
    } catch (err) {
      toast.error('Không thể tải danh sách phòng khám');
      console.error(err);
    } finally {
      setRoomLoading(false);
    }
  }, [roomActiveFilter, roomSpecFilter, roomPage, toast]);

  useEffect(() => {
    loadAllSpecialties();
  }, [loadAllSpecialties]);

  useEffect(() => {
    if (activeTab === 'specialties') {
      loadSpecialties();
    } else {
      loadClinicRooms();
    }
  }, [activeTab, loadSpecialties, loadClinicRooms]);

  // ==================== HÀNH ĐỘNG CHUYÊN KHOA ====================

  const openCreateSpecialty = () => {
    setEditingSpecialty(null);
    setSpecCode('');
    setSpecName('');
    setSpecFormError(null);
    setSpecDrawerOpen(true);
  };

  const openEditSpecialty = (spec: SpecialtyResponse) => {
    setEditingSpecialty(spec);
    setSpecCode(spec.code);
    setSpecName(spec.name);
    setSpecFormError(null);
    setSpecDrawerOpen(true);
  };

  const handleSaveSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpecFormError(null);

    const code = specCode.trim().toUpperCase();
    const name = specName.trim();

    if (!code || !name) {
      setSpecFormError('Vui lòng nhập đầy đủ mã và tên chuyên khoa');
      return;
    }

    if (!/^[A-Za-z0-9._-]{1,20}$/.test(code)) {
      setSpecFormError('Mã chuyên khoa chỉ gồm 1-20 ký tự chữ, số hoặc các dấu . _ -');
      return;
    }

    setSpecSubmitting(true);
    try {
      if (editingSpecialty) {
        await clinicDirectoryService.updateSpecialty(editingSpecialty.id, { code, name });
        toast.success(`Cập nhật chuyên khoa "${name}" thành công`);
      } else {
        await clinicDirectoryService.createSpecialty({ code, name });
        toast.success(`Thêm mới chuyên khoa "${name}" thành công`);
      }
      setSpecDrawerOpen(false);
      loadSpecialties();
      loadAllSpecialties();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SPECIALTY_CODE_TAKEN' || err.status === 409) {
          setSpecFormError(`Mã chuyên khoa "${code}" đã tồn tại. Vui lòng chọn mã khác.`);
        } else {
          setSpecFormError(err.message || 'Lỗi lưu thông tin chuyên khoa');
        }
      } else {
        setSpecFormError('Có lỗi xảy ra khi kết nối máy chủ');
      }
    } finally {
      setSpecSubmitting(false);
    }
  };

  const handleToggleSpecialtyStatus = async (spec: SpecialtyResponse) => {
    const actionText = spec.active ? 'ngừng hoạt động' : 'kích hoạt lại';
    try {
      if (spec.active) {
        await clinicDirectoryService.deactivateSpecialty(spec.id);
        toast.info(`Đã chuyển chuyên khoa "${spec.name}" sang ngừng hoạt động`);
      } else {
        await clinicDirectoryService.activateSpecialty(spec.id);
        toast.success(`Đã kích hoạt lại chuyên khoa "${spec.name}"`);
      }
      loadSpecialties();
      loadAllSpecialties();
    } catch (err) {
      toast.error(`Không thể ${actionText} chuyên khoa`);
    }
  };

  // ==================== HÀNH ĐỘNG PHÒNG KHÁM ====================

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomSpecialtyId(allSpecialties.find((s) => s.active)?.id || '');
    setRoomCode('');
    setRoomName('');
    setRoomLocation('');
    setRoomFormError(null);
    setRoomDrawerOpen(true);
  };

  const openEditRoom = (room: ClinicRoomResponse) => {
    setEditingRoom(room);
    setRoomSpecialtyId(room.specialtyId);
    setRoomCode(room.code);
    setRoomName(room.name);
    setRoomLocation(room.location || '');
    setRoomFormError(null);
    setRoomDrawerOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomFormError(null);

    if (!roomSpecialtyId) {
      setRoomFormError('Vui lòng chọn chuyên khoa phụ trách');
      return;
    }

    const code = roomCode.trim().toUpperCase();
    const name = roomName.trim();
    const location = roomLocation.trim() || null;

    if (!code || !name) {
      setRoomFormError('Vui lòng nhập đầy đủ mã và tên phòng khám');
      return;
    }

    if (!/^[A-Za-z0-9._-]{1,20}$/.test(code)) {
      setRoomFormError('Mã phòng khám chỉ gồm 1-20 ký tự chữ, số hoặc các dấu . _ -');
      return;
    }

    setRoomSubmitting(true);
    try {
      if (editingRoom) {
        await clinicDirectoryService.updateClinicRoom(editingRoom.id, {
          specialtyId: Number(roomSpecialtyId),
          code,
          name,
          location,
        });
        toast.success(`Cập nhật phòng "${name}" thành công`);
      } else {
        await clinicDirectoryService.createClinicRoom({
          specialtyId: Number(roomSpecialtyId),
          code,
          name,
          location,
        });
        toast.success(`Tạo mới phòng "${name}" thành công`);
      }
      setRoomDrawerOpen(false);
      loadClinicRooms();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ROOM_SPECIALTY_LOCKED' || err.status === 409) {
          setRoomFormError('Không thể đổi chuyên khoa: Phòng khám này đã phát sinh lịch khám trong hệ thống.');
        } else if (err.code === 'ROOM_CODE_TAKEN') {
          setRoomFormError(`Mã phòng "${code}" đã tồn tại trên hệ thống.`);
        } else if (err.code === 'SPECIALTY_INACTIVE') {
          setRoomFormError('Chuyên khoa được chọn đang ngừng hoạt động.');
        } else {
          setRoomFormError(err.message || 'Lỗi lưu thông tin phòng khám');
        }
      } else {
        setRoomFormError('Có lỗi kết nối đến máy chủ');
      }
    } finally {
      setRoomSubmitting(false);
    }
  };

  const handleToggleRoomStatus = async (room: ClinicRoomResponse) => {
    const actionText = room.active ? 'ngừng hoạt động' : 'kích hoạt lại';
    try {
      if (room.active) {
        await clinicDirectoryService.deactivateClinicRoom(room.id);
        toast.info(`Đã chuyển phòng "${room.name}" sang ngừng hoạt động`);
      } else {
        // Kiểm tra chuyên khoa của phòng có đang hoạt động không
        const currentSpec = specialtyMap.get(room.specialtyId);
        if (currentSpec && !currentSpec.active) {
          toast.error(`Không thể bật phòng: Chuyên khoa "${currentSpec.name}" đang ngừng hoạt động.`);
          return;
        }
        await clinicDirectoryService.activateClinicRoom(room.id);
        toast.success(`Đã kích hoạt lại phòng "${room.name}"`);
      }
      loadClinicRooms();
    } catch (err) {
      toast.error(`Không thể ${actionText} phòng khám`);
    }
  };

  // ==================== LỌC TÌM KIẾM ====================

  const filteredSpecialties = useMemo(() => {
    if (!specSearch.trim()) return specialtiesData.items;
    const q = specSearch.toLowerCase().trim();
    return specialtiesData.items.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [specialtiesData.items, specSearch]);

  const filteredRooms = useMemo(() => {
    if (!roomSearch.trim()) return roomsData.items;
    const q = roomSearch.toLowerCase().trim();
    return roomsData.items.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.location && r.location.toLowerCase().includes(q))
    );
  }, [roomsData.items, roomSearch]);

  // ==================== CẤU HÌNH CỘT BẢNG ====================

  const specialtyColumns: Column<SpecialtyResponse>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '80px',
      render: (spec) => <span className="font-mono text-xs text-slate-500">#{spec.id}</span>,
    },
    {
      key: 'code',
      header: 'Mã chuyên khoa',
      width: '160px',
      render: (spec) => (
        <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
          {spec.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Tên chuyên khoa',
      render: (spec) => <span className="font-semibold text-slate-900">{spec.name}</span>,
    },
    {
      key: 'active',
      header: 'Trạng thái',
      width: '160px',
      align: 'center',
      render: (spec) => (
        <Badge status={spec.active ? 'ACTIVE' : 'VOIDED'} variant="subtle">
          {spec.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '160px',
      align: 'right',
      render: (spec) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditSpecialty(spec);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
            title="Sửa thông tin"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSpecialtyStatus(spec);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              spec.active
                ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
            title={spec.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const roomColumns: Column<ClinicRoomResponse>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '70px',
      render: (r) => <span className="font-mono text-xs text-slate-500">#{r.id}</span>,
    },
    {
      key: 'code',
      header: 'Mã phòng',
      width: '130px',
      render: (r) => (
        <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Tên phòng khám',
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-900">{r.name}</div>
          {r.location && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{r.location}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'specialtyId',
      header: 'Chuyên khoa phụ trách',
      width: '220px',
      render: (r) => {
        const spec = specialtyMap.get(r.specialtyId);
        return (
          <div className="text-xs">
            <div className="font-medium text-slate-800">{spec ? spec.name : `Chuyên khoa #${r.specialtyId}`}</div>
            {spec && !spec.active && (
              <span className="text-[10px] text-amber-600 font-medium">(Chuyên khoa đã ngừng)</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'active',
      header: 'Trạng thái',
      width: '150px',
      align: 'center',
      render: (r) => (
        <Badge status={r.active ? 'ACTIVE' : 'VOIDED'} variant="subtle">
          {r.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '150px',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditRoom(r);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
            title="Sửa phòng khám"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRoomStatus(r);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              r.active
                ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
            title={r.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. HEADER TRANG & CHUYỂN TABS */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-600" />
            Danh mục Chuyên khoa &amp; Phòng khám
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị danh sách khoa chuyên môn và phòng tiếp nhận bệnh nhân của Bệnh viện HTAC (M02.01).
          </p>
        </div>

        {/* Nút thêm mới theo Tab */}
        <div>
          {activeTab === 'specialties' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateSpecialty}
            >
              Thêm Chuyên khoa
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateRoom}
            >
              Thêm Phòng khám
            </Button>
          )}
        </div>
      </div>

      {/* 2. CHỌN TAB & THANH BỘ LỌC TÌM KIẾM */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tab switch */}
        <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('specialties')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'specialties'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chuyên khoa ({specialtiesData.totalItems})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-white text-cyan-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phòng khám ({roomsData.totalItems})
          </button>
        </div>

        {/* Bộ lọc theo Tab */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'specialties' ? (
            <>
              {/* Lọc trạng thái chuyên khoa */}
              <select
                value={specActiveFilter}
                onChange={(e) => {
                  setSpecActiveFilter(e.target.value);
                  setSpecPage(0);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Ngừng hoạt động</option>
              </select>

              {/* Tìm kiếm chuyên khoa */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={specSearch}
                  onChange={(e) => setSpecSearch(e.target.value)}
                  placeholder="Tìm mã hoặc tên khoa..."
                  className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 w-52 sm:w-64"
                />
              </div>
            </>
          ) : (
            <>
              {/* Lọc phòng theo chuyên khoa */}
              <select
                value={roomSpecFilter}
                onChange={(e) => {
                  setRoomSpecFilter(e.target.value);
                  setRoomPage(0);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-500 max-w-xs"
              >
                <option value="all">Tất cả chuyên khoa</option>
                {allSpecialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              {/* Lọc trạng thái phòng */}
              <select
                value={roomActiveFilter}
                onChange={(e) => {
                  setRoomActiveFilter(e.target.value);
                  setRoomPage(0);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Ngừng hoạt động</option>
              </select>

              {/* Tìm kiếm phòng */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Tìm mã, tên phòng, vị trí..."
                  className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 w-52 sm:w-64"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU CHUYÊN KHOA HOẶC PHÒNG KHÁM */}
      {activeTab === 'specialties' ? (
        <DataTable<SpecialtyResponse>
          columns={specialtyColumns}
          data={{
            ...specialtiesData,
            items: filteredSpecialties,
          }}
          isLoading={specLoading}
          emptyMessage="Không tìm thấy chuyên khoa nào"
          currentPage={specPage}
          onPageChange={setSpecPage}
          onRowClick={(item) => openEditSpecialty(item)}
        />
      ) : (
        <DataTable<ClinicRoomResponse>
          columns={roomColumns}
          data={{
            ...roomsData,
            items: filteredRooms,
          }}
          isLoading={roomLoading}
          emptyMessage="Không tìm thấy phòng khám nào"
          currentPage={roomPage}
          onPageChange={setRoomPage}
          onRowClick={(item) => openEditRoom(item)}
        />
      )}

      {/* 4. DRAWER THÊM MỚI / CHỈNH SỬA CHUYÊN KHOA */}
      <Drawer
        isOpen={specDrawerOpen}
        onClose={() => setSpecDrawerOpen(false)}
        title={editingSpecialty ? 'Chỉnh sửa Chuyên khoa' : 'Thêm Chuyên khoa Mới'}
        description="Mã chuyên khoa và tên khoa dùng để phân loại bác sĩ và lập phòng khám."
      >
        <form onSubmit={handleSaveSpecialty} className="space-y-4">
          {specFormError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{specFormError}</span>
            </div>
          )}

          <Input
            label="Mã chuyên khoa (Code)"
            value={specCode}
            onChange={(e) => setSpecCode(e.target.value.toUpperCase())}
            required
            placeholder="Ví dụ: CARD, NOITH, MAT..."
            helperText="1-20 ký tự chữ, số hoặc . _ - (Không phân biệt hoa thường, tự động viết hoa)"
          />

          <Input
            label="Tên chuyên khoa"
            value={specName}
            onChange={(e) => setSpecName(e.target.value)}
            required
            placeholder="Ví dụ: Khoa Tim Mạch, Khoa Mắt..."
            helperText="Tên đầy đủ hiển thị trên lịch khám và danh bạ bác sĩ (tối đa 100 ký tự)"
          />

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSpecDrawerOpen(false)}
              disabled={specSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" variant="primary" isLoading={specSubmitting}>
              {editingSpecialty ? 'Lưu thay đổi' : 'Tạo Chuyên khoa'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 5. DRAWER THÊM MỚI / CHỈNH SỬA PHÒNG KHÁM */}
      <Drawer
        isOpen={roomDrawerOpen}
        onClose={() => setRoomDrawerOpen(false)}
        title={editingRoom ? 'Chỉnh sửa Phòng khám' : 'Thêm Phòng khám Mới'}
        description="Phòng khám gắn với chuyên khoa phụ trách để cấp số thứ tự và phân ca khám."
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {roomFormError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{roomFormError}</span>
            </div>
          )}

          {/* Cảnh báo khóa chuyên khoa nếu phòng đã có lịch khám */}
          {editingRoom && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý nghiệp vụ:</strong> Nếu phòng khám đã từng phát sinh ca khám (clinic slot), hệ thống sẽ khóa không cho phép đổi sang chuyên khoa khác nhằm bảo toàn lịch sử y tế.
              </div>
            </div>
          )}

          {/* Chọn chuyên khoa */}
          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Chuyên khoa phụ trách <span className="text-rose-500 font-bold">*</span>
            </label>
            <select
              value={roomSpecialtyId}
              onChange={(e) => setRoomSpecialtyId(Number(e.target.value))}
              required
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="" disabled>
                -- Chọn chuyên khoa --
              </option>
              {allSpecialties.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.active && s.id !== editingRoom?.specialtyId}>
                  {s.name} ({s.code}) {!s.active ? '- [Ngừng hoạt động]' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Phòng khám chỉ tiếp nhận bệnh nhân khám theo chuyên khoa này
            </p>
          </div>

          <Input
            label="Mã phòng khám"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            required
            placeholder="Ví dụ: P101, P202, PK_MAT..."
            helperText="1-20 ký tự chữ, số hoặc . _ -"
          />

          <Input
            label="Tên phòng khám"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            placeholder="Ví dụ: Phòng Khám Nội Tổng Quát 1"
            helperText="Tên phòng hiển thị trên bảng số thứ tự và phiếu khám (tối đa 100 ký tự)"
          />

          <Input
            label="Vị trí phòng (Tùy chọn)"
            value={roomLocation}
            onChange={(e) => setRoomLocation(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4" />}
            placeholder="Ví dụ: Tầng 1, Tòa nhà A, Khu Khám Bệnh"
            helperText="Chỉ dẫn giúp bệnh nhân dễ dàng tìm phòng khi đến viện (tối đa 200 ký tự)"
          />

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoomDrawerOpen(false)}
              disabled={roomSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" variant="secondary" isLoading={roomSubmitting}>
              {editingRoom ? 'Lưu thay đổi' : 'Tạo Phòng khám'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};
