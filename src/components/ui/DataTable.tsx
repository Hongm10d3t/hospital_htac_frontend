import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type PageResponse } from '../../services/api';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data?: PageResponse<T> | T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  pageSize?: number;
  className?: string;
  onRowClick?: (item: T) => void;
}

/**
 * Bảng dữ liệu nghiệp vụ y tế (DataTable) chuẩn hóa HTAC
 * Tối ưu mật độ thông tin cao (High-density), hỗ trợ phân trang chuẩn PageResponse, trạng thái rỗng và tải dữ liệu.
 */
export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Không tìm thấy dữ liệu phù hợp',
  onPageChange,
  onPageSizeChange,
  currentPage = 0,
  pageSize = 10,
  className,
  onRowClick,
}: DataTableProps<T>) {
  // Chuẩn hóa dữ liệu đầu vào (hỗ trợ cả mảng tĩnh và PageResponse)
  const isPaged = data && typeof data === 'object' && 'items' in data;
  const items: T[] = isPaged ? (data as PageResponse<T>).items : Array.isArray(data) ? data : [];
  const totalPages: number = isPaged ? (data as PageResponse<T>).totalPages : 1;
  const totalItems: number = isPaged ? (data as PageResponse<T>).totalItems : items.length;
  const activePage: number = isPaged ? (data as PageResponse<T>).page : currentPage;
  const activeSize: number = isPaged ? (data as PageResponse<T>).size : pageSize;

  return (
    <div className={cn('w-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs', className)}>
      {/* Khung cuộn ngang bảo đảm responsive trên di động */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 border-collapse">
          {/* Header Bảng */}
          <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'py-3.5 px-4 select-none whitespace-nowrap',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Dữ liệu các dòng */}
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                    <span className="text-xs font-medium text-slate-500">Đang tải dữ liệu y tế...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                    <span className="text-sm font-medium text-slate-500">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id ?? idx}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'transition-colors duration-100 hover:bg-sky-50/40',
                    onRowClick && 'cursor-pointer',
                    idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3 px-4 text-slate-800 align-middle',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.render
                        ? col.render(item, idx)
                        : (item as Record<string, unknown>)[col.key] !== undefined
                          ? String((item as Record<string, unknown>)[col.key])
                          : '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Thanh phân trang dưới chân bảng */}
      {(isPaged || onPageChange) && totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị <span className="font-semibold text-slate-800">{items.length}</span> / Tổng số{' '}
              <span className="font-semibold text-slate-800">{totalItems}</span> bản ghi
            </span>

            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 ml-4">
                <span>Số dòng:</span>
                <select
                  value={activeSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-2">
              Trang <span className="font-semibold text-slate-800">{activePage + 1}</span> /{' '}
              <span className="font-semibold text-slate-800">{Math.max(1, totalPages)}</span>
            </span>

            <button
              type="button"
              disabled={activePage <= 0 || isLoading}
              onClick={() => onPageChange?.(0)}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Trang đầu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={activePage <= 0 || isLoading}
              onClick={() => onPageChange?.(activePage - 1)}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={activePage >= totalPages - 1 || isLoading}
              onClick={() => onPageChange?.(activePage + 1)}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={activePage >= totalPages - 1 || isLoading}
              onClick={() => onPageChange?.(totalPages - 1)}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Trang cuối"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
