import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tiện ích kết hợp class Tailwind gọn gàng và tránh xung đột class
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Chuẩn hóa đường dẫn ảnh đại diện bác sĩ từ URL backend hoặc static assets
 * Đảm bảo trích xuất đúng /image_doctors/... bất kể backend trả về https://localhost:5173 hay http
 */
export function resolveAvatarSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const idx = trimmed.indexOf('/image_doctors/');
  if (idx !== -1) {
    return trimmed.substring(idx);
  }
  return trimmed;
}
