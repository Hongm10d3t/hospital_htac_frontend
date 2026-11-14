import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tiện ích kết hợp class Tailwind gọn gàng và tránh xung đột class
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
