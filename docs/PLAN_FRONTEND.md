# Kế hoạch phát triển Frontend HTAC Hospital

Ngày lập: 13/11/2026.
Áp dụng cho: `frontend_his` (React 19, TypeScript, Vite, Tailwind CSS).
Kết nối với: `backend_his` (Java 25, Spring Boot 4.1.2, MySQL 8.0, 9 modules M01–M09).

---

## 1. Nguyên tắc triển khai và nghiệm thu

1. **Tuân thủ đúng hợp đồng Backend:** Mọi request, response, tham số phân trang, bộ lọc và cấu trúc mã lỗi phải khớp 100% với backend (`API_CONVENTIONS.md` và các tài liệu API từ M01 đến M08).
2. **Quản lý phiên và bảo mật nghiêm ngặt:** Luôn gửi kèm cookie phiên `JSESSIONID` và tự động đính kèm `X-CSRF-TOKEN` cho các phương thức `POST`, `PUT`, `PATCH`, `DELETE`.
3. **Phân quyền vai trò (Role-based UI):** Hệ thống phục vụ 5 vai trò (`ADMIN`, `RECEPTIONIST`, `DOCTOR`, `PHARMACIST`, `PATIENT`). Giao diện tự động thích ứng với menu, quyền hạn và luồng làm việc tương ứng.
4. **Trọng tâm ưu tiên theo yêu cầu:**
   * **Giai đoạn 1:** Phân hệ **ADMIN** (Cấu hình, Danh mục, Tài khoản, 62 Bác sĩ, Lập ca khám theo tuần).
   * **Giai đoạn 2:** Phân hệ **PATIENT** (Cổng thông tin, Tra cứu bác sĩ, Đặt lịch khám, Lịch sử y tế).
   * **Các giai đoạn tiếp theo:** RECEPTIONIST ➔ DOCTOR ➔ PHARMACIST ➔ BÁO CÁO & DỰ BÁO.
5. **Kiểm soát mã nguồn:** Toàn bộ mã nguồn viết sạch sẽ, có kiểu dữ liệu TypeScript đầy đủ (`no any`), không tự động commit/push nếu người dùng chưa yêu cầu.

---

## 2. Tổng quan các giai đoạn phát triển

```
[F00] Nền tảng, Design System & Định tuyến
  │
  ├──► [F01] Phân hệ Quản trị (ADMIN Portal) ───► (ƯU TIÊN 1)
  │
  ├──► [F02] Cổng Bệnh nhân (PATIENT Portal) ────► (ƯU TIÊN 2)
  │
  ├──► [F03] Phân hệ Tiếp đón (RECEPTIONIST Portal)
  │
  ├──► [F04] Phân hệ Bác sĩ Khám & Kê đơn (DOCTOR Portal)
  │
  ├──► [F05] Phân hệ Dược & Kho thuốc (PHARMACIST Portal)
  │
  ├──► [F06] Báo cáo Thống kê & Dự báo ML
  │
  └──► [F07] Tích hợp E2E, Tinh chỉnh UI/UX & Đóng gói
```

---

## 3. Chi tiết các giai đoạn và gói công việc

### GIAI ĐOẠN 0: NỀN TẢNG FRONTEND & DESIGN SYSTEM (F00)

Mục tiêu: Thiết lập môi trường phát triển, thư viện giao diện, hệ thống token màu sắc, typography và cơ chế định tuyến phân quyền.

* **F00.01 — Tích hợp Tailwind CSS, Icons và Thư viện UI cơ bản**
  * Nhiệm vụ: Cài đặt Tailwind CSS v4, bộ icon `lucide-react`, thư viện tiện ích classnames (`clsx`, `tailwind-merge`).
  * Nghiệm thu: Build thành công, Tailwind CSS nhận diện đúng các biến màu sắc trong `DESIGN.md`.
