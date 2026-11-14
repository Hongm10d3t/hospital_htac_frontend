import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { InternalLayout } from '../components/layout/InternalLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { HomePage } from '../pages/public/HomePage';
import { DoctorsPage } from '../pages/public/DoctorsPage';
import { BookingPage } from '../pages/public/BookingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { PatientRegisterPage } from '../pages/auth/PatientRegisterPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { ProfilePage } from '../pages/admin/ProfilePage';
import { HospitalConfigPage } from '../pages/admin/HospitalConfigPage';
import { SpecialtiesRoomsPage } from '../pages/admin/SpecialtiesRoomsPage';
import { StaffAccountsPage } from '../pages/admin/StaffAccountsPage';
import { DoctorProfilesPage } from '../pages/admin/DoctorProfilesPage';
import { ClinicSlotsPage } from '../pages/admin/ClinicSlotsPage';
import { PurchaseRequestsPage } from '../pages/admin/PurchaseRequestsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. CỔNG CÔNG KHAI DÀNH CHO BỆNH NHÂN (PUBLIC PORTAL) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/booking" element={<BookingPage />} />
      </Route>

      {/* 2. CỔNG XÁC THỰC: ĐĂNG NHẬP & ĐĂNG KÝ BỆNH NHÂN */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<PatientRegisterPage />} />

      {/* 3. PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN PORTAL - ROLE: ADMIN) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="hospital-config" element={<HospitalConfigPage />} />
        <Route path="specialties-rooms" element={<SpecialtiesRoomsPage />} />
        <Route path="staff-accounts" element={<StaffAccountsPage />} />
        <Route path="doctor-profiles" element={<DoctorProfilesPage />} />
        <Route path="clinic-slots" element={<ClinicSlotsPage />} />
        <Route path="purchase-requests" element={<PurchaseRequestsPage />} />
      </Route>

      {/* 4. PHÂN HỆ TIẾP ĐÓN (RECEPTIONIST PORTAL) */}
      <Route
        path="/reception"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}>
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/reception/checkin" replace />} />
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-slate-500">Phân hệ Tiếp đón bệnh nhân (F03)</div>
          }
        />
      </Route>

      {/* 5. PHÂN HỆ BÁC SĨ (DOCTOR PORTAL) */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/doctor/worklist" replace />} />
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-slate-500">Phân hệ Bác sĩ khám bệnh &amp; Kê đơn (F04)</div>
          }
        />
      </Route>

      {/* 6. PHÂN HỆ DƯỢC SĨ (PHARMACIST PORTAL) */}
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']}>
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pharmacy/dispense" replace />} />
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-slate-500">Phân hệ Dược &amp; Cấp phát thuốc (F05)</div>
          }
        />
      </Route>

      {/* 7. TRANG 404 KHÔNG TÌM THẤY */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
