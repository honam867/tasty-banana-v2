'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

interface QualitySelectorProps {
  value: string;
  onChange: (quality: string) => void;
  disabled?: boolean;
}

const QUALITY_OPTIONS = [
  { value: 'standard', label: 'Standard', badge: undefined },
  { value: 'high-res', label: 'High-Res', badge: 'NEW' },
] as const;

export default function QualitySelector({
  value,
  onChange,
  disabled = false,
}: QualitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Smart positioning based on viewport
  const { position, maxHeight } = useDropdownPosition(isOpen, triggerRef, 150);

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

  const handleSelect = (quality: string) => {
    onChange(quality);
    setIsOpen(false);
  };

  const selectedOption = QUALITY_OPTIONS.find(opt => opt.value === value) || QUALITY_OPTIONS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 min-w-[130px]
          ${
            isOpen
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{selectedOption.label}</span>
          {selectedOption.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-black rounded">
              {selectedOption.badge}
            </span>
          )}
        </div>
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
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-4 py-2.5 text-left text-sm transition-colors duration-150 flex items-center justify-between
                ${
                  option.value === value
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              <span>{option.label}</span>
              {option.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-black rounded">
                  {option.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