* **F00.02 — Thiết lập Bộ Component Dùng chung (Core UI Primitives)**
  * Nhiệm vụ: Xây dựng các component nền tảng: `Button`, `Input`, `Select`, `Badge` (màu sắc theo enum y tế), `Modal`, `Drawer` (slide-over panel bên phải), `DataTable` (kèm phân trang `PageResponse`), `Toast` thông báo.
  * Nghiệm thu: Các component hỗ trợ đầy đủ trạng thái hover, focus, disabled, tương phản đạt chuẩn WCAG AA.
* **F00.03 — Quản lý Trạng thái Xác thực (Auth Context & Store)**
  * Nhiệm vụ: Xây dựng `AuthContext` lưu trữ thông tin tài khoản đăng nhập (`AccountResponse`), trạng thái phiên, hàm `login`, `logout`, tự động gọi `/api/v1/auth/me` khi tải trang.
  * Nghiệm thu: Kiểm tra phiên tự động, xóa thông tin khi phiên hết hạn hoặc lỗi 401.
* **F00.04 — Cấu trúc Định tuyến & Khung Layout (Routing & Shell)**
  * Nhiệm vụ: Cài đặt `react-router-dom`, cấu hình định tuyến bảo vệ (`ProtectedRoute`) theo Role; xây dựng 2 Layout:
    1. *Admin/Internal Layout:* Sidebar thu gọn/mở rộng, Topbar hiển thị tên viện & user, khu vực nội dung chính.
    2. *Patient/Public Layout:* Thanh điều hướng công khai, chân trang y tế, khu vực đặt lịch.
  * Nghiệm thu: Chuyển trang mượt mà, người dùng truy cập trái vai trò tự động chuyển hướng hoặc báo lỗi 403.

---

### GIAI ĐOẠN 1: PHÂN HỆ QUẢN TRỊ (ADMIN PORTAL - TRỌNG TÂM ƯU TIÊN) (F01)

Mục tiêu: Hoàn thiện toàn bộ các chức năng cấu hình cơ sở y tế, danh mục, quản lý 62 bác sĩ, phân ca khám và phê duyệt.

* **F01.01 — Màn hình Đăng nhập Quản trị & Trang cá nhân**
  * Kết nối API: `POST /api/v1/public/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/change-password`.
  * Nhiệm vụ: Form đăng nhập thanh lịch, xử lý lỗi xác thực chuẩn; màn hình cập nhật thông tin cá nhân và đổi mật khẩu.
  * Nghiệm thu: Đăng nhập thành công chuyển vào Dashboard Admin; sai mật khẩu hiển thị thông báo lỗi rõ ràng.
* **F01.02 — Quản lý Cấu hình Bệnh viện (Hospital Config)**
  * Kết nối API: `GET /api/v1/public/hospital-config`, `PUT /api/v1/admin/hospital-config`.
  * Nhiệm vụ: Màn hình xem và chỉnh sửa thông tin cơ sở (Tên, địa chỉ, hotline, email, logo, giới thiệu, số ngày tối đa được đặt trước `advance_booking_days`).
  * Nghiệm thu: Lưu thay đổi thành công, cập nhật tức thì dữ liệu hiển thị trên toàn hệ thống.
* **F01.03 — Quản lý Danh mục Chuyên khoa & Phòng khám (Specialties & Rooms)**
  * Kết nối API: 
    * Chuyên khoa: `GET /api/v1/admin/specialties`, `POST`, `PUT /{id}`, `PATCH /{id}/status`.
    * Phòng khám: `GET /api/v1/admin/clinic-rooms`, `POST`, `PUT /{id}`, `PATCH /{id}/status`.
  * Nhiệm vụ: Bảng dữ liệu chuyên khoa và phòng khám; lọc theo trạng thái hoạt động; Drawer thêm mới/chỉnh sửa nhanh; cảnh báo không cho sửa chuyên khoa của phòng đã phát sinh lịch sử khám.
  * Nghiệm thu: Thao tác bật/tắt trạng thái hoạt động tức thì; validate mã không trùng.
