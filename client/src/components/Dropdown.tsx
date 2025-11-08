'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Reusable Dropdown Component with Portal and Smart Positioning
 * 
 * Features:
 * - Portal rendering (avoids overflow issues)
 * - Automatic position adjustment based on viewport
 * - Click outside to close
 * - Keyboard support (ESC to close)
 * - Smooth animations
 */
export default function Dropdown({
  trigger,
  children,
  align = 'left',
  isOpen,
  onClose,
}: DropdownProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current?.offsetHeight || 200;
      const dropdownWidth = dropdownRef.current?.offsetWidth || 200;

      let top = triggerRect.bottom + 8; // Default: below trigger
      let left = triggerRect.left;

      // Check if dropdown would overflow bottom of viewport
      if (top + dropdownHeight > window.innerHeight) {
        // Position above trigger instead
        top = triggerRect.top - dropdownHeight - 8;
      }

      // Adjust horizontal alignment
      if (align === 'right') {
        left = triggerRect.right - dropdownWidth;
      } else if (align === 'center') {
        left = triggerRect.left + (triggerRect.width - dropdownWidth) / 2;
      }

      // Prevent overflow on right edge
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16;
      }

      // Prevent overflow on left edge
      if (left < 16) {
        left = 16;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, align]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9999,
          }}
          className="min-w-[200px]"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div ref={triggerRef}>{trigger}</div>
      {mounted && createPortal(dropdownContent, document.body)}
    </>
  );
}
