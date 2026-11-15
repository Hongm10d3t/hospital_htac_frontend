import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HeroBannerSlider } from '../../components/home/HeroBannerSlider';
import {
  publicDoctorService,
  type DoctorPublicResponse,
} from '../../services/publicDoctorService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Calendar,
  Stethoscope,
  ShieldCheck,
  Award,
  HeartPulse,
  PhoneCall,
  ChevronRight,
  FileText,
  Pill,
  ArrowRight,
  HelpCircle,
  Activity,
  Heart,
  Eye,
  Baby,
  CheckCircle2,
} from 'lucide-react';
import { resolveAvatarSrc, cn } from '../../lib/utils';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { hospitalConfig: config } = useAuth();
  const [featuredDoctors, setFeaturedDoctors] = useState<DoctorPublicResponse[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

  // Nạp danh sách bác sĩ tiêu biểu
  useEffect(() => {
    setIsLoadingDoctors(true);
    publicDoctorService
      .listDoctors({ size: 6, sort: 'practiceStartYear,ASC' })
      .then((res) => {
        setFeaturedDoctors(res.items || []);
      })
      .catch((err) => {
        console.warn('Không thể nạp danh sách bác sĩ công khai:', err);
      })
      .finally(() => {
        setIsLoadingDoctors(false);
      });
  }, []);

  // Danh mục chuyên khoa nổi bật
  const keySpecialties = useMemo(
    () => [
      {
        id: 1,
        name: 'Tim mạch & Can thiệp',
        icon: <Heart className="w-6 h-6 text-rose-600" />,
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100',
        description: 'Tầm soát xơ vữa động mạch, siêu âm tim Doppler và điều trị tăng huyết áp chuyên sâu.',
      },
      {
        id: 2,
        name: 'Nội khoa Tổng quát',
        icon: <Activity className="w-6 h-6 text-blue-600" />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100',
        description: 'Chẩn đoán và kiểm soát các bệnh lý mãn tính, tiểu đường, gan mật và tiêu hóa.',
      },
      {
        id: 3,
        name: 'Nhi khoa & Sơ sinh',
        icon: <Baby className="w-6 h-6 text-amber-600" />,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-100',
        description: 'Khám và tư vấn phát triển thể chất, dinh dưỡng, điều trị bệnh lý đường hô hấp ở trẻ.',
      },
      {
        id: 4,
        name: 'Mắt & Nhãn khoa',
        icon: <Eye className="w-6 h-6 text-emerald-600" />,
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-100',
        description: 'Khám khúc xạ hiện đại, đo nhãn áp, điều trị các bệnh lý đục thủy tinh thể và võng mạc.',
      },
      {
        id: 5,
        name: 'Dược lâm sàng & Kê đơn',
        icon: <Pill className="w-6 h-6 text-indigo-600" />,
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-100',
        description: 'Quầy Dược bệnh viện chuẩn GPP, quản lý cấp phát thuốc điện tử tự động an toàn tuyệt đối.',
      },
      {
        id: 6,
        name: 'Hồi sức & Cấp cứu 24/7',
        icon: <HeartPulse className="w-6 h-6 text-red-600" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        description: 'Đội ngũ bác sĩ thường trực 24/24, trang thiết bị cấp cứu hồi sức đa chuyên khoa hiện đại.',
      },
    ],
    []
  );

  return (
    <div className="space-y-16 sm:space-y-20 pb-20 relative">
      {/* 1. HERO BANNER SLIDER & THANH TIỆN ÍCH THEO MẪU BỆNH VIỆN BẠCH MAI */}
      <HeroBannerSlider />

      {/* 2. STATS OVERVIEW SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="text-3xl sm:text-4xl font-black text-blue-600">62+</div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bác sĩ chuyên khoa
            </div>
            <div className="text-[11px] text-slate-500">GS, PGS, TS, BSCKII giàu y đức</div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="text-3xl sm:text-4xl font-black text-cyan-600">
              {config?.advanceBookingDays || 14} Ngày
            </div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Đặt lịch hẹn trước
            </div>
            <div className="text-[11px] text-slate-500">Chủ động lựa chọn giờ khám</div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600">100%</div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bệnh án điện tử
            </div>
            <div className="text-[11px] text-slate-500">Số hóa tra cứu kết quả tức thì</div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="text-3xl sm:text-4xl font-black text-rose-600">24/7</div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Cấp cứu đa khoa
            </div>
            <div className="text-[11px] text-slate-500">Thường trực cứu chữa kịp thời</div>
          </div>
        </div>
      </section>

      {/* 3. CHUYÊN KHOA THẾ MẠNH (SPECIALTIES SHOWCASE) */}
      <section id="specialties" className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge status="PRIMARY" variant="subtle" withDot={false}>
            Chuyên môn kỹ thuật cao
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Các chuyên khoa mũi nhọn
          </h2>
          <p className="text-sm text-slate-500">
            Trang bị máy móc hiện đại và đội ngũ chuyên gia tận tâm sẵn sàng phục vụ nhu cầu khám
            chữa bệnh của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {keySpecialties.map((spec) => (
            <div
              key={spec.id}
              className={cn(
                'p-6 rounded-2xl border transition-all duration-200 hover:shadow-md space-y-3 bg-white',
                spec.borderColor
              )}
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', spec.bgColor)}>
                {spec.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{spec.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{spec.description}</p>
              <div className="pt-2">
                <Link
                  to="/booking"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                >
                  Đặt lịch khám khoa này <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. ĐỘI NGŨ BÁC SĨ TIÊU BIỂU (FEATURED DOCTORS - SỬ DỤNG RESOLVEAVATARSRC CHUẨN XÁC) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge status="ACTIVE" variant="subtle" withDot={false}>
              Đội ngũ chuyên gia
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Bác sĩ tiêu biểu của Bệnh viện
            </h2>
            <p className="text-sm text-slate-500">
              Quy tụ 62+ Bác sĩ đầu ngành với trình độ chuyên môn cao và nhiều năm kinh nghiệm.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/doctors')}
            className="bg-white"
          >
            Xem tất cả 62 Bác sĩ
          </Button>
        </div>

        {isLoadingDoctors ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4"
              >
                <div className="w-24 h-24 rounded-full bg-slate-200 mx-auto" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDoctors.map((doc) => {
              const avatarSrc = resolveAvatarSrc(doc.avatarUrl);
              const yearsOfExp = doc.practiceStartYear
                ? new Date().getFullYear() - doc.practiceStartYear
                : null;

              return (
                <div
                  key={doc.userId}
                  className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-4 text-center">
                    {/* Ảnh bác sĩ thật - Được giải mã chuẩn xác qua resolveAvatarSrc */}
                    <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-3 border-blue-100 shadow-xs group-hover:scale-105 transition-transform duration-200 bg-slate-100">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={doc.fullName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Stethoscope className="w-10 h-10" />
                        </div>
                      )}
                    </div>

                    {/* Tên & Chức danh */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">
                        {doc.professionalTitle || 'Bác sĩ'} {doc.fullName}
                      </h3>
                      <div className="text-xs font-semibold text-blue-600">
                        {doc.specialtyName || 'Chuyên khoa'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {doc.position || 'Bác sĩ điều trị'}
                        {yearsOfExp ? ` • ${yearsOfExp} năm kinh nghiệm` : ''}
                      </div>
                    </div>

                    {/* Giới thiệu ngắn */}
                    {doc.clinicalExpertise && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        "{doc.clinicalExpertise}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs font-semibold"
                      onClick={() => navigate(`/booking?doctorId=${doc.userId}`)}
                    >
                      Đặt lịch khám
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate(`/doctors?doctorId=${doc.userId}`)}
                    >
                      Hồ sơ
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. QUY TRÌNH 4 BƯỚC KHÁM BỆNH THÔNG MINH (KÈM ẢNH MINH HỌA THẬT) */}
      <section className="bg-slate-50/90 border-y border-slate-200 py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge status="CONFIRMED" variant="subtle" withDot={false}>
              Quy trình tinh gọn
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              4 Bước khám bệnh dễ dàng tại HTAC
            </h2>
            <p className="text-sm text-slate-500">
              Không còn nỗi ám ảnh chen lấn, xếp hàng từ sáng sớm. Trải nghiệm y tế hiện đại và văn minh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Bước 1 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Đặt hẹn trực tuyến</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chủ động chọn chuyên khoa, bác sĩ và khung giờ thuận tiện nhất ngay tại nhà qua cổng website.
              </p>
              <div className="pt-2 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Không mất phí đặt chỗ</span>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-base">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Check-in 30 giây</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Xác nhận tại quầy tiếp đón qua SĐT hoặc CCCD, nhận số thứ tự tự động vào thẳng phòng khám.
              </p>
              <div className="pt-2 text-[11px] font-semibold text-cyan-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>Cấp số thứ tự tự động</span>
              </div>
            </div>

            {/* Bước 3 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Bác sĩ thăm khám</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bác sĩ chuyên khoa trực tiếp khám, xem lại lịch sử bệnh án điện tử và chỉ định phác đồ tối ưu.
              </p>
              <div className="pt-2 text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Bệnh án điện tử bảo mật</span>
              </div>
            </div>

            {/* Bước 4 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-base">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base">Nhận thuốc &amp; Tư vấn</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đơn thuốc điện tử chuyển tức thì sang Quầy Dược, nhận thuốc chuẩn GPP được kiểm soát theo hạn dùng FEFO.
              </p>
              <div className="pt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Dược phẩm chuẩn GPP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CAM KẾT CHẤT LƯỢNG Y TẾ (CORE VALUES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Chuyên môn chuẩn mực</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đội ngũ chuyên gia được đào tạo bài bản trong và ngoài nước, luôn đặt y đức và an toàn
                của bệnh nhân lên hàng đầu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Bảo mật bệnh án 100%</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ thống dữ liệu số hóa bảo mật, bệnh nhân có thể tra cứu lịch sử khám bệnh và đơn thuốc
                cá nhân mọi lúc mọi nơi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Dược phẩm chuẩn GPP</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kiểm soát lô hạn nghiêm ngặt, áp dụng tự động nguyên tắc xuất kho FEFO (hạn dùng gần nhất xuất
                trước) để đảm bảo an toàn sử dụng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HỎI ĐÁP THƯỜNG GẶP (FAQ) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge status="DEFAULT" variant="subtle" withDot={false}>
            Giải đáp thắc mắc
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Câu hỏi thường gặp
          </h2>
          <p className="text-sm text-slate-500">
            Những thông tin cần biết để quá trình thăm khám của bạn diễn ra thuận lợi nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              Đến khám cần mang theo những giấy tờ gì?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">
              Bạn vui lòng mang theo Căn cước công dân (CCCD) hoặc ứng dụng VNeID, thẻ BHYT (nếu có)
              cùng kết quả xét nghiệm, đơn thuốc cũ của các lần khám trước đó.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              Tôi có thể đặt lịch trước bao nhiêu ngày?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">
              Theo quy định của bệnh viện, bạn có thể đặt lịch hẹn trước tối đa{' '}
              <strong>{config?.advanceBookingDays || 14} ngày</strong> để chủ động sắp xếp thời gian.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              Tôi có thể hủy lịch hẹn đã đặt không?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">
              Có. Bệnh nhân có thể đăng nhập tài khoản và bấm "Hủy lịch hẹn" trước giờ khám ghi trên
              phiếu hẹn để giải phóng chỗ cho bệnh nhân khác.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              Có cần thanh toán trước khi đặt hẹn không?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">
              Không. Việc đặt lịch hẹn trực tuyến tại HTAC là hoàn toàn miễn phí. Bạn chỉ thanh toán viện phí
              sau khi đã được bác sĩ thăm khám tại bệnh viện.
            </p>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION (BOTTOM CTA BANNER) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-sky-700 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sức khỏe của bạn là ưu tiên hàng đầu của chúng tôi
            </h2>
            <p className="text-sm text-blue-100 leading-relaxed">
              Hãy để đội ngũ y bác sĩ chuyên khoa HTAC đồng hành chăm sóc sức khỏe cho bạn và gia đình.
              Đặt hẹn ngay hôm nay để nhận sự tiếp đón chu đáo nhất!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<Calendar className="w-5 h-5 text-blue-700" />}
              onClick={() => navigate('/booking')}
              className="bg-white text-blue-800 hover:bg-blue-50 font-bold shadow-md"
            >
              Đặt lịch khám ngay
            </Button>
            <a
              href={`tel:${config?.phone || '024 7308 6868'}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/40 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              Gọi cấp cứu
            </a>
          </div>
        </div>
      </section>

      {/* NÚT GỌI TỔNG ĐÀI NỔI (FLOATING CALL BUTTON) KIỂU BỆNH VIỆN BẠCH MAI */}
      <a
        href={`tel:${(config?.phone || '024 7308 6868').replace(/\s+/g, '')}`}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group cursor-pointer border-2 border-white"
        title={`Gọi tổng đài cấp cứu 24/7: ${config?.phone || '024 7308 6868'}`}
        aria-label="Gọi tổng đài cấp cứu"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30 pointer-events-none" />
        <PhoneCall className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </a>
    </div>
  );
};

export default HomePage;