* **F01.04 — Quản lý Tài khoản Nhân viên (Staff Accounts)**
  * Kết nối API: `GET /api/v1/admin/staff-accounts`, `POST`, `PATCH /{id}`, `POST /{id}/lock`, `POST /{id}/unlock`, `POST /api/v1/admin/accounts/{id}/password-reset`.
  * Nhiệm vụ: Danh sách nhân viên (Bác sĩ, Tiếp đón, Dược sĩ); bộ lọc theo vai trò và trạng thái; tạo tài khoản mới (tạo bác sĩ yêu cầu chọn chuyên khoa); tính năng khóa/mở khóa tài khoản và reset mật khẩu.
  * Nghiệm thu: Khóa tài khoản hoạt động ngay; đổi role bị khóa khi tài khoản đã có dữ liệu (`ROLE_LOCKED`).
* **F01.05 — Quản lý Danh mục & Hồ sơ Bác sĩ (Doctor Profiles)**
  * Kết nối API: `GET /api/v1/admin/doctor-profiles`, `GET /{id}`, `PUT /{id}`.
  * Nhiệm vụ: Màn hình quản lý 62 hồ sơ bác sĩ; hiển thị ảnh đại diện từ `public/image_doctors/`; cập nhật học hàm/học vị (ThS.BS, TS.BS), chức vụ, thâm niên, giới thiệu, kỹ thuật chuyên sâu; nút gạt công khai/ẩn hồ sơ (`is_public`).
  * Nghiệm thu: Ảnh hiển thị sắc nét, đúng tỷ lệ; lưu hồ sơ cập nhật ngay vào cơ sở dữ liệu.
* **F01.06 — Lập Lịch làm việc & Phân ca khám theo tuần (Clinic Slots)**
  * Kết nối API: `GET /api/v1/admin/clinic-slots`, `POST /api/v1/admin/clinic-slots`, `POST /api/v1/admin/clinic-slots/batch`, `PATCH /{id}/close`, `PATCH /{id}/open`.
  * Nhiệm vụ: Giao diện lịch biểu trực quan (Calendar / Weekly Grid view); công cụ lập lịch hàng loạt theo tuần (chọn khoảng ngày, bác sĩ, phòng, ca sáng/chiều, thời lượng khung giờ, sức chứa); kiểm tra trực quan các ca bị trùng phòng/trùng bác sĩ; đóng/mở nhận bệnh nhân cho từng khung giờ.
  * Nghiệm thu: Ngăn chặn xếp chồng lịch ngay tại giao diện; tạo hàng loạt slot thành công.
* **F01.07 — Phê duyệt Đề xuất Nhập thuốc (Purchase Request Approval)**
  * Kết nối API: `GET /api/v1/procurement/purchase-requests`, `POST /{id}/approve`, `POST /{id}/reject`.
  * Nhiệm vụ: Danh sách đề xuất nhập thuốc từ Dược sĩ gửi lên; xem chi tiết từng dòng thuốc và số lượng cần mua; nút Duyệt (`APPROVE`) và Từ chối (`REJECT` - bắt buộc nhập lý do `reviewNote`).
  * Nghiệm thu: Chuyển trạng thái chính xác, cập nhật quyền kiểm soát mua hàng.

---

### GIAI ĐOẠN 2: PHÂN HỆ CỔNG BỆNH NHÂN (PATIENT PORTAL) (F02)

Mục tiêu: Xây dựng cổng dịch vụ công khai và cá nhân cho bệnh nhân với trải nghiệm đặt khám trực tuyến thân thiện, ấm áp và minh bạch.

* **F02.01 — Trang chủ Bệnh viện & Giới thiệu dịch vụ (Public Landing Page)**
  * Nhiệm vụ: Giới thiệu bệnh viện HTAC, các chuyên khoa thế mạnh, hotline cấp cứu/tiếp đón, banner chỉ dẫn khám bệnh, nút kêu gọi hành động "Đặt lịch khám ngay".
