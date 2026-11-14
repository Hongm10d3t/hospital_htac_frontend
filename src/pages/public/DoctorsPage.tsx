import React from 'react';
import { Stethoscope } from 'lucide-react';

export const DoctorsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-sky-600" />
          Danh bạ 62 Bác sĩ Bệnh viện HTAC
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tra cứu thông tin, học hàm/học vị, chuyên khoa sâu và lịch khám khả dụng của các bác sĩ.
        </p>
      </div>
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
        Sẽ được kết nối chi tiết tại Giai đoạn 2 (F02.02).
      </div>
    </div>
  );
};
