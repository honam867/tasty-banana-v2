'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

interface NumberOfImagesSelectorProps {
  value: number;
  onChange: (count: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function NumberOfImagesSelector({
  value,
  onChange,
  min = 1,
  max = 6,
  disabled = false,
}: NumberOfImagesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Smart positioning based on viewport
  const { position, maxHeight } = useDropdownPosition(isOpen, triggerRef, 250);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const handleSelect = (count: number) => {
    onChange(count);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 min-w-[140px]
          ${
            isOpen
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="text-sm font-medium text-white">
          {value} {value === 1 ? 'Output' : 'Outputs'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-auto
            ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}
          style={{ maxHeight }}
        >
          {options.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => handleSelect(count)}
              className={`
                w-full px-4 py-2.5 text-left text-sm transition-colors duration-150
                ${
                  count === value
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {count} {count === 1 ? 'Output' : 'Outputs'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