* **F02.02 — Danh bạ & Tra cứu Bác sĩ Công khai (Public Doctor Directory)**
  * Kết nối API: `GET /api/v1/public/doctors`, `GET /api/v1/public/doctors/{id}`.
  * Nhiệm vụ: Bộ lọc thông minh theo Chuyên khoa và từ khóa tìm kiếm; danh sách dạng thẻ card hiển thị ảnh 62 bác sĩ, học vị, chuyên khoa; trang chi tiết tiểu sử, quá trình công tác, chứng chỉ và lịch khám khả dụng.
* **F02.03 — Đăng ký / Đăng nhập Bệnh nhân & Liên kết Hồ sơ y tế**
  * Kết nối API: `POST /api/v1/public/patients/registration`, `POST /api/v1/public/auth/login`.
  * Nhiệm vụ: Form đăng ký tài khoản bệnh nhân (Họ tên, SĐT, CCCD, ngày sinh, giới tính, địa chỉ); cơ chế tự động đối chiếu CCCD để liên kết với hồ sơ khám cũ trước đó; hỗ trợ mã xác minh liên kết (`registrationToken`).
* **F02.04 — Luồng Đặt lịch khám Đa hướng (Multi-path Booking Flow)**
  * Kết nối API: `GET /api/v1/public/clinic-slots`, `POST /api/v1/appointments`.
  * Nhiệm vụ: Cho phép đặt lịch theo 2 hướng: (1) Chọn Bác sĩ ➔ Chọn ngày giờ; (2) Chọn Chuyên khoa ➔ Chọn Bác sĩ & giờ. Hiển thị số lượng chỗ còn nhận; nhập lý do khám; gửi yêu cầu tạo lịch hẹn (`PENDING`).
* **F02.05 — Quản lý Lịch hẹn & Hủy hẹn Cá nhân**
  * Kết nối API: `GET /api/v1/appointments`, `GET /{id}`, `PATCH /{id}/cancel`.
  * Nhiệm vụ: Danh sách lịch hẹn đã đặt của bệnh nhân; badge trạng thái rõ ràng (`PENDING`, `CONFIRMED`, `COMPLETED`, `NOT_COMPLETED`); hỗ trợ hủy lịch hẹn trước giờ khám kèm lý do.
* **F02.06 — Sổ sức khỏe Điện tử & Lịch sử Khám bệnh Cá nhân**
  * Kết nối API: `GET /api/v1/patients/me/profile`, `GET /api/v1/patients/me/visits`, `GET /api/v1/patients/me/visits/{id}`.
  * Nhiệm vụ: Xem dòng thời gian (Timeline) các lần đã khám tại viện; xem chi tiết chẩn đoán của bác sĩ, hướng xử trí, ngày khuyến nghị tái khám và danh sách đơn thuốc điện tử (tên thuốc, hàm lượng, liều dùng).

---

### GIAI ĐOẠN 3: PHÂN HỆ TIẾP ĐÓN BỆNH NHÂN (RECEPTIONIST PORTAL) (F03)

Mục tiêu: Tối ưu hóa tốc độ tiếp nhận bệnh nhân tại quầy tiếp đón, kiểm soát số thứ tự không trùng lặp và xác nhận lịch hẹn.

* **F03.01 — Quản lý & Xác nhận Lịch hẹn Online (Appointment Confirmation)**
  * Kết nối API: `GET /api/v1/reception/appointments`, `PATCH /{id}/confirm`, `PATCH /{id}/close`.
  * Nhiệm vụ: Danh sách lịch hẹn trực tuyến trong ngày/tuần; hiển thị SĐT tài khoản bệnh nhân; nhân viên bấm gọi xác nhận ➔ chuyển `CONFIRMED`; đóng lịch hẹn vắng mặt (`NOT_COMPLETED` kèm lý do).
