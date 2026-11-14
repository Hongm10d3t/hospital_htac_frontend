import React from 'react';
import { Calendar } from 'lucide-react';

export const BookingPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-cyan-600" />
          Đặt lịch khám trực tuyến
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quy trình 4 bước đơn giản, thuận tiện, chọn bác sĩ hoặc chuyên khoa linh hoạt.
        </p>
      </div>
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
        Sẽ được kết nối chi tiết tại Giai đoạn 2 (F02.04).
      </div>
    </div>
  );
};
