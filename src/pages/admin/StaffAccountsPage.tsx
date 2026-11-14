import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  staffAccountService,
  type StaffAccountResponse,
  type StaffRole,
  type CreateStaffAccountRequest,
  type PasswordResetVerificationMethod,
} from '../../services/staffAccountService';
import {
  clinicDirectoryService,
  type SpecialtyResponse,
} from '../../services/clinicDirectoryService';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  AlertTriangle,
  Edit2,
  KeyRound,
  Lock,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Stethoscope,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react';
import { ApiError, type PageResponse } from '../../services/api';

export const StaffAccountsPage: React.FC = () => {
  const toast = useToast();

  const [staffData, setStaffData] = useState<PageResponse<StaffAccountResponse>>({
    items: [],
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(0);

  // Danh sách chuyên khoa phục vụ chọn cho Bác sĩ (DOCTOR)
  const [specialties, setSpecialties] = useState<SpecialtyResponse[]>([]);

  // Drawer Thêm mới / Sửa tài khoản
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccountResponse | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('RECEPTIONIST');
  const [specialtyId, setSpecialtyId] = useState<number | ''>('');
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Modal Reset Mật khẩu
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStaff, setResetStaff] = useState<StaffAccountResponse | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [verifiedVia, setVerifiedVia] = useState<PasswordResetVerificationMethod>('IN_PERSON');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // ==================== TẢI DỮ LIỆU ====================

  const loadSpecialties = useCallback(async () => {
    try {
      const res = await clinicDirectoryService.listSpecialties({ active: true, size: 100 });
      setSpecialties(res.items);
    } catch (err) {
      console.warn('[StaffAccounts] Chưa tải được danh sách chuyên khoa:', err);
    }
  }, []);

  const loadStaffAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffAccountService.listStaffAccounts({
        page,
        size: 20,
        sort: 'id,asc',
      });
      setStaffData(res);
    } catch (err) {
      toast.error('Không thể tải danh sách tài khoản nhân viên');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    loadStaffAccounts();
    loadSpecialties();
  }, [loadStaffAccounts, loadSpecialties]);

  // ==================== LỌC DỮ LIỆU TẠI CLIENT ====================

  const filteredStaff = useMemo(() => {
    return staffData.items.filter((item) => {
      // Lọc vai trò
      if (roleFilter !== 'all' && item.role !== roleFilter) return false;
      // Lọc trạng thái
      if (activeFilter === 'true' && !item.active) return false;
      if (activeFilter === 'false' && item.active) return false;
      // Lọc từ khóa
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const matchName = item.fullName.toLowerCase().includes(q);
        const matchUsername = item.username.toLowerCase().includes(q);
        const matchPhone = item.phone.toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchPhone) return false;
      }
      return true;
    });
  }, [staffData.items, roleFilter, activeFilter, searchKeyword]);

  // ==================== HÀNH ĐỘNG DRAWER ====================

  const openCreateDrawer = () => {
    setEditingStaff(null);
    setUsername('');
    setPassword('Htac@2026');
    setFullName('');
    setPhone('');
    setRole('RECEPTIONIST');
    setSpecialtyId(specialties[0]?.id || '');
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (staff: StaffAccountResponse) => {
    setEditingStaff(staff);
    setUsername(staff.username);
    setPassword('');
    setFullName(staff.fullName);
    setPhone(staff.phone);
    setRole(staff.role);
    setSpecialtyId('');
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);

    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername || !trimmedFullName || !trimmedPhone) {
      setDrawerError('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }

    if (!/^[A-Za-z0-9._-]{3,50}$/.test(trimmedUsername)) {
      setDrawerError('Tên đăng nhập phải dài 3-50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch nối');
      return;
    }

    if (!editingStaff && (!password || password.length < 6 || password.length > 128)) {
      setDrawerError('Mật khẩu khởi tạo phải từ 6 đến 128 ký tự');
      return;
    }

    if (role === 'DOCTOR' && !editingStaff && !specialtyId) {
      setDrawerError('Tài khoản Bác sĩ bắt buộc phải chọn Chuyên khoa phụ trách');
      return;
    }

    setDrawerSubmitting(true);
    try {
      if (editingStaff) {
        await staffAccountService.updateStaffAccount(editingStaff.id, {
          username: trimmedUsername,
          fullName: trimmedFullName,
          phone: trimmedPhone,
          role,
          specialtyId: role === 'DOCTOR' && specialtyId ? Number(specialtyId) : undefined,
        });
        toast.success(`Cập nhật tài khoản "${trimmedFullName}" thành công`);
      } else {
        const payload: CreateStaffAccountRequest = {
          username: trimmedUsername,
          password: password.trim(),
          fullName: trimmedFullName,
          phone: trimmedPhone,
          role,
          specialtyId: role === 'DOCTOR' && specialtyId ? Number(specialtyId) : undefined,
        };
        await staffAccountService.createStaffAccount(payload);
        toast.success(`Tạo tài khoản nhân viên "${trimmedFullName}" thành công!`);
      }
      setDrawerOpen(false);
      loadStaffAccounts();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'USERNAME_TAKEN' || err.status === 409) {
          setDrawerError(`Tên đăng nhập "${trimmedUsername}" đã tồn tại. Vui lòng chọn tên khác.`);
        } else if (err.code === 'ROLE_LOCKED') {
          setDrawerError('Không thể đổi vai trò: Tài khoản này đã có hồ sơ y tế hoặc phát sinh lịch sử nghiệp vụ.');
        } else if (err.code === 'SPECIALTY_INACTIVE') {
          setDrawerError('Chuyên khoa được chọn đang ngừng hoạt động.');
        } else {
          setDrawerError(err.message || 'Lỗi khi lưu thông tin nhân viên');
        }
      } else {
        setDrawerError('Có lỗi xảy ra khi kết nối máy chủ');
      }
    } finally {
      setDrawerSubmitting(false);
    }
  };

  // ==================== KHÓA / MỞ KHÓA TÀI KHOẢN ====================

  const handleToggleActive = async (staff: StaffAccountResponse) => {
    const actionText = staff.active ? 'Khóa' : 'Mở khóa';
    try {
      if (staff.active) {
        await staffAccountService.lockAccount(staff.id);
        toast.info(`Đã khóa tài khoản của ${staff.fullName}`);
      } else {
        await staffAccountService.unlockAccount(staff.id);
        toast.success(`Đã mở khóa tài khoản cho ${staff.fullName}`);
      }
      loadStaffAccounts();
    } catch (err) {
      toast.error(`Không thể ${actionText.toLowerCase()} tài khoản`);
    }
  };

  // ==================== RESET MẬT KHẨU ====================

  const openResetModal = (staff: StaffAccountResponse) => {
    setResetStaff(staff);
    setNewPassword('');
    setVerifiedVia('IN_PERSON');
    setResetError(null);
    setResetModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff) return;
    setResetError(null);

    if (newPassword.length < 6 || newPassword.length > 128) {
      setResetError('Mật khẩu mới phải dài từ 6 đến 128 ký tự');
      return;
    }

    setResetSubmitting(true);
    try {
      await staffAccountService.resetPassword(resetStaff.id, {
        newPassword: newPassword.trim(),
        verifiedVia,
      });
      toast.success(`Đặt lại mật khẩu cho ${resetStaff.fullName} thành công!`);
      setResetModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ADMIN_RESET_FORBIDDEN') {
          setResetError('Không được phép đặt lại mật khẩu của tài khoản Quản trị viên');
        } else {
          setResetError(err.message || 'Lỗi khi đặt lại mật khẩu');
        }
      } else {
        setResetError('Có lỗi kết nối máy chủ');
      }
    } finally {
      setResetSubmitting(false);
    }
  };

  // ==================== BẢNG CỘT DỮ LIỆU ====================

  const columns: Column<StaffAccountResponse>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '70px',
      render: (item) => <span className="font-mono text-xs text-slate-500">#{item.id}</span>,
    },
    {
      key: 'username',
      header: 'Tên đăng nhập',
      width: '150px',
      render: (item) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          @{item.username}
        </span>
      ),
    },
    {
      key: 'fullName',
      header: 'Họ và tên nhân viên',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">{item.fullName}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{item.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò nghiệp vụ',
      width: '160px',
      align: 'center',
      render: (item) => {
        let badgeColor: 'PRIMARY' | 'CONFIRMED' | 'QUARANTINE' = 'CONFIRMED';
        let roleName = 'Tiếp đón';
        if (item.role === 'DOCTOR') {
          badgeColor = 'PRIMARY';
          roleName = 'Bác sĩ';
        } else if (item.role === 'PHARMACIST') {
          badgeColor = 'QUARANTINE';
          roleName = 'Dược sĩ';
        }
        return (
          <Badge status={badgeColor} variant="subtle" withDot={false}>
            {roleName} ({item.role})
          </Badge>
        );
      },
    },
    {
      key: 'active',
      header: 'Trạng thái',
      width: '140px',
      align: 'center',
      render: (item) => (
        <Badge status={item.active ? 'ACTIVE' : 'BLOCKED'} variant="subtle">
          {item.active ? 'Đang hoạt động' : 'Đã khóa'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '150px',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {item.role === 'DOCTOR' && (
            <Link
              to={`/admin/doctor-profiles?doctorId=${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
              title="Xem hồ sơ chuyên môn Bác sĩ"
            >
              <Stethoscope className="w-4 h-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditDrawer(item);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
            title="Chỉnh sửa thông tin"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openResetModal(item);
            }}
            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
            title="Đặt lại mật khẩu"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(item);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              item.active
                ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
            title={item.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
          >
            {item.active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. HEADER TRANG & NÚT THÊM TÀI KHOẢN */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            Quản trị Tài khoản Nhân viên
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tài khoản Bác sĩ, Tiếp đón và Dược sĩ; kiểm soát phiên đăng nhập và bảo mật tài khoản.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateDrawer}
        >
          Tạo tài khoản nhân viên
        </Button>
      </div>

      {/* 2. THANH BỘ LỌC VÀ TÌM KIẾM */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc vai trò */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
            <option value="RECEPTIONIST">Tiếp đón (RECEPTIONIST)</option>
            <option value="PHARMACIST">Dược sĩ (PHARMACIST)</option>
          </select>

          {/* Lọc trạng thái */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã bị khóa</option>
          </select>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên, username, SĐT..."
            className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 w-64 sm:w-72"
          />
        </div>
      </div>

      {/* Gợi ý thao tác nhanh */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        <span>Mẹo: Bạn có thể click trực tiếp vào bất kỳ dòng nào trong bảng để xem và chỉnh sửa thông tin tài khoản nhân viên.</span>
      </div>

      {/* 3. BẢNG DỮ LIỆU NHÂN VIÊN */}
      <DataTable<StaffAccountResponse>
        columns={columns}
        data={{
          ...staffData,
          items: filteredStaff,
        }}
        isLoading={loading}
        emptyMessage="Không tìm thấy tài khoản nhân viên nào"
        currentPage={page}
        onPageChange={setPage}
        onRowClick={(item) => openEditDrawer(item)}
      />

      {/* 4. DRAWER THÊM MỚI / CHỈNH SỬA TÀI KHOẢN */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingStaff ? 'Chỉnh sửa Tài khoản Nhân viên' : 'Tạo Tài khoản Nhân viên Mới'}
        description="Thông tin tài khoản đăng nhập và vai trò phân quyền nghiệp vụ y tế."
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          {drawerError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{drawerError}</span>
            </div>
          )}

          {editingStaff && (
            <div className="space-y-3">
              {editingStaff.role === 'DOCTOR' && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Hồ sơ chuyên môn Bác sĩ</div>
                      <div className="text-[11px] text-slate-500">Xem ảnh, học hàm/học vị, thâm niên &amp; công khai</div>
                    </div>
                  </div>
                  <Link
                    to={`/admin/doctor-profiles?doctorId=${editingStaff.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white border border-sky-300 text-sky-700 text-xs font-semibold hover:bg-sky-50 transition-colors shadow-xs"
                  >
                    Mở hồ sơ ➔
                  </Link>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] flex items-start gap-2">
                <Shield className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Lưu ý:</strong> Thay đổi vai trò hoặc tên đăng nhập sẽ khiến các phiên đăng nhập cũ của nhân viên này hết hiệu lực. Không thể đổi vai trò nếu nhân viên đã phát sinh hồ sơ hoặc lịch sử khám (`ROLE_LOCKED`).
                </div>
              </div>
            </div>
          )}

          <Input
            label="Tên đăng nhập (Username)"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
            placeholder="Ví dụ: doctor_tuan, staff_lan..."
            helperText="3-50 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch nối"
          />

          {!editingStaff && (
            <Input
              label="Mật khẩu khởi tạo"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Tối thiểu 6 ký tự"
              helperText="Mật khẩu tạm thời cho nhân viên đăng nhập lần đầu"
            />
          )}

          <Input
            label="Họ và tên nhân viên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Ví dụ: BS. Nguyễn Văn Tuấn"
            helperText="Tên đầy đủ hiển thị trên hệ thống và các phiếu khám"
          />

          <Input
            label="Số điện thoại liên hệ"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            leftIcon={<Phone className="w-4 h-4" />}
            placeholder="Ví dụ: 0988123456"
          />

          {/* Chọn vai trò */}
          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Vai trò nghiệp vụ <span className="text-rose-500 font-bold">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              required
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value="RECEPTIONIST">Nhân viên Tiếp đón (RECEPTIONIST)</option>
              <option value="DOCTOR">Bác sĩ khám bệnh &amp; Kê đơn (DOCTOR)</option>
              <option value="PHARMACIST">Dược sĩ &amp; Quầy thuốc (PHARMACIST)</option>
            </select>
          </div>

          {/* Chọn chuyên khoa nếu là Bác sĩ */}
          {role === 'DOCTOR' && (
            <div className="text-left p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Chuyên khoa Bác sĩ phụ trách <span className="text-rose-500">*</span>
              </label>
              <select
                value={specialtyId}
                onChange={(e) => setSpecialtyId(Number(e.target.value))}
                required={!editingStaff}
                className="block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>
                  -- Chọn chuyên khoa --
                </option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Hồ sơ Bác sĩ sẽ được tự động tạo trong cùng giao dịch ở trạng thái chưa công khai. Bạn có thể cập nhật ảnh và học vị tại mục 62 Hồ sơ Bác sĩ.
              </p>
            </div>
          )}

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
              {editingStaff ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 5. MODAL ĐẶT LẠI MẬT KHẨU (ADMIN PASSWORD RESET) */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Đặt lại Mật khẩu Nhân viên"
        description={`Thiết lập mật khẩu mới cho tài khoản @${resetStaff?.username} (${resetStaff?.fullName})`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{resetError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Quy định kiểm toán hệ thống:
            </span>
            <p className="leading-relaxed">
              Quản trị viên bắt buộc phải đối chiếu danh tính của nhân viên ngoài hệ thống trước khi đặt lại mật khẩu và ghi nhận phương thức xác minh.
            </p>
          </div>

          <Input
            label="Mật khẩu mới do Quản trị viên chỉ định"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Nhập mật khẩu mới (6 - 128 ký tự)"
            helperText="Yêu cầu nhân viên đổi lại mật khẩu cá nhân sau lần đăng nhập đầu tiên"
          />

          <div className="text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Phương thức đã đối chiếu danh tính <span className="text-rose-500 font-bold">*</span>
            </label>
            <select
              value={verifiedVia}
              onChange={(e) => setVerifiedVia(e.target.value as PasswordResetVerificationMethod)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value="IN_PERSON">Đối chiếu trực tiếp tại văn phòng (IN_PERSON)</option>
              <option value="PHONE_CALLBACK">Gọi điện xác minh qua SĐT nhân viên (PHONE_CALLBACK)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetModalOpen(false)}
              disabled={resetSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={resetSubmitting}>
              Xác nhận đặt lại mật khẩu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
