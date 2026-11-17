import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { InternalLayout } from '../components/layout/InternalLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { HomePage } from '../pages/public/HomePage';
import { DoctorsPage } from '../pages/public/DoctorsPage';
import { BookingPage } from '../pages/public/BookingPage';
import { PatientAppointmentsPage } from '../pages/patient/PatientAppointmentsPage';
import { PatientHistoryPage } from '../pages/patient/PatientHistoryPage';
import { PatientPrescriptionsPage } from '../pages/patient/PatientPrescriptionsPage';
import { PatientProfilePage } from '../pages/patient/PatientProfilePage';
import { PatientChangePasswordPage } from '../pages/patient/PatientChangePasswordPage';
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
import { ReceptionAppointmentsPage } from '../pages/reception/ReceptionAppointmentsPage';
import { ReceptionPatientsPage } from '../pages/reception/ReceptionPatientsPage';
import { ReceptionCheckinPage } from '../pages/reception/ReceptionCheckinPage';
import { ReceptionQueuePage } from '../pages/reception/ReceptionQueuePage';
import { DoctorWorklistPage } from '../pages/doctor/DoctorWorklistPage';
import { DoctorRecordsPage } from '../pages/doctor/DoctorRecordsPage';
import { DoctorMedicinesPage } from '../pages/doctor/DoctorMedicinesPage';
import { PharmacyMedicinesPage } from '../pages/pharmacy/PharmacyMedicinesPage';
import { PharmacyDispensePage } from '../pages/pharmacy/PharmacyDispensePage';
import { PharmacyStockDocumentsPage } from '../pages/pharmacy/PharmacyStockDocumentsPage';
import { PharmacyPurchaseRequestsPage } from '../pages/pharmacy/PharmacyPurchaseRequestsPage';
import { PharmacyInventoryPage } from '../pages/pharmacy/PharmacyInventoryPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. CỔNG CÔNG KHAI DÀNH CHO BỆNH NHÂN (PUBLIC PORTAL) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/appointments"
          element={
            <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
              <PatientAppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/appointments" element={<Navigate to="/patient/appointments" replace />} />
        <Route
          path="/patient/history"
          element={
            <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
              <PatientHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/history" element={<Navigate to="/patient/history" replace />} />
        <Route path="/ehr" element={<Navigate to="/patient/history" replace />} />
        <Route
          path="/patient/prescriptions"
          element={
            <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
              <PatientPrescriptionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/prescriptions" element={<Navigate to="/patient/prescriptions" replace />} />
        <Route
          path="/patient/profile"
          element={
            <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
              <PatientProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
        <Route
          path="/patient/change-password"
          element={
            <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
              <PatientChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route path="/change-password" element={<Navigate to="/patient/change-password" replace />} />
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
        <Route path="checkin" element={<ReceptionCheckinPage />} />
        <Route path="appointments" element={<ReceptionAppointmentsPage />} />
        <Route path="patients" element={<ReceptionPatientsPage />} />
        <Route path="queue" element={<ReceptionQueuePage />} />
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
        <Route path="worklist" element={<DoctorWorklistPage />} />
        <Route path="records" element={<DoctorRecordsPage />} />
        <Route path="medicines" element={<DoctorMedicinesPage />} />
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
        <Route path="dispense" element={<PharmacyDispensePage />} />
        <Route path="medicines" element={<PharmacyMedicinesPage />} />
        <Route path="stock-documents" element={<PharmacyStockDocumentsPage />} />
        <Route path="purchase-requests" element={<PharmacyPurchaseRequestsPage />} />
        <Route path="inventory" element={<PharmacyInventoryPage />} />
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-slate-500">Trang Dược phẩm không tồn tại</div>
          }
        />
      </Route>

      {/* 7. TRANG 404 KHÔNG TÌM THẤY */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
