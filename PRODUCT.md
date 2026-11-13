# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **ADMIN (Quản trị viên hệ thống - Trọng tâm Giai đoạn 1):** Chịu trách nhiệm cấu hình toàn bộ cơ sở y tế, quản lý tài khoản nhân viên (Bác sĩ, Dược sĩ, Tiếp đón), danh mục chuyên khoa, phòng khám, dịch vụ, phân ca làm việc, kiểm duyệt đề xuất và theo dõi báo cáo thống kê vận hành.
- **PATIENT (Bệnh nhân & Thân nhân - Trọng tâm Giai đoạn 2):** Người dân có nhu cầu chăm sóc sức khỏe; tìm kiếm thông tin bác sĩ, chuyên khoa, đặt lịch khám trực tuyến, theo dõi tiến trình lịch hẹn, tra cứu lịch sử khám bệnh, kết quả và đơn thuốc cá nhân.
- **RECEPTIONIST (Nhân viên tiếp đón):** Tiếp nhận bệnh nhân có hẹn trước hoặc đến khám trực tiếp, xác nhận thông tin định danh qua số điện thoại, cấp số thứ tự và phân phòng khám.
- **DOCTOR (Bác sĩ chuyên môn):** Xem danh sách chờ khám, lịch làm việc được phân công, ghi nhận kết quả khám, chẩn đoán, hướng xử trí, kê đơn thuốc và chỉ định tái khám.
- **PHARMACIST (Dược sĩ):** Quản lý danh mục thuốc, nhà cung cấp, lô hạn sử dụng và kho dược; cấp phát thuốc theo đơn, xử lý thuốc hoàn trả và lập đề xuất nhập hàng.

## Product Purpose

Cung cấp nền tảng số hóa quản lý thông tin bệnh viện / phòng khám (HIS) toàn diện kết hợp cổng tiện ích y tế cho bệnh nhân (Patient Portal). Hệ thống số hóa toàn bộ luồng vận hành y tế từ khâu quản trị cấu hình, tiếp đón, khám chữa bệnh, kho dược cho tới trải nghiệm chăm sóc bệnh nhân khép kín tại các cơ sở y tế tại Việt Nam.

## Positioning

Hệ thống quản lý y tế tích hợp hai chiều (Dual-sided Healthcare Platform):
- **Phía Quản trị/Nghiệp vụ (Back-office/Admin):** Đạt chuẩn quy trình vận hành phòng khám/bệnh viện nội địa, xử lý dữ liệu tập trung với hiệu suất cao, giao diện làm việc chuyên nghiệp, chuẩn mực.
- **Phía Bệnh nhân (Front-facing/Portal):** Trải nghiệm đặt khám mượt mà, minh bạch về thông tin bác sĩ và lịch trình khám, tạo dựng sự an tâm và tin cậy cho người bệnh.

## Operating Context

- Môi trường sử dụng: Trình duyệt web hiện đại trên máy tính bàn (Admin, Bác sĩ, Dược sĩ, Tiếp đón trong ca trực) và thiết bị di động (Bệnh nhân truy cập web di động để đặt hẹn).
- Tần suất: Vận hành liên tục trong giờ hành chính và ca trực y tế, đòi hỏi độ ổn định cao, phản hồi nhanh và không có độ trễ gây tắc nghẽn quầy tiếp đón/phòng khám.
- Ngôn ngữ chính: Tiếng Việt y tế chuẩn mực.

## Capabilities and Constraints

- **Phạm vi Giai đoạn 1 (ADMIN Web Interface):**
  - Quản lý tài khoản người dùng & phân quyền 5 role (Admin, Receptionist, Doctor, Pharmacist, Patient).
  - Cấu hình thông tin cơ sở y tế, danh mục chuyên khoa, danh mục phòng khám.
  - Quản lý hồ sơ bác sĩ: Thông tin cá nhân, bằng cấp/học hàm, chuyên khoa, phòng khám phụ trách, liên kết ảnh hồ sơ.
  - Lập lịch khám, phân bổ ca trực và lịch làm việc của bác sĩ theo ngày/tuần.
  - Quản lý danh mục dịch vụ khám, danh mục thuốc và vật tư y tế.
  - Báo cáo tổng quan, số liệu thống kê lượt khám, duyệt đề xuất nhập kho và kết quả dự báo.
- **Phạm vi Giai đoạn 2 (PATIENT Portal):**
  - Đăng ký, đăng nhập tài khoản bệnh nhân, quản lý hồ sơ định danh cá nhân.
  - Tra cứu thông tin bệnh viện, chuyên khoa và danh sách bác sĩ công khai kèm hình ảnh, lịch trực.
  - Đặt lịch hẹn khám bệnh trực tuyến (chọn chuyên khoa, bác sĩ, ngày giờ khám).
  - Theo dõi trạng thái lịch hẹn, tra cứu lịch sử khám bệnh, kết quả xét nghiệm và đơn thuốc điện tử.
- **Ràng buộc kỹ thuật & Dữ liệu:**
  - Frontend: React 19, TypeScript, Vite.
  - Dữ liệu bác sĩ thực tế có sẵn ảnh trong `public/image_doctors` và file mapping `doctor_image_filename_map.csv`.

## Brand Commitments

- Tên sản phẩm: HTAC HIS (`htac-frontend`).
- Giọng văn & Phong thái (Tone of Voice): Đáng tin cậy, khách quan, chuẩn xác, nhân văn và chuyên nghiệp theo tiêu chuẩn ngành y tế.

## Evidence on Hand

- Dữ liệu bác sĩ thực tế: File `doctor_image_filename_map.csv` và thư mục ảnh bác sĩ thực tế tại `public/image_doctors/`.
- Mã nguồn hiện tại: Cấu trúc dự án Vite + React 19 + TypeScript.

## Product Principles

1. **Chuẩn xác y khoa là ưu tiên số một:** Mọi cấu hình chuyên khoa, phòng khám, bác sĩ, lịch hẹn và hồ sơ bệnh nhân phải tuyệt đối minh bạch, tránh nhầm lẫn thông tin.
2. **Hiệu suất & Thao tác nhanh cho Quản trị viên (Efficiency First for Admin):** Bố cục giao diện quản trị rõ ràng, tìm kiếm - lọc tức thì, bảng dữ liệu mật độ thông tin hợp lý (data-dense) giúp xử lý nghiệp vụ nhanh gọn.
3. **Thân thiện, tin cậy và giảm âu lo cho Bệnh nhân:** Cổng bệnh nhân cần thiết kế ấm áp, cấu trúc thông tin đơn giản, chỉ dẫn rõ ràng từng bước đặt hẹn.
4. **Phân quyền và bảo mật dữ liệu nghiêm ngặt:** Đảm bảo ranh giới truy cập giữa các vai trò (Admin, Tiếp đón, Bác sĩ, Dược sĩ, Bệnh nhân).

## Accessibility & Inclusion

- Tuân thủ tiêu chuẩn tương phản màu sắc WCAG AA, phông chữ rõ ràng, dễ đọc cho người lớn tuổi.
- Hỗ trợ thao tác bàn phím thuận tiện cho nhân viên nhập liệu/quản trị viên.