* **F03.02 — Tra cứu & Tiếp nhận Hồ sơ Bệnh nhân (Patient Directory)**
  * Kết nối API: `GET /api/v1/reception/patients`, `POST`, `PUT /{id}`.
  * Nhiệm vụ: Ô tìm kiếm nhanh bệnh nhân (theo CCCD, SĐT hoặc Mã bệnh nhân); nếu bệnh nhân vãng lai chưa có hồ sơ thì mở form tạo nhanh mã bệnh nhân mới; cập nhật thông tin hành chính.
* **F03.03 — Tiếp đón Khám bệnh & Cấp Số Thứ Tự (Check-in & Queuing)**
  * Kết nối API: `POST /api/v1/reception/visits`, `GET /api/v1/reception/visits`.
  * Nhiệm vụ: Tiếp nhận bệnh nhân có hẹn trước hoặc bệnh nhân vãng lai; chọn phòng khám và bác sĩ đang trực; hệ thống tự động cấp số thứ tự (`queue_number`) duy nhất theo phòng/ngày; đẩy bệnh nhân vào trạng thái `WAITING` trên màn hình của Bác sĩ.
* **F03.04 — Bảng điều khiển Giám sát Hàng đợi Phòng khám**
  * Kết nối API: `GET /api/v1/reception/visits`, `PATCH /{id}/cancel`, `PATCH /{id}/void`.
  * Nhiệm vụ: Màn hình theo dõi tổng thể số lượng bệnh nhân đang chờ tại từng phòng khám; hỗ trợ hủy hoặc vô hiệu hóa (`VOIDED`) lượt tiếp nhận nhập nhầm.

---

### GIAI ĐOẠN 4: PHÂN HỆ BÁC SĨ KHÁM BỆNH & KÊ ĐƠN (DOCTOR PORTAL) (F04)

Mục tiêu: Xây dựng bàn làm việc chuyên môn cho Bác sĩ, tập trung ghi chép bệnh án và kê đơn thuốc an toàn, nhanh chóng.

* **F04.01 — Bàn làm việc & Danh sách Chờ khám (Doctor Worklist)**
  * Kết nối API: `GET /api/v1/doctor/visits`, `GET /api/v1/doctor/visits/{id}`.
  * Nhiệm vụ: Danh sách bệnh nhân đang đợi khám (`WAITING`) sắp xếp theo số thứ tự; xem nhanh lý do khám và lịch sử các lần khám trước của bệnh nhân; nút "Bắt đầu khám" chuyển trạng thái sang `IN_PROGRESS`.
* **F04.02 — Ghi nhận Bệnh án & Chẩn đoán Y khoa (Clinical Records)**
  * Kết nối API: `PUT /api/v1/doctor/visits/{id}/record`, `POST /api/v1/doctor/visits/{id}/complete`, `POST /{id}/abandon`.
  * Nhiệm vụ: Nhập triệu chứng, tiền sử bệnh, tiền sử dị ứng, chỉ số sinh tồn (mạch, huyết áp, nhiệt độ); chẩn đoán bệnh (mã ICD và kết luận chi tiết); phác đồ xử trí và lời dặn; chọn ngày khuyến nghị tái khám; hoàn tất ca khám (`COMPLETED`).
* **F04.03 — Kê đơn Thuốc Điện tử (E-Prescription)**
  * Kết nối API: `GET /api/v1/doctor/medicines`, `POST /api/v1/doctor/visits/{id}/prescriptions`, `PUT /api/v1/doctor/prescriptions/{id}/items`, `POST /{id}/issue`, `POST /{id}/cancel`.
  * Nhiệm vụ: Tìm kiếm thuốc theo tên hoạt chất/tên thương mại; nhập số lượng theo đơn vị cơ sở; nhập hướng dẫn sử dụng (số lần/ngày, liều lượng, uống trước/sau ăn); phát hành đơn thuốc (`ISSUED`) để chuyển sang Quầy Dược.

