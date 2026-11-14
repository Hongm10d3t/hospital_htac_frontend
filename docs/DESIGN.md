# HTAC Hospital — Frontend Design System

Tài liệu quy chuẩn thiết kế giao diện (UI/UX Design System) cho dự án HTAC Hospital Frontend.

---

## 1. Triết lý Thiết kế & Định vị Trải nghiệm

Hệ thống HTAC phục vụ hai nhóm đối tượng với hành vi và tâm lý hoàn toàn khác nhau:

| Nhóm đối tượng | Chế độ giao diện (Mode) | Tiêu chí thiết kế trọng tâm |
| :--- | :--- | :--- |
| **Nghiệp vụ nội bộ**<br>(ADMIN, DOCTOR, RECEPTIONIST, PHARMACIST) | **OPERATE**<br>(Tối ưu thao tác & Tốc độ) | • Mật độ thông tin cao (High-density), bảng dữ liệu cô đọng.<br>• Thao tác nhanh: Ưu tiên Drawer (ngăn kéo trượt bên phải) hoặc Modal thay vì chuyển trang liên tục.<br>• Phím tắt, tìm kiếm - lọc tức thì.<br>• Màu sắc rõ ràng, không hiệu ứng rườm rà làm chậm thao tác. |
| **Khách hàng bên ngoài**<br>(PATIENT & Người dân) | **PERSUADE & SERVICE**<br>(Tin cậy & Thân thiện) | • Giao diện ấm áp, tạo cảm giác an tâm, giảm bớt lo âu y tế.<br>• Trực quan hóa danh bạ 62 bác sĩ với ảnh đại diện thực tế, học vị và chuyên môn sâu.<br>• Quy trình đặt khám đa hướng (theo Bác sĩ hoặc theo Chuyên khoa) rõ ràng từng bước (Stepper).<br>• Tối ưu hoàn hảo cho điện thoại di động (Responsive mobile-first). |

---

## 2. Hệ thống Bảng màu (Color Tokens)

Phong cách chủ đạo: **Xanh da trời y tế (Medical Sky / Cyan) & Trắng tinh khôi**.

### 2.1. Màu thương hiệu & Nền (Brand & Base)
* **Primary (Màu chủ đạo):** `#0284C7` (Sky 600) — Điểm nhấn y tế tin cậy, dùng cho Header, Menu active, Nút chính, Liên kết.
  * *Primary Hover:* `#0369A1` (Sky 700)
  * *Primary Light:* `#E0F2FE` (Sky 100 — dùng cho nền badge, thẻ chọn)
* **Secondary / Accent (Màu phụ):** `#0891B2` (Cyan 600) — Tông xanh ngọc y tế nhẹ nhàng.
* **Nền giao diện (Backgrounds):**
  * *Page Background:* `#F8FAFC` (Slate 50 — Nền xám nhạt dịu mắt, chống mỏi mắt khi nhân viên làm việc cả ngày).
  * *Surface / Card Background:* `#FFFFFF` (Trắng tinh khiết cho thẻ nội dung, bảng dữ liệu, form nhập).
  * *Sidebar Background:* `#0F172A` (Slate 900 - Dark Navy sang trọng) hoặc `#FFFFFF` (Clean White có viền ngăn cách).
* **Văn bản (Typography Colors):**
  * *Text Primary:* `#0F172A` (Slate 900 — Chữ đen sẫm sắc nét, độ tương phản cao).
  * *Text Secondary:* `#475569` (Slate 600 — Chữ phụ, mô tả).
  * *Text Muted:* `#94A3B8` (Slate 400 — Chữ gợi ý, placeholder).
  * *Borders:* `#E2E8F0` (Slate 200 — Đường kẻ mảnh tinh tế).

### 2.2. Màu Trạng thái Nghiệp vụ Y tế (Semantic Status Tokens)
Được chuẩn hóa khớp 100% với các Enum trạng thái trong Backend:

