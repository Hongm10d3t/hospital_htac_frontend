import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404 - Không tìm thấy trang</h1>
      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        Trang bạn đang truy cập không tồn tại hoặc đã được chuyển sang địa chỉ khác trong hệ thống Bệnh viện HTAC.
      </p>
      <Link to="/">
        <Button variant="primary">Trở về Trang chủ</Button>
      </Link>
    </div>
  );
};