---

### GIAI ĐOẠN 5: PHÂN HỆ DƯỢC SĨ & KHO THUỐC (PHARMACIST PORTAL) (F05)

Mục tiêu: Quản lý toàn diện vòng đời của thuốc từ nhập kho, lưu kho theo lô - hạn dùng, kiểm kê cho đến cấp phát đơn ngoại trú.

* **F05.01 — Danh mục Thuốc, Nhà cung cấp & Lô thuốc (Catalog & Batches)**
  * Kết nối API: `GET /api/v1/pharmacy/medicines`, `POST`, `PUT`; `GET /api/v1/pharmacy/suppliers`; `GET /api/v1/pharmacy/batches`, `PATCH /{id}/block`, `PATCH /{id}/unblock`.
  * Nhiệm vụ: Bảng tra cứu danh mục thuốc, ngưỡng tồn an toàn (`minimum_stock`), thời gian chờ hàng; quản lý nhà cung cấp; quản lý số lô, hạn sử dụng và khóa lô thuốc có vấn đề (`BLOCKED`).
* **F05.02 — Bàn Cấp phát thuốc Ngoại trú (Outpatient Dispensing)**
  * Kết nối API: `GET /api/v1/pharmacy/prescriptions/pending-dispense`, `POST /{id}/dispense`, `POST /{id}/unfilled`, `POST /{id}/return`.
  * Nhiệm vụ: Danh sách đơn thuốc `ISSUED` đang chờ lấy thuốc; tự động gợi ý xuất từ lô `ACTIVE` còn hạn dùng gần nhất (FEFO) và có tồn khả dụng; ghi nhận cấp thuốc; ghi nhận phần thuốc chưa nhận kèm lý do (`STOCKOUT`, `DECLINED`,...); xử lý nhận thuốc bệnh nhân trả vào khu vực cách ly (`QUARANTINE`).
* **F05.03 — Quản lý Phiếu Kho nghiệp vụ (Stock Documents)**
  * Kết nối API: `GET /api/v1/pharmacy/stock-documents`, `POST`, `POST /{id}/post`, `POST /{id}/cancel`.
  * Nhiệm vụ: Tạo và quản lý các loại phiếu kho: Nhập kho (`RECEIPT`), Chuyển kho giữa Kho chính và Quầy phát (`TRANSFER`), Kiểm kê điều chỉnh chênh lệch (`ADJUSTMENT`), Hủy thuốc hỏng/hết hạn (`DISPOSAL`); thao tác Ghi sổ (`POSTED`) để chính thức cập nhật tồn kho.
* **F05.04 — Lập Đề xuất Mua thuốc (Purchase Requests)**
  * Kết nối API: `GET /api/v1/procurement/purchase-requests`, `POST`, `POST /{id}/submit`, `PATCH /{id}/order`, `POST /{id}/close`.
  * Nhiệm vụ: Lập đề xuất nhập hàng khi thuốc dưới ngưỡng tồn; chọn nhà cung cấp và số lượng cần mua; gửi duyệt `PENDING`; cập nhật ngày đặt hàng và theo dõi nhận hàng thực tế theo từng đợt phiếu nhập.
* **F05.05 — Báo cáo Tồn kho & Cảnh báo Y tế**
  * Kết nối API: `GET /api/v1/pharmacy/inventory/summary`, `GET /api/v1/pharmacy/inventory/batches`, `GET /api/v1/pharmacy/inventory/alerts`.
  * Nhiệm vụ: Bảng điều khiển trực quan lượng tồn kho thực tế (tách biệt tồn khả dụng và tồn cách ly); danh sách cảnh báo đỏ cho các thuốc chạm ngưỡng tối thiểu và lô thuốc sắp hết hạn (< 30 ngày).

---

### GIAI ĐOẠN 6: BÁO CÁO THỐNG KÊ & DỰ BÁO HỌC MÁY (F06)

