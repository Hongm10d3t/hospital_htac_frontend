import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Calendar,
  Stethoscope,
  FileText,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BannerSlide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  actionType: 'navigate' | 'scroll' | 'tel';
  target: string;
  // Vùng hotspot của nút bấm trên ảnh (tọa độ pixel chuẩn xác trên ảnh 3168x1344)
  hotspot: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
}

export const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 1,
    image: '/background/background_1.png',
    title: 'Chăm sóc sức khỏe toàn diện & tận tâm',
    subtitle: 'Khám & điều trị nội ngoại trú với đội ngũ chuyên gia giàu kinh nghiệm',
    buttonText: 'ĐẶT LỊCH NGAY',
    actionType: 'navigate',
    target: '/booking',
    hotspot: {
      left: '6.50%',
      top: '73.59%',
      width: '16.51%',
      height: '8.71%',
    },
  },
  {
    id: 2,
    image: '/background/background_2.png',
    title: 'Đội ngũ chuyên gia giàu kinh nghiệm',
    subtitle: 'Hơn 62+ bác sĩ, chuyên gia hàng đầu, luôn hết lòng vì người bệnh',
    buttonText: 'XEM ĐỘI NGŨ',
    actionType: 'navigate',
    target: '/doctors',
    hotspot: {
      left: '11.84%',
      top: '74.48%',
      width: '12.47%',
      height: '7.59%',
    },
  },
  {
    id: 3,
    image: '/background/background_3.png',
    title: 'Trang thiết bị hiện đại, tiên tiến',
    subtitle: 'Hệ thống máy móc, công nghệ chẩn đoán và điều trị chất lượng cao',
    buttonText: 'TÌM HIỂU THÊM',
    actionType: 'scroll',
    target: '#specialties',
    hotspot: {
      left: '12.44%',
      top: '76.86%',
      width: '15.03%',
      height: '7.96%',
    },
  },
  {
    id: 4,
    image: '/background/background_4.png',
    title: 'Cấp cứu 24/7 tiếp đón nhanh chóng',
    subtitle: 'Hotline: 024 7308 6868. Quy trình tối ưu, không chờ đợi lâu',
    buttonText: 'GỌI NGAY',
    actionType: 'tel',
    target: '02473086868',
    hotspot: {
      left: '7.39%',
      top: '70.76%',
      width: '12.97%',
      height: '8.41%',
    },
  },
  {
    id: 5,
    image: '/background/background_5.png',
    title: 'Khám sức khỏe cho cả gia đình',
    subtitle: 'Các gói khám đa dạng, tầm soát bệnh lý sớm, bảo vệ tổ ấm của bạn',
    buttonText: 'NHẬN TƯ VẤN',
    actionType: 'navigate',
    target: '/booking',
    hotspot: {
      left: '9.22%',
      top: '75.97%',
      width: '14.74%',
      height: '8.71%',
    },
  },
];

