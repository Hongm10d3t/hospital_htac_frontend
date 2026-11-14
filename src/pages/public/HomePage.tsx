import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type HospitalConfig } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import {
  Calendar,
  Stethoscope,
  ShieldCheck,
  Clock,
  Award,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<HospitalConfig | null>(null);

  useEffect(() => {
    authService.getHospitalConfig().then(setConfig).catch(console.warn);
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-slate-50 border-b border-slate-200/80 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold border border-sky-200">
              <HeartPulse className="w-4 h-4 text-sky-600 animate-pulse" />
              Chăm sóc sức khỏe toàn diện &amp; Tin cậy
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {config?.name || 'Bệnh viện Đa khoa HTAC'}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              {config?.description ||
                'Hệ thống y tế kỹ thuật cao quy tụ đội ngũ hơn 62 Giáo sư, Tiến sĩ, Bác sĩ chuyên khoa đầu ngành. Chúng tôi cam kết mang lại dịch vụ khám chữa bệnh chất lượng, an toàn và tận tâm.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Calendar className="w-5 h-5" />}
                onClick={() => navigate('/booking')}
                className="shadow-lg shadow-sky-600/25"
              >
                Đặt lịch khám trực tuyến
              </Button>
              <Button
                variant="outline"
                size="lg"
                leftIcon={<Stethoscope className="w-5 h-5" />}
                onClick={() => navigate('/doctors')}
              >
                Tra cứu 62 Bác sĩ
              </Button>
            </div>
          </div>
        </div>

        {/* Nền đồ họa trang trí */}
        <div className="absolute top-1/2 right-10 -translate-y-1/2 hidden lg:block opacity-10 pointer-events-none">
          <Stethoscope className="w-96 h-96 text-sky-700" />
        </div>
      </section>

      {/* 2. STATS OVERVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-sky-600">62+</div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Bác sĩ chuyên khoa</div>
            <div className="text-[11px] text-slate-400">GS, PGS, TS, ThS đầu ngành</div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-cyan-600">
              {config?.advanceBookingDays || 14} Ngày
            </div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Đặt lịch trước</div>
            <div className="text-[11px] text-slate-400">Chủ động chọn giờ khám</div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600">100%</div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Số hóa bệnh án</div>
            <div className="text-[11px] text-slate-400">Bảo mật &amp; Minh bạch</div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-amber-600">24/7</div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Trực cấp cứu</div>
            <div className="text-[11px] text-slate-400">Phản ứng nhanh đa chuyên khoa</div>
          </div>
        </div>
      </section>

      {/* 3. CAM KẾT CHẤT LƯỢNG Y TẾ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="rounded-3xl bg-sky-900 text-white p-8 sm:p-12 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-800 text-cyan-300 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">Chuyên môn chuẩn mực</h3>
              <p className="text-xs text-sky-200 leading-relaxed">
                Đội ngũ y bác sĩ được đào tạo chuyên sâu tại các trường đại học y danh tiếng trong và ngoài nước.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-800 text-cyan-300 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">Quy trình tinh gọn</h3>
              <p className="text-xs text-sky-200 leading-relaxed">
                Cấp số thứ tự tự động, giảm thiểu tối đa thời gian chờ đợi khám và nhận thuốc tại quầy dược.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-800 text-cyan-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">Thuốc chuẩn GPP</h3>
              <p className="text-xs text-sky-200 leading-relaxed">
                Kiểm soát lô hạn nghiêm ngặt, tự động áp dụng xuất kho theo hạn dùng gần nhất (FEFO).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
