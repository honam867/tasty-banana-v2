'use client';

import { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import PromptHints from './PromptHints';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showToolbar?: boolean;
  showHints?: boolean;
  hintType?: string;
  onClear?: () => void;
  maxLength?: number;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  autoResize?: boolean;
}

export default function PromptInput({
  value,
  onChange,
  placeholder = 'Please describe your creative ideas for the image...',
  showToolbar = true,
  showHints = true,
  hintType = 'text_to_image',
  onClear,
  maxLength = 2000,
  minHeight = '150px',
  maxHeight,
  disabled = false,
  autoResize = true,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (!autoResize) return;
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [autoResize, value]);

  const handleHintClick = (hintText: string) => {
    // Append hint to existing prompt with space
    const newValue = value ? `${value} ${hintText}` : hintText;
    onChange(newValue);
  };

  const handleClear = () => {
    onChange('');
    if (onClear) {
      onClear();
    }
    textareaRef.current?.focus();
  };

  const characterCount = value.length;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="space-y-2">
      {/* Hints Section */}
      {showHints && (
        <PromptHints
          type={hintType}
          onHintClick={handleHintClick}
          visible={showHints}
        />
      )}

      {/* Input Container */}
      <div
        className={`
          rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0
          focus-within:border-[var(--banana-gold)]/60 focus-within:shadow-[0_0_35px_rgba(255,215,0,0.12)]
          transition-all duration-300 backdrop-blur-md
        `}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-5 py-4 bg-transparent text-white text-base placeholder-white/40 outline-none ${
            autoResize ? 'resize-none' : 'resize-none overflow-y-auto'
          }`}
          style={{
            minHeight,
            ...(maxHeight ? { maxHeight } : {}),
            ...(autoResize ? {} : { overflowY: 'auto' }),
          }}
          maxLength={maxLength}
        />

        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/5 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={!value || disabled}
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Clear prompt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Character Count */}
            <span
              className={`text-xs font-medium tracking-wide ${
                isOverLimit
                  ? 'text-red-400'
                  : characterCount > maxLength * 0.9
                  ? 'text-yellow-300'
                  : 'text-white/60'
              }`}
            >
              {characterCount} / {maxLength}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