export const HeroBannerSlider: React.FC = () => {
  const navigate = useNavigate();
  const { hospitalConfig: config } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Kéo thả chuột & vuốt chạm (Mouse Drag & Swipe Gesture)
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const pointerDown = useRef(false);

  const totalSlides = BANNER_SLIDES.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Tự động trượt slide sau 3 giây theo yêu cầu
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  // Xử lý hành động chuyển hướng khi click vào slide hoặc hotspot button
  const handleAction = useCallback(
    (slide: BannerSlide) => {
      if (slide.actionType === 'navigate') {
        navigate(slide.target);
      } else if (slide.actionType === 'scroll') {
        const el = document.querySelector(slide.target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          navigate('/doctors');
        }
      } else if (slide.actionType === 'tel') {
        const phone = config?.phone || slide.target;
        window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
      }
    },
    [navigate, config?.phone]
  );

  // Xử lý pointer events cho thao tác kéo chuột
  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    isDragging.current = false;
    pointerDown.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerDown.current) return;
    if (Math.abs(e.clientX - startX.current) > 10) {
      isDragging.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    const diff = e.clientX - startX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
  };

  const handlePointerCancel = () => {
    pointerDown.current = false;
    isDragging.current = false;
  };

  return (
    <div className="relative w-full overflow-hidden select-none">
      {/* 1. KHUNG SLIDER BANNER TRƯỢT (TỶ LỆ CHUẨN XÁC 3168x1344 KHÔNG CẮT XÉN) */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ aspectRatio: '3168 / 1344' }}
        className="relative w-full bg-slate-900 cursor-grab active:cursor-grabbing overflow-hidden shadow-md"
      >
        {/* Dải ảnh chuyển động (Carousel Track) */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {BANNER_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className="relative min-w-full h-full shrink-0 overflow-hidden"
            >
              {/* Ảnh nền chất lượng cao */}
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center pointer-events-none"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {/* Nút bấm trong suốt (Interactive Hotspot Button) khớp đúng 100% vị trí nút vẽ trên ảnh */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging.current) {
                    handleAction(slide);
                  }
                }}
                style={{
                  left: slide.hotspot.left,
                  top: slide.hotspot.top,
                  width: slide.hotspot.width,
                  height: slide.hotspot.height,
                }}
                className={cn(
                  'absolute z-20 rounded-full cursor-pointer transition-all duration-200',
                  'hover:scale-[1.02] active:scale-95 focus:outline-hidden',
                  'hover:ring-4 hover:ring-sky-300/80 hover:bg-sky-400/10'
                )}
                title={slide.buttonText}
                aria-label={slide.buttonText}
              />

              {/* Lớp phủ click toàn slide (nếu click ngoài nút vẫn chuyển hướng mượt) */}
              <div
                onClick={() => {
                  if (!isDragging.current) {
                    handleAction(slide);
                  }
                }}
                className="absolute inset-0 z-10 cursor-pointer"
                title={`Nhấp để mở: ${slide.title}`}
              />
            </div>
          ))}
        </div>

        {/* Nút lùi slide (Prev Button) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className={cn(
            'absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30',
            'w-10 h-10 sm:w-12 sm:h-12 rounded-full',
            'bg-white/80 hover:bg-white text-slate-800 hover:text-sky-700',
            'shadow-lg backdrop-blur-xs flex items-center justify-center',
            'transition-all duration-200 hover:scale-110 active:scale-90',
            'cursor-pointer border border-white/50'
          )}
          aria-label="Ảnh trước"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Nút tiến slide (Next Button) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className={cn(
            'absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30',
            'w-10 h-10 sm:w-12 sm:h-12 rounded-full',
            'bg-white/80 hover:bg-white text-slate-800 hover:text-sky-700',
            'shadow-lg backdrop-blur-xs flex items-center justify-center',
            'transition-all duration-200 hover:scale-110 active:scale-90',
            'cursor-pointer border border-white/50'
          )}
          aria-label="Ảnh kế tiếp"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Dải chấm chỉ báo trang (Pagination Dots) - Góc dưới phải theo phong cách Bạch Mai */}
        <div className="absolute bottom-4 sm:bottom-6 right-6 sm:right-10 z-30 flex items-center gap-2 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
          {BANNER_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={cn(
                'transition-all duration-300 rounded-full cursor-pointer',
                currentIndex === idx
                  ? 'w-7 h-2.5 bg-amber-400 shadow-xs'
                  : 'w-2.5 h-2.5 bg-white/60 hover:bg-white'
              )}
              aria-label={`Chuyển tới ảnh ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 2. THANH TIỆN ÍCH NỔI KIỂU BỆNH VIỆN BẠCH MAI (QUICK ACTION FLOATING BAR) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-30 -mt-8 sm:-mt-12">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Mục 1: Gọi tổng đài */}
          <a
            href={`tel:${(config?.phone || '024 7308 6868').replace(/\s+/g, '')}`}
            className="flex items-center gap-3.5 pt-3 sm:pt-0 group cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                Gọi tổng đài
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Đặt lịch nhanh: <span className="font-semibold text-emerald-700">{config?.phone || '024 7308 6868'}</span>
              </div>
            </div>
          </a>

          {/* Mục 2: Đặt lịch khám online */}
          <button
            type="button"
            onClick={() => navigate('/booking')}
            className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:pl-4 group cursor-pointer text-left hover:opacity-90 transition-opacity"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 group-hover:scale-105 group-hover:bg-sky-600 group-hover:text-white transition-all">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-sky-700 transition-colors">
                Đặt lịch khám
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Đặt lịch khám online tại website
              </div>
            </div>
          </button>

          {/* Mục 3: Đội ngũ chuyên gia */}
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:pl-4 group cursor-pointer text-left hover:opacity-90 transition-opacity"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-100 group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-cyan-700 transition-colors">
                Đội ngũ bác sĩ
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                62+ Giáo sư, Bác sĩ đầu ngành
              </div>
            </div>
          </button>

          {/* Mục 4: Sổ sức khỏe & Kết quả khám */}
          <button
            type="button"
            onClick={() => navigate('/patient/history')}
            className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:pl-4 group cursor-pointer text-left hover:opacity-90 transition-opacity"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-700 transition-colors">
                Kết quả khám bệnh
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Tra cứu bệnh án &amp; đơn thuốc
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
