import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  receptionPatientService,
  type PatientRecord,
  type PatientGender,
  type CreatePatientPayload,
  type UpdatePatientPayload,
} from '../../services/receptionPatientService';
import { ApiError } from '../../services/api';
import { cn } from '../../lib/utils';
import {
  Users,
  Search,
  UserPlus,
  CreditCard,
  QrCode,
  Calendar,
  MapPin,
  Edit,
  KeyRound,
  Stethoscope,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  User,
  Clock,
} from 'lucide-react';

/**
 * F03.02 — Tra cứu & Tiếp nhận Hồ sơ Bệnh nhân (Patient Directory)
 * Phân hệ Tiếp đón (Receptionist Portal)
 * Kết nối các API:
 * - GET /api/v1/reception/patients (search by code / citizenId / identity)
 * - GET /api/v1/reception/patients/{id}
 * - POST /api/v1/reception/patients (tạo hồ sơ vãng lai)
 * - PUT /api/v1/reception/patients/{id} (cập nhật hành chính)
 * - POST /api/v1/reception/patients/{id}/registration-verification (cấp mã liên kết)
 */
export const ReceptionPatientsPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Chế độ tìm kiếm: 'citizenId' (mặc định) | 'patientCode' | 'identity'
  const [searchMode, setSearchMode] = useState<'citizenId' | 'patientCode' | 'identity'>('citizenId');

  // Input tìm kiếm
  const [citizenInput, setCitizenInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [birthDateInput, setBirthDateInput] = useState<string>('');

  // Trạng thái tìm kiếm & Dữ liệu kết quả
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);

  // Sao chép mã bệnh nhân
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal Tạo mới hồ sơ bệnh nhân
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreatePatientPayload>({
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    citizenId: '',
    address: '',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Modal Chỉnh sửa hồ sơ bệnh nhân
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [editForm, setEditForm] = useState<UpdatePatientPayload>({
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    citizenId: '',
    address: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Modal Cấp mã xác minh liên kết tài khoản
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyingPatient, setVerifyingPatient] = useState<PatientRecord | null>(null);
  const [verifyCitizenId, setVerifyCitizenId] = useState<string>('');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [isSubmittingVerify, setIsSubmittingVerify] = useState<boolean>(false);

  // 1. Thao tác Tìm kiếm hồ sơ
  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (searchMode === 'citizenId') {
      const clean = citizenInput.trim();
      if (!clean) {
        toast.warning('Vui lòng nhập số CCCD / Định danh cá nhân.');
        return;
      }
      if (!/^[0-9]{12}$/.test(clean)) {
        toast.warning('Số CCCD không hợp lệ. Vui lòng nhập đúng 12 chữ số.');
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      try {
        const res = await receptionPatientService.searchByCitizenId({ citizenId: clean });
        setSearchResults(res.items);
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi tra cứu theo CCCD.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else if (searchMode === 'patientCode') {
      const clean = codeInput.trim();
      if (!clean) {
        toast.warning('Vui lòng nhập Mã hồ sơ bệnh nhân.');
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      try {
        const res = await receptionPatientService.searchByPatientCode({ patientCode: clean });
        setSearchResults(res.items);
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi tra cứu theo Mã bệnh nhân.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else if (searchMode === 'identity') {
      const name = fullNameInput.trim();
      const dob = birthDateInput.trim();
      if (!name || !dob) {
        toast.warning('Vui lòng nhập đầy đủ cả Họ tên và Ngày sinh để tra cứu.');
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      try {
        const res = await receptionPatientService.searchByIdentity({
          fullName: name,
          dateOfBirth: dob,
        });
        setSearchResults(res.items);
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi tra cứu theo Họ tên & Ngày sinh.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  }, [searchMode, citizenInput, codeInput, fullNameInput, birthDateInput, toast]);

  // 2. Mở Modal tạo mới hồ sơ bệnh nhân
  const handleOpenCreateModal = (prefillCitizen?: string, prefillName?: string) => {
    setCreateForm({
      fullName: prefillName || (searchMode === 'identity' ? fullNameInput : ''),
      dateOfBirth: searchMode === 'identity' ? birthDateInput : '',
      gender: 'MALE',
      citizenId: prefillCitizen || (searchMode === 'citizenId' ? citizenInput : ''),
      address: '',
    });
    setIsCreateModalOpen(true);
  };

  // 3. Gửi form Tạo mới hồ sơ bệnh nhân
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.fullName.trim()) {
      toast.warning('Vui lòng nhập họ và tên bệnh nhân.');
      return;
    }
    if (!createForm.dateOfBirth) {
      toast.warning('Vui lòng chọn ngày sinh.');
      return;
    }
    if (createForm.citizenId && !/^[0-9]{12}$/.test(createForm.citizenId.trim())) {
      toast.warning('Nếu nhập CCCD, vui lòng nhập chính xác 12 chữ số.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const newPatient = await receptionPatientService.createPatient({
        ...createForm,
        citizenId: createForm.citizenId?.trim() || null,
      });
      toast.success(`Tạo hồ sơ bệnh nhân thành công! Mã hồ sơ: ${newPatient.patientCode}`);
      setIsCreateModalOpen(false);
      // Đưa bệnh nhân mới vào danh sách kết quả tìm kiếm
      setSearchResults([newPatient]);
      setHasSearched(true);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'PATIENT_CITIZEN_ID_TAKEN') {
        toast.error('Số CCCD này đã tồn tại trên một hồ sơ bệnh nhân khác trong hệ thống.');
      } else {
        toast.error(err.message || 'Không thể tạo hồ sơ bệnh nhân.');
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // 4. Mở Modal Chỉnh sửa hồ sơ
  const handleOpenEditModal = (patient: PatientRecord) => {
    setEditingPatient(patient);
    setEditForm({
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      citizenId: patient.citizenId || '',
      address: patient.address || '',
    });
    setIsEditModalOpen(true);
  };

  // 5. Gửi form Cập nhật hồ sơ
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    if (!editForm.fullName.trim()) {
      toast.warning('Vui lòng nhập họ và tên bệnh nhân.');
      return;
    }
    if (!editForm.dateOfBirth) {
      toast.warning('Vui lòng chọn ngày sinh.');
      return;
    }
    if (editForm.citizenId && !/^[0-9]{12}$/.test(editForm.citizenId.trim())) {
      toast.warning('Nếu nhập CCCD, vui lòng nhập chính xác 12 chữ số.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await receptionPatientService.updatePatient(editingPatient.id, {
        ...editForm,
        citizenId: editForm.citizenId?.trim() || null,
      });
      toast.success(`Cập nhật thông tin bệnh nhân ${updated.fullName} thành công!`);
      setIsEditModalOpen(false);
      // Cập nhật lại trong danh sách
      setSearchResults((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'PATIENT_CITIZEN_ID_TAKEN') {
        toast.error('Số CCCD này đã thuộc về một hồ sơ khác trong hệ thống.');
      } else {
        toast.error(err.message || 'Không thể cập nhật hồ sơ bệnh nhân.');
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 6. Mở Modal Cấp mã xác minh liên kết tài khoản
  const handleOpenVerifyModal = (patient: PatientRecord) => {
    setVerifyingPatient(patient);
    setVerifyCitizenId(patient.citizenId || '');
    setIssuedToken(null);
    setTokenExpiresAt(null);
    setIsVerifyModalOpen(true);
  };

  // 7. Gửi yêu cầu Cấp mã xác minh liên kết
  const handleIssueVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingPatient) return;

    if (!verifyCitizenId.trim() || !/^[0-9]{12}$/.test(verifyCitizenId.trim())) {
      toast.warning('Vui lòng nhập chính xác 12 chữ số CCCD để cấp mã liên kết.');
      return;
    }

    setIsSubmittingVerify(true);
    try {
      const res = await receptionPatientService.issueVerificationToken(
        verifyingPatient.id,
        verifyCitizenId.trim()
      );
      setIssuedToken(res.verificationToken);
      setTokenExpiresAt(res.expiresAt);
      toast.success('Đã tạo mã xác minh liên kết tài khoản thành công!');
      // Cập nhật CCCD cho hồ sơ nếu trước đó chưa có
      if (!verifyingPatient.citizenId) {
        setSearchResults((prev) =>
          prev.map((p) =>
            p.id === verifyingPatient.id ? { ...p, citizenId: verifyCitizenId.trim() } : p
          )
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo mã xác minh liên kết tài khoản.');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // 8. Sao chép Mã bệnh nhân hoặc Token
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.info(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* 1. HEADER NGHIỆP VỤ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold mb-1">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>Phân hệ Tiếp đón &amp; Quản lý Thông tin Bệnh nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="w-8 h-8 text-sky-600" />
            <span>Tra Cứu &amp; Quản Lý Hồ Sơ Bệnh Nhân</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tìm kiếm hồ sơ bệnh nhân qua CCCD, Mã bệnh nhân hoặc Họ tên; mở hồ sơ vãng lai mới và cấp mã liên kết tài khoản.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => handleOpenCreateModal()}
            className="font-bold shadow-md shadow-sky-600/20"
          >
            Tạo mới Hồ sơ Bệnh nhân
          </Button>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM 3 CHẾ ĐỘ (SEARCH TOOLBAR) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        {/* CHUYỂN TAB CHẾ ĐỘ TÌM KIẾM */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setSearchMode('citizenId')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              searchMode === 'citizenId'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>1. Số CCCD / Định danh (12 số)</span>
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('patientCode')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              searchMode === 'patientCode'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            <QrCode className="w-4 h-4" />
            <span>2. Mã Hồ Sơ Bệnh Nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setSearchMode('identity')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              searchMode === 'identity'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Họ tên &amp; Ngày sinh</span>
          </button>
        </div>

        {/* FORM NHẬP LIỆU THEO CHẾ ĐỘ */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-3">
          {searchMode === 'citizenId' && (
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Nhập số Căn cước công dân gắn chip / Định danh VNeID (12 chữ số):
              </label>
              <Input
                id="search-citizen-id"
                type="text"
                maxLength={12}
                placeholder="Ví dụ: 001202001234"
                value={citizenInput}
                onChange={(e) => setCitizenInput(e.target.value.replace(/[^0-9]/g, ''))}
                leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
                autoFocus
              />
            </div>
          )}

          {searchMode === 'patientCode' && (
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Nhập Mã bệnh nhân được cấp tại bệnh viện (Patient Code):
              </label>
              <Input
                id="search-patient-code"
                type="text"
                placeholder="Ví dụ: P..."
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                leftIcon={<QrCode className="w-4 h-4 text-slate-400" />}
                autoFocus
              />
            </div>
          )}

          {searchMode === 'identity' && (
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Họ và tên bệnh nhân (*):</label>
                <Input
                  id="search-full-name"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  leftIcon={<User className="w-4 h-4 text-slate-400" />}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ngày sinh (*):</label>
                <Input
                  id="search-birth-date"
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            leftIcon={<Search className="w-4 h-4" />}
            isLoading={isSearching}
            className="w-full sm:w-auto font-bold px-6 shrink-0 shadow-xs"
          >
            Tra cứu
          </Button>
        </form>
      </div>

      {/* 3. HIỂN THỊ KẾT QUẢ TÌM KIẾM */}
      {isSearching ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <span>Đang đối chiếu dữ liệu trong cơ sở dữ liệu bệnh nhân...</span>
        </div>
      ) : !hasSearched ? (
        /* CHƯA TÌM KIẾM: HƯỚNG DẪN TRA CỨU */
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Sẵn sàng tra cứu hồ sơ bệnh nhân</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Vui lòng nhập số CCCD 12 số, quét Mã bệnh nhân hoặc nhập cặp Họ tên &amp; Ngày sinh để tìm kiếm hồ sơ y tế.
            </p>
          </div>
        </div>
      ) : searchResults.length === 0 ? (
        /* KHÔNG TÌM THẤY KẾT QUẢ */
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy hồ sơ bệnh nhân</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Hệ thống chưa ghi nhận hồ sơ y tế nào khớp với thông tin bạn vừa tra cứu. Đây có thể là người bệnh mới đến khám lần đầu.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => handleOpenCreateModal()}
              className="font-bold shadow-md shadow-sky-600/20"
            >
              Mở ngay Hồ sơ Bệnh nhân mới
            </Button>
          </div>
        </div>
      ) : (
        /* DANH SÁCH HỒ SƠ TÌM THẤY */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Tìm thấy <strong>{searchResults.length}</strong> hồ sơ y tế phù hợp:
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {searchResults.map((patient) => {
              const dob = new Date(patient.dateOfBirth);
              const age = new Date().getFullYear() - dob.getFullYear();
              const hasAccount = patient.userId !== null;

              return (
                <div
                  key={patient.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-5"
                >
                  {/* HEADER THẺ HỒ SƠ */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black text-lg shrink-0">
                        {patient.gender === 'FEMALE' ? 'Nữ' : 'Nam'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900 tracking-tight">
                            {patient.fullName}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {age} tuổi
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>Mã hồ sơ:</span>
                          <span className="font-mono font-bold text-sky-700">
                            {patient.patientCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(patient.patientCode, 'Mã bệnh nhân')}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Sao chép mã"
                          >
                            {copiedCode === patient.patientCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasAccount ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Đã liên kết tài khoản Online</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                          <span>Hồ sơ truyền thống (Chưa liên kết)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* THÔNG TIN HÀNH CHÍNH CHI TIẾT */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium">Số CCCD / Định danh:</div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {patient.citizenId || (
                          <span className="text-amber-600 font-normal italic">Chưa cập nhật CCCD</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium">Ngày sinh &amp; Giới tính:</div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {dob.toLocaleDateString('vi-VN')} •{' '}
                        {patient.gender === 'MALE' ? 'Nam' : patient.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <div className="text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Địa chỉ cư trú:</span>
                      </div>
                      <div className="text-slate-700 font-medium line-clamp-2">
                        {patient.address || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                      </div>
                    </div>
                  </div>

                  {/* THANH THAO TÁC HÀNH ĐỘNG TIẾP ĐÓN */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEditModal(patient)}
                        className="text-xs font-semibold"
                      >
                        Sửa thông tin hành chính
                      </Button>

                      {!hasAccount && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<KeyRound className="w-3.5 h-3.5 text-amber-600" />}
                          onClick={() => handleOpenVerifyModal(patient)}
                          className="text-xs font-semibold text-amber-800 border-amber-200 hover:bg-amber-50"
                        >
                          Cấp mã liên kết tài khoản
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/reception/checkin?patientId=${patient.id}`)}
                        className="text-xs font-bold bg-sky-600 hover:bg-sky-700 shadow-xs"
                      >
                        Tiếp đón &amp; Cấp số khám ngay
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: TẠO MỚI HỒ SƠ BỆNH NHÂN (CREATE PATIENT)
         ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Mới Hồ Sơ Bệnh Nhân (Vãng Lai)"
        description="Đăng ký hồ sơ y tế mới cho người bệnh đến khám trực tiếp lần đầu tại bệnh viện."
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="create-patient-fullname"
              label="Họ và tên bệnh nhân (*)"
              type="text"
              required
              placeholder="Ví dụ: Trần Thị Mai"
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            />

            <Input
              id="create-patient-dob"
              label="Ngày sinh (*)"
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={createForm.dateOfBirth}
              onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })}
            />

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Giới tính (*)</label>
              <select
                value={createForm.gender}
                onChange={(e) =>
                  setCreateForm({ ...createForm, gender: e.target.value as PatientGender })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <Input
              id="create-patient-citizenid"
              label="Số CCCD / Định danh (12 chữ số)"
              type="text"
              maxLength={12}
              placeholder="Ví dụ: 001202005678 (tùy chọn)"
              value={createForm.citizenId || ''}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  citizenId: e.target.value.replace(/[^0-9]/g, ''),
                })
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Địa chỉ nơi cư trú</label>
            <textarea
              rows={2}
              placeholder="Số nhà, đường phố, phường/xã, quận/huyện, tỉnh/thành phố..."
              value={createForm.address || ''}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmittingCreate}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingCreate}
              className="font-bold px-6 shadow-xs"
            >
              Lưu &amp; Cấp mã hồ sơ
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL 2: CHỈNH SỬA THÔNG TIN HÀNH CHÍNH (UPDATE PATIENT)
         ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Thông Tin Hành Chính Bệnh Nhân"
        description="Cập nhật họ tên, ngày sinh, giới tính hoặc số CCCD chính xác theo giấy tờ tùy thân."
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Mã hồ sơ: <strong className="font-mono text-sky-800">{editingPatient?.patientCode}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="edit-patient-fullname"
              label="Họ và tên bệnh nhân (*)"
              type="text"
              required
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            />

            <Input
              id="edit-patient-dob"
              label="Ngày sinh (*)"
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={editForm.dateOfBirth}
              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
            />

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Giới tính (*)</label>
              <select
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm({ ...editForm, gender: e.target.value as PatientGender })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <Input
              id="edit-patient-citizenid"
              label="Số CCCD / Định danh (12 chữ số)"
              type="text"
              maxLength={12}
              value={editForm.citizenId || ''}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  citizenId: e.target.value.replace(/[^0-9]/g, ''),
                })
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Địa chỉ nơi cư trú</label>
            <textarea
              rows={2}
              value={editForm.address || ''}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmittingEdit}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingEdit}
              className="font-bold px-6 shadow-xs"
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL 3: CẤP MÃ XÁC MINH LIÊN KẾT TÀI KHOẢN (REGISTRATION VERIFICATION)
         ========================================================================= */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Cấp Mã Xác Minh Liên Kết Tài Khoản"
        description="Tạo mã Token để người bệnh tự đăng ký tài khoản online và liên kết với lịch sử khám cũ."
        size="md"
      >
        <div className="space-y-4 pt-1 text-xs">
          {verifyingPatient && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div>
                Họ tên bệnh nhân: <strong>{verifyingPatient.fullName}</strong>
              </div>
              <div>
                Mã bệnh nhân: <strong className="font-mono text-sky-800">{verifyingPatient.patientCode}</strong>
              </div>
            </div>
          )}

          {!issuedToken ? (
            <form onSubmit={handleIssueVerifyToken} className="space-y-4">
              <Input
                id="verify-citizen-id"
                label="Nhập chính xác số CCCD của bệnh nhân (12 chữ số) (*)"
                type="text"
                required
                maxLength={12}
                placeholder="Ví dụ: 001202001234"
                value={verifyCitizenId}
                onChange={(e) => setVerifyCitizenId(e.target.value.replace(/[^0-9]/g, ''))}
                leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
              />

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 leading-relaxed">
                Mã xác minh này có hiệu lực trong vòng <strong>15 phút</strong>. Sau khi cấp, người bệnh vào trang đăng ký tài khoản, chọn &ldquo;Liên kết hồ sơ cũ&rdquo; và dán mã này vào.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVerifyModalOpen(false)}
                  disabled={isSubmittingVerify}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingVerify}
                  className="font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Cấp mã ngay
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="text-emerald-800 font-bold uppercase tracking-wider text-[11px]">
                  MÃ XÁC MINH LIÊN KẾT TÀI KHOẢN (TOKEN)
                </div>
                <div className="font-mono font-black text-emerald-900 text-lg break-all select-all p-2 bg-white rounded-xl border border-emerald-300">
                  {issuedToken}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Hết hạn vào:{' '}
                    <strong>
                      {tokenExpiresAt ? new Date(tokenExpiresAt).toLocaleTimeString('vi-VN') : '15 phút'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Copy className="w-4 h-4" />}
                  onClick={() => handleCopy(issuedToken, 'Mã xác minh Token')}
                  className="font-semibold"
                >
                  Sao chép mã Token
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="font-bold"
                >
                  Đã hoàn tất
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
