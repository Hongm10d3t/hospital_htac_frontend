/**
 * Tiện ích xử lý ngày tháng và múi giờ Việt Nam (UTC+7) cho hệ thống Bệnh viện HTAC
 */

/**
 * Lấy Thứ Hai đầu tuần của một ngày bất kỳ (theo giờ địa phương)
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 là Chủ nhật, 1 là Thứ 2, ..., 6 là Thứ 7
  // Nếu là Chủ nhật (0), chuyển thành lùi 6 ngày để lấy Thứ Hai trước đó
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Lấy mảng 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật
 */
export function getWeekDates(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

/**
 * Định dạng ngày dạng chuỗi ISO YYYY-MM-DD
 */
export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Định dạng ngày hiển thị tiếng Việt (VD: 17/11/2026)
 */
export function formatDateVn(dateOrIso: Date | string): string {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng giờ phút hiển thị tiếng Việt (VD: 08:30)
 */
export function formatTimeVn(dateOrIso: Date | string): string {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Lấy thứ trong tuần tiếng Việt
 */
export function getDayOfWeekNameVn(date: Date): string {
  const day = date.getDay();
  switch (day) {
    case 1:
      return 'Thứ Hai';
    case 2:
      return 'Thứ Ba';
    case 3:
      return 'Thứ Tư';
    case 4:
      return 'Thứ Năm';
    case 5:
      return 'Thứ Sáu';
    case 6:
      return 'Thứ Bảy';
    case 0:
      return 'Chủ Nhật';
    default:
      return '';
  }
}

/**
 * Tạo chuỗi ISO có Offset +07:00 từ Date hoặc ngày + giờ
 * Ví dụ: "2026-11-17T08:00:00+07:00"
 */
export function toVietnamOffsetIso(dateStr: string, timeStr: string): string {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:mm"
  return `${dateStr}T${timeStr}:00+07:00`;
}

/**
 * Chuyển Date thành ISO String đầu ngày hoặc cuối ngày với Offset +07:00
 */
export function toStartOfDayIso(date: Date): string {
  return `${formatDateIso(date)}T00:00:00+07:00`;
}

export function toEndOfDayIso(date: Date): string {
  return `${formatDateIso(date)}T23:59:59+07:00`;
}
