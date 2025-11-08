import { useEffect, useState, RefObject } from 'react';

interface DropdownPosition {
  position: 'top' | 'bottom';
  maxHeight?: string;
}

/**
 * Smart dropdown positioning hook
 * Detects viewport boundaries and positions dropdown above/below trigger
 * 
 * @param isOpen - Whether dropdown is open
 * @param triggerRef - Ref to the trigger button element
 * @param dropdownHeight - Expected dropdown height (default: 250px)
 * @returns Position object with 'top' or 'bottom' and optional maxHeight
 */
export function useDropdownPosition(
  isOpen: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  dropdownHeight: number = 250
): DropdownPosition {
  const [position, setPosition] = useState<DropdownPosition>({
    position: 'bottom',
  });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const calculatePosition = () => {
      if (!triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate available space above and below
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      
      // Add padding for safety (20px)
      const padding = 20;
      const requiredSpace = dropdownHeight + padding;

      // Determine position based on available space
      if (spaceBelow >= requiredSpace) {
        // Enough space below - show dropdown below trigger
        setPosition({ position: 'bottom' });
      } else if (spaceAbove >= requiredSpace) {
        // Not enough space below but enough above - show dropdown above trigger
        setPosition({ position: 'top' });
      } else {
        // Not enough space either way - use larger space with maxHeight
        if (spaceBelow > spaceAbove) {
          setPosition({
            position: 'bottom',
            maxHeight: `${spaceBelow - padding}px`,
          });
        } else {
          setPosition({
            position: 'top',
            maxHeight: `${spaceAbove - padding}px`,
          });
        }
      }
    };

    // Calculate position when dropdown opens
    calculatePosition();

    // Recalculate on scroll or resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, triggerRef, dropdownHeight]);

  return position;
}
