'use client';

import { ReactNode } from 'react';

interface DropdownMenuProps {
  children: ReactNode;
}

interface DropdownMenuItemProps {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

/**
 * Dropdown Menu Container
 */
export function DropdownMenu({ children }: DropdownMenuProps) {
  return (
    <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden">
      {children}
    </div>
  );
}

/**
 * Dropdown Menu Header (User Info Section)
 */
export function DropdownMenuHeader({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-white/10">
      {children}
    </div>
  );
}

/**
 * Dropdown Menu Content (Items Container)
 */
export function DropdownMenuContent({ children }: { children: ReactNode }) {
  return <div className="py-1">{children}</div>;
}

/**
 * Dropdown Menu Item
 */
export function DropdownMenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center space-x-3 px-4 py-2.5 text-sm
        transition-colors
        ${
          variant === 'danger'
            ? 'text-white/80 hover:bg-red-500/10 hover:text-red-400'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
