import React from 'react';
import { cn } from '../../lib/utils';

export type MedicalStatusType =
  | 'WAITING'
  | 'PENDING'
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'OPEN'
  | 'CLOSED'
  | 'NOT_COMPLETED'
  | 'BLOCKED'
  | 'REJECTED'
  | 'VOIDED'
  | 'CANCELLED'
  | 'QUARANTINE'
  | 'DEFAULT'
  | 'PRIMARY';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: MedicalStatusType;
  variant?: 'solid' | 'subtle' | 'outline';
  withDot?: boolean;
}

/**
 * Bản đồ nhãn tiếng Việt chuẩn hóa cho các mã trạng thái Backend
 */
export const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Chờ khám',
  PENDING: 'Chờ xác nhận',
  DRAFT: 'Bản nháp',
  IN_PROGRESS: 'Đang thực hiện',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  AVAILABLE: 'Khả dụng',
  ACTIVE: 'Đang hoạt động',
  OPEN: 'Đang mở (Nhận hẹn)',
  CLOSED: 'Đã đóng',
  NOT_COMPLETED: 'Không đến khám',
  BLOCKED: 'Đã khóa',
  REJECTED: 'Từ chối',
  VOIDED: 'Đã hủy bỏ',
  CANCELLED: 'Đã hủy',
  QUARANTINE: 'Thuốc cách ly',
};

/**
 * Huy hiệu trạng thái nghiệp vụ y tế HTAC
 * Chuẩn màu sắc 100% khớp với DESIGN.md và các enum nghiệp vụ Backend
 */
export const Badge: React.FC<BadgeProps> = ({
  className,
  status = 'DEFAULT',
  variant = 'subtle',
  withDot = true,
  children,
  ...props
}) => {
  // Phân loại nhóm màu theo Enum backend
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (status) {
    case 'WAITING':
    case 'PENDING':
    case 'DRAFT':
      // Vàng hổ phách / Cam y tế
      colorStyles =
        variant === 'solid'
          ? 'bg-amber-600 text-white'
          : variant === 'outline'
            ? 'border-amber-300 text-amber-800 bg-transparent'
            : 'bg-amber-50 text-amber-800 border-amber-200';
      dotColor = 'bg-amber-500';
      break;

    case 'IN_PROGRESS':
    case 'CONFIRMED':
      // Xanh dương tiến độ
      colorStyles =
        variant === 'solid'
          ? 'bg-blue-600 text-white'
          : variant === 'outline'
            ? 'border-blue-300 text-blue-800 bg-transparent'
            : 'bg-blue-50 text-blue-800 border-blue-200';
      dotColor = 'bg-blue-500';
      break;

    case 'COMPLETED':
    case 'AVAILABLE':
    case 'ACTIVE':
    case 'OPEN':
      // Xanh lá dược học / an toàn
      colorStyles =
        variant === 'solid'
          ? 'bg-emerald-600 text-white'
          : variant === 'outline'
            ? 'border-emerald-300 text-emerald-800 bg-transparent'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-500';
      break;

    case 'CLOSED':
      // Xám trầm / đã đóng
      colorStyles =
        variant === 'solid'
          ? 'bg-slate-500 text-white'
          : variant === 'outline'
            ? 'border-slate-300 text-slate-700 bg-transparent'
            : 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
      break;

    case 'NOT_COMPLETED':
    case 'BLOCKED':
    case 'REJECTED':
      // Đỏ cảnh báo / từ chối
      colorStyles =
        variant === 'solid'
          ? 'bg-rose-600 text-white'
          : variant === 'outline'
            ? 'border-rose-300 text-rose-800 bg-transparent'
            : 'bg-rose-50 text-rose-800 border-rose-200';
      dotColor = 'bg-rose-500';
      break;

    case 'VOIDED':
    case 'CANCELLED':
      // Xám trung tính
      colorStyles =
        variant === 'solid'
          ? 'bg-slate-600 text-white'
          : variant === 'outline'
            ? 'border-slate-300 text-slate-700 bg-transparent'
            : 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
      break;

    case 'QUARANTINE':
      // Tím thẫm cách ly
      colorStyles =
        variant === 'solid'
          ? 'bg-purple-600 text-white'
          : variant === 'outline'
            ? 'border-purple-300 text-purple-800 bg-transparent'
            : 'bg-purple-50 text-purple-800 border-purple-200';
      dotColor = 'bg-purple-500';
      break;

    case 'PRIMARY':
      // Xanh sky thương hiệu
      colorStyles =
        variant === 'solid'
          ? 'bg-sky-600 text-white'
          : variant === 'outline'
            ? 'border-sky-300 text-sky-800 bg-transparent'
            : 'bg-sky-50 text-sky-800 border-sky-200';
      dotColor = 'bg-sky-500';
      break;

    default:
      colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
  }

  const displayText = children || STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none tracking-wide',
        colorStyles,
        className
      )}
      {...props}
    >
      {withDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} aria-hidden="true" />
      )}
      <span>{displayText}</span>
    </span>
  );
};
