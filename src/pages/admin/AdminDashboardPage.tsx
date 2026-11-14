import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Activity,
  Calendar,
  FileText,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const adminModules = [
    {
      to: '/admin/hospital-config',
      title: 'Cấu hình bệnh viện',
      desc: 'Tên, hotline, địa chỉ, logo và số ngày đặt trước',
      icon: <Settings className="w-6 h-6 text-sky-600" />,
      color: 'hover:border-sky-300',
    },
    {
      to: '/admin/specialties-rooms',
      title: 'Chuyên khoa & Phòng khám',
      desc: 'Quản lý danh mục chuyên khoa và danh sách phòng',
      icon: <Activity className="w-6 h-6 text-cyan-600" />,
      color: 'hover:border-cyan-300',
    },
    {
      to: '/admin/staff-accounts',
      title: 'Tài khoản nhân viên',
      desc: 'Tạo mới, khóa/mở khóa tài khoản và reset mật khẩu',
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      color: 'hover:border-indigo-300',
    },
    {
      to: '/admin/doctor-profiles',
      title: '62 Hồ sơ Bác sĩ',
      desc: 'Ảnh đại diện, học vị, thâm niên và chuyên môn sâu',
      icon: <Stethoscope className="w-6 h-6 text-emerald-600" />,
      color: 'hover:border-emerald-300',
    },
    {
      to: '/admin/clinic-slots',
      title: 'Lập lịch ca khám tuần',
      desc: 'Xếp lịch làm việc theo phòng và bác sĩ',
      icon: <Calendar className="w-6 h-6 text-amber-600" />,
      color: 'hover:border-amber-300',
    },
    {
      to: '/admin/purchase-requests',
      title: 'Duyệt đề xuất mua thuốc',
      desc: 'Kiểm tra và phê duyệt yêu cầu nhập hàng từ quầy Dược',
      icon: <FileText className="w-6 h-6 text-purple-600" />,
      color: 'hover:border-purple-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-sky-600" />
          Bàn làm việc Quản trị viên
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Xin chào <span className="font-semibold text-slate-800">{user?.fullName || user?.username}</span>. Chọn phân hệ nghiệp vụ để bắt đầu cấu hình và quản trị.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {adminModules.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs transition-all duration-200 hover:shadow-md ${m.color} flex flex-col justify-between group`}
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {m.icon}
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">{m.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
            </div>
            <div className="pt-4 text-xs font-semibold text-sky-600 group-hover:underline flex items-center gap-1">
              Truy cập phân hệ ➔
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
