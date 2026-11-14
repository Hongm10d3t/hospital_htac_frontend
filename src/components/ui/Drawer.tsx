import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  closeOnOutsideClick?: boolean;
  className?: string;
}

/**
 * Ngăn kéo trượt (Slide-over Drawer) chuẩn hóa HTAC Design System
 * Trượt từ mép phải màn hình, hỗ trợ thao tác nhanh cho Bác sĩ, Tiếp đón, Quản trị mà không mất bối cảnh bảng dữ liệu.
 */
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOutsideClick = true,
  className,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses: Record<DrawerSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg sm:max-w-xl', // 480px - 576px theo DESIGN.md
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden flex justify-end"
    >
      {/* Lớp phủ Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={() => closeOnOutsideClick && onClose()}
        aria-hidden="true"
      />

      {/* Panel trượt từ bên phải */}
      <div
        className={cn(
          'relative w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col z-10 transform transition-transform animate-in slide-in-from-right duration-300 ease-out',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/70">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng ngăn kéo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung bên trong Drawer (có thể cuộn) */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700">
          {children}
        </div>

        {/* Chân ngăn kéo (Cố định ở dưới cùng) */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/90 shadow-xs">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