Mục tiêu: Cung cấp số liệu vận hành đa chiều cho Quản trị viên và hỗ trợ ra quyết định thông qua mô hình dự báo.

* **F06.01 — Báo cáo Khám bệnh & Lịch hẹn (Appointments & Visits Reporting)**
  * Kết nối API: `GET /api/v1/reports/appointments`, `GET /api/v1/reports/visits`.
  * Nhiệm vụ: Biểu đồ đường và cột thể hiện biến động lượt khám theo ngày/tháng; phân loại theo Chuyên khoa và Bác sĩ; tỷ lệ bệnh nhân đặt lịch hẹn vs đến trực tiếp.
* **F06.02 — Báo cáo Dược & Chuỗi Cung ứng (Pharmacy & Stock Reporting)**
  * Kết nối API: `GET /api/v1/reports/prescriptions-dispensing`, `GET /api/v1/reports/stock-ledger`, `GET /api/v1/reports/procurement-fulfillment`.
  * Nhiệm vụ: Đối chiếu tỷ lệ lượng thuốc kê vs lượng thực cấp; báo cáo biến động xuất nhập tồn kho; tỷ lệ hoàn thành các đơn đặt hàng thuốc.
* **F06.03 — Trực quan hóa Kết quả Dự báo ML (Forecasting Visualization)**
  * Nhiệm vụ: Màn hình trực quan hóa kết quả dự báo: (1) Dự báo lượt bệnh nhân đến khám trong 1-2 tuần tới (giúp Admin chủ động mở ca khám); (2) Dự báo nhu cầu tiêu thụ từng loại thuốc (giúp Dược sĩ lập đề xuất mua hợp lý).

---

### GIAI ĐOẠN 7: KIỂM THỬ TOÀN DIỆN E2E, TINH CHỈNH UI/UX & ĐÓNG GÓI (F07)

Mục tiêu: Đảm bảo chất lượng sản phẩm chuẩn mực, hoàn thiện trải nghiệm người dùng và sẵn sàng triển khai thực tế.

* **F07.01 — Kiểm thử Khép kín Toàn bộ Luồng nghiệp vụ Liên vai trò (E2E Integration)**
  * Kịch bản: Bệnh nhân đăng ký & đặt khám ➔ Tiếp đón xác nhận & check-in cấp số ➔ Bác sĩ khám, chẩn đoán & kê đơn ➔ Dược sĩ cấp thuốc & trừ kho ➔ Bệnh nhân xem đơn thuốc trong hồ sơ ➔ Admin xem báo cáo thống kê.
* **F07.02 — Giám định & Đánh giá UI/UX với Impeccable**
  * Nhiệm vụ: Chạy audit heuristic, kiểm tra độ tương phản màu sắc y tế, kiểm tra trải nghiệm trên thiết bị di động/máy tính bảng, loại bỏ toàn bộ các lỗi UI thô ráp.
* **F07.03 — Tối ưu Hiệu năng & Đóng gói Production**
  * Nhiệm vụ: Tối ưu lazy loading (code-splitting) cho các phân hệ; kiểm tra Dockerfile và quy trình đóng gói frontend cùng backend.

---

## 4. Kế hoạch Thực hiện Trước mắt

Để bắt đầu ngay theo thứ tự ưu tiên đã chốt:
1. **Bước 1:** Thực hiện toàn bộ **Giai đoạn 0 (F00)** để thiết lập bộ UI Kit, Tailwind CSS và Routing bảo vệ theo Role.
2. **Bước 2:** Bắt tay ngay vào **Giai đoạn 1 (F01 - ADMIN Portal)**: Bắt đầu từ F01.01 (Đăng nhập), F01.02 (Cấu hình viện), F01.03 (Chuyên khoa/Phòng), F01.04 (Tài khoản nhân viên) và F01.05 (Hồ sơ 62 Bác sĩ).
