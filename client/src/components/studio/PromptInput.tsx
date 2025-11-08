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
  disabled?: boolean;
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
  disabled = false,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

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
      <div className="border border-gray-700 rounded-lg bg-gray-900/50 focus-within:border-gray-600 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 bg-transparent text-white placeholder-gray-500 outline-none resize-none overflow-y-auto"
          style={{ minHeight }}
          maxLength={maxLength}
        />

        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-gray-900/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={!value || disabled}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                title="Clear prompt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Character Count */}
            <div
              className={`text-xs ${
                isOverLimit
                  ? 'text-red-400'
                  : characterCount > maxLength * 0.9
                  ? 'text-yellow-400'
                  : 'text-gray-500'
              }`}
            >
              {characterCount} / {maxLength}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
