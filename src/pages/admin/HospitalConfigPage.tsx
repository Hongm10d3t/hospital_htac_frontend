import React, { useEffect, useState } from 'react';
import {
  hospitalConfigService,
  type HospitalConfig,
  type UpsertHospitalConfigRequest,
} from '../../services/hospitalConfigService';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  Calendar,
  Clock,
  Eye,
  Globe,
  ImageIcon,
  Info,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { ApiError } from '../../services/api';

/**
 * Màn hình Quản lý Cấu hình Bệnh viện HTAC (F01.02)
 * Kết nối:
 * - GET /api/v1/public/hospital
 * - PUT /api/v1/admin/hospital-config
 */
export const HospitalConfigPage: React.FC = () => {
  const toast = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [advanceBookingDays, setAdvanceBookingDays] = useState(14);

  // Lưu trữ dữ liệu gốc để hỗ trợ hoàn tác
  const [originalConfig, setOriginalConfig] = useState<HospitalConfig | null>(null);

  const fetchConfig = async () => {
    setInitialLoading(true);
    setErrorMsg(null);
    try {
      const data = await hospitalConfigService.getHospitalConfig();
      setOriginalConfig(data);
      setName(data.name || '');
      setAddress(data.address || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setLogoUrl(data.logoUrl || '');
      setDescription(data.description || '');
      setAdvanceBookingDays(data.advanceBookingDays || 14);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Chưa có cấu hình (chưa khởi tạo) -> giữ form trống cho Admin tạo mới
        setErrorMsg('Chưa có cấu hình bệnh viện trên hệ thống. Vui lòng nhập thông tin để khởi tạo lần đầu.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Không thể tải cấu hình bệnh viện');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleReset = () => {
    if (originalConfig) {
      setName(originalConfig.name || '');
      setAddress(originalConfig.address || '');
      setPhone(originalConfig.phone || '');
      setEmail(originalConfig.email || '');
      setLogoUrl(originalConfig.logoUrl || '');
      setDescription(originalConfig.description || '');
      setAdvanceBookingDays(originalConfig.advanceBookingDays || 14);
      toast.info('Đã khôi phục dữ liệu cấu hình gốc');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation phía Client
    if (!name.trim()) {
      setErrorMsg('Tên bệnh viện / cơ sở y tế không được để trống');
      return;
    }
    if (name.trim().length > 200) {
      setErrorMsg('Tên cơ sở không được vượt quá 200 ký tự');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Địa chỉ cơ sở y tế không được để trống');
      return;
    }
    if (address.trim().length > 2000) {
      setErrorMsg('Địa chỉ không được vượt quá 2000 ký tự');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Số điện thoại hotline không được để trống');
      return;
    }
    if (phone.trim().length > 20) {
      setErrorMsg('Số điện thoại không được vượt quá 20 ký tự');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Địa chỉ email không đúng định dạng');
      return;
    }

    if (advanceBookingDays < 1) {
      setErrorMsg('Số ngày đặt trước tối đa phải là số nguyên lớn hơn hoặc bằng 1');
      return;
    }

    setSaveLoading(true);

    const payload: UpsertHospitalConfigRequest = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      logoUrl: logoUrl.trim() || null,
      description: description.trim() || null,
      advanceBookingDays: Number(advanceBookingDays),
    };

    try {
      const updated = await hospitalConfigService.updateHospitalConfig(payload);
      setOriginalConfig(updated);
      toast.success('Cập nhật cấu hình bệnh viện thành công! Dữ liệu đã được áp dụng toàn hệ thống.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message || `Lỗi cập nhật cấu hình [${err.code}]`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể lưu cấu hình cơ sở y tế');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* TIÊU ĐỀ TRANG & THANH HÀNH ĐỘNG */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-600" />
            Cấu hình Thông tin Cơ sở Bệnh viện
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị thông tin pháp nhân, hotline tiếp nhận, giới thiệu và chính sách số ngày đặt hẹn trực tuyến.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={handleReset}
            disabled={initialLoading || saveLoading}
          >
            Khôi phục
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
            isLoading={saveLoading}
            disabled={initialLoading}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1 & 2: FORM NHẬP LIỆU CẤU HÌNH */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Thông tin Hành chính &amp; Định danh</h3>
              <p className="text-xs text-slate-500">Tên cơ sở, hotline liên hệ và địa chỉ xuất hiện trên các biên nhận y tế</p>
            </div>

            {/* Tên Bệnh viện */}
            <Input
              label="Tên Bệnh viện / Cơ sở Y tế"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ví dụ: Bệnh viện Đa khoa HTAC"
              helperText="Tên chính thức hiển thị trên toàn bộ các biểu mẫu và giao diện bệnh nhân (tối đa 200 ký tự)"
            />

            {/* Hotline & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Số điện thoại / Hotline"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                leftIcon={<Phone className="w-4 h-4" />}
                placeholder="Ví dụ: 1900-8888 hoặc (024) 3888 9999"
                helperText="Đường dây nóng tiếp đón bệnh nhân"
              />

              <Input
                label="Email liên hệ chính thức"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="contact@htac.hospital.vn"
                helperText="Email nhận phản hồi và hồ sơ bảo hiểm"
              />
            </div>

            {/* Địa chỉ trụ sở */}
            <Input
              label="Địa chỉ cơ sở khám chữa bệnh"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              leftIcon={<MapPin className="w-4 h-4" />}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              helperText="Địa chỉ bệnh nhân đến khám trực tiếp (tối đa 2000 ký tự)"
            />

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-900">Chính sách Lịch khám &amp; Hình ảnh</h3>
              <p className="text-xs text-slate-500">Quy định đặt lịch trực tuyến của phân hệ M03</p>
            </div>

            {/* Số ngày đặt trước & Logo URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Số ngày tối đa được đặt hẹn trước"
                type="number"
                min={1}
                max={90}
                value={advanceBookingDays}
                onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                required
                leftIcon={<Calendar className="w-4 h-4" />}
                helperText="Khoảng thời gian bệnh nhân được chọn ngày khám trong tương lai (tính từ ngày hiện tại)"
              />

              <Input
                label="Đường dẫn Logo Bệnh viện (URL)"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                leftIcon={<ImageIcon className="w-4 h-4" />}
                placeholder="https://.../logo.png"
                helperText="URL hình ảnh HTTPS biểu trưng của bệnh viện"
              />
            </div>

            {/* Mô tả giới thiệu */}
            <div className="text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Giới thiệu bệnh viện &amp; Cơ sở vật chất
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả tóm tắt quá trình thành lập, trang thiết bị y tế và cam kết chuyên môn của bệnh viện..."
                className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Xuất hiện tại trang chủ cổng bệnh nhân (tối đa 10,000 ký tự)
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" variant="primary" isLoading={saveLoading}>
                Lưu cấu hình bệnh viện
              </Button>
            </div>
          </form>
        </div>

        {/* CỘT 3: XEM TRƯỚC TRỰC QUAN (LIVE PREVIEW) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-sm">
              <Eye className="w-4 h-4 text-sky-600" />
              Xem trước hiển thị Cổng bệnh nhân
            </div>

            {/* Thẻ Card Preview */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-slate-50/50">
              <div className="bg-gradient-to-r from-sky-700 to-cyan-700 p-4 text-white">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-10 h-10 rounded-lg object-cover bg-white p-0.5 border"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">
                      +
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm tracking-tight leading-snug">
                      {name || 'Tên Bệnh viện HTAC'}
                    </h4>
                    <span className="text-[10px] text-cyan-200 uppercase font-semibold">
                      Cơ sở y tế chất lượng cao
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{address || 'Chưa thiết lập địa chỉ cơ sở'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800">{phone || 'Chưa thiết lập hotline'}</span>
                </div>

                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-sky-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>Cho phép đặt hẹn trước: <strong>{advanceBookingDays} ngày</strong></span>
                </div>

                {description && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 italic line-clamp-3">
                    "{description}"
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Đồng bộ tức thì:
              </span>
              <p className="text-[11px] leading-relaxed text-sky-700">
                Thay đổi cấu hình tại đây sẽ cập nhật trực tiếp vào cơ sở dữ liệu và tự động phản ánh trên Header, Footer của toàn bộ trang web và kiểm tra cửa sổ đặt hẹn của phân hệ Tiếp đón &amp; Lịch khám.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
