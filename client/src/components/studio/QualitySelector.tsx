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
          glass-button flex items-center justify-between gap-3 px-4 py-3 border-2 min-w-[130px]
          ${
            isOpen
              ? 'border-[var(--banana-gold)]/80 bg-[var(--banana-gold)]/20'
              : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{selectedOption.label}</span>
          {selectedOption.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--banana-gold)] text-black rounded">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-10 w-full bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg shadow-lg overflow-auto
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
                    ? 'bg-[var(--banana-gold)]/20 text-[var(--banana-gold)]'
                    : 'text-white/70 hover:bg-white/10'
                }
              `}
            >
              <span>{option.label}</span>
              {option.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--banana-gold)] text-black rounded">
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