| Trạng thái Backend | Ý nghĩa nghiệp vụ | Màu sắc | Mã màu HEX |
| :--- | :--- | :--- | :--- |
| `WAITING` / `PENDING` / `DRAFT` | Chờ khám, Chờ xác nhận, Đơn nháp, Đề xuất chờ duyệt | Vàng hổ phách / Cam | Nền: `#FEF3C7` / Chữ: `#B45309` |
| `IN_PROGRESS` / `CONFIRMED` | Đang khám bệnh, Lịch hẹn đã gọi điện xác nhận | Xanh dương | Nền: `#DBEAFE` / Chữ: `#1D4ED8` |
| `COMPLETED` / `AVAILABLE` / `ACTIVE` | Khám xong, Thuốc sẵn sàng cấp, Đang hoạt động | Xanh lá dược học | Nền: `#DCFCE7` / Chữ: `#15803D` |
| `NOT_COMPLETED` / `BLOCKED` / `REJECTED` | Bỏ về giữa chừng, Khóa lô thuốc, Từ chối đề xuất | Đỏ cam cảnh báo | Nền: `#FEE2E2` / Chữ: `#B91C1C` |
| `VOIDED` / `CANCELLED` | Lượt khám nhập nhầm, Lịch hẹn bị hủy | Xám trung tính | Nền: `#F1F5F9` / Chữ: `#475569` |
| `QUARANTINE` | Thuốc cách ly (chờ kiểm tra/thuốc trả về) | Tím thẫm | Nền: `#F3E8FF` / Chữ: `#7E22CE` |

---

## 3. Hệ thống Typography & Phông chữ

* **Font Family:** Inter, Roboto hoặc hệ thống phông Sans-serif mặc định (`system-ui, -apple-system, sans-serif`) hỗ trợ tiếng Việt đầy đủ, dấu thanh rõ ràng, không bị lỗi hiển thị.
* **Phân cấp kích cỡ chữ (Type Scale):**
  * `Heading 1` (Tiêu đề trang): `24px` (`text-2xl`), font-bold (700).
  * `Heading 2` (Tiêu đề khối/phân mục): `18px` (`text-lg`), font-semibold (600).
  * `Heading 3` (Tiêu đề thẻ card/bảng): `15px` (`text-base`), font-semibold (600).
  * `Body Regular` (Văn bản chính, bảng dữ liệu): `14px` (`text-sm`), font-normal (400).
  * `Body Small` (Chú thích, badge, nhãn phụ): `12px` (`text-xs`), font-medium (500).

---

## 4. Quy chuẩn Bố cục & Component Layout

### 4.1. Khung Giao diện Nghiệp vụ Nội bộ (Internal Layout)
* **Top Header (Chiều cao 56px - 64px):**
  * Logo bệnh viện HTAC + Tên cơ sở.
  * Chỉ báo trạng thái hệ thống.
  * Menu người dùng: Tên nhân viên, Badge vai trò (ADMIN, DOCTOR,...), Đổi mật khẩu, Nút Đăng xuất.
* **Left Sidebar (Chiều rộng 240px, có thể thu gọn về 64px):**
  * Icon + Tên phân hệ nghiệp vụ theo đúng Role của người đăng nhập.
  * Tự động ẩn trên màn hình tablet/mobile thành drawer menu.
* **Khu vực Nội dung chính (Main Content Area):**
  * Thanh công cụ (Page Header): Tiêu đề, Breadcrumbs điều hướng, Bộ lọc nhanh, Nút hành động chính (Primary Action).
  * Khối dữ liệu (Data Grid / Table): Header bảng cố định, dòng sọc xen kẽ nhẹ, phân trang thanh lịch.
* **Drawer trượt (Slide-over Panel):**
  * Chiều rộng 480px - 600px trượt từ mép phải màn hình.
  * Dùng cho thao tác Thêm mới / Chỉnh sửa nhanh (ví dụ: Xem chi tiết bác sĩ, sửa thông tin phòng khám, lập ca khám) mà không làm mất bối cảnh bảng dữ liệu bên dưới.

### 4.2. Khung Cổng Bệnh nhân (Patient Portal Layout)
* **Top Navigation:** Logo, Danh sách Bác sĩ, Chuyên khoa, Đặt lịch khám, Tra cứu kết quả, Nút Đăng nhập/Tài khoản.
* **Hero Banner:** Hình ảnh cơ sở y tế hiện đại, thanh tìm kiếm nhanh (Tìm bác sĩ, tìm bệnh lý/khoa).
* **Card Grid 62 Bác sĩ:** Thẻ hiển thị avatar chuẩn tỉ lệ 1:1 hoặc 3:4, học vị (TS.BS, ThS.BS,...), chuyên khoa, số năm kinh nghiệm, nút "Đặt lịch ngay".
* **Booking Stepper:** Quy trình 4 bước trực quan:
  `1. Chọn Chuyên khoa/Bác sĩ ➔ 2. Chọn Khung giờ trống ➔ 3. Nhập thông tin & Lý do ➔ 4. Xác nhận & Nhận mã hẹn`.
