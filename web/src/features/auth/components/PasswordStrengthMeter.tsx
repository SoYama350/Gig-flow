"use client";

import React, { useMemo } from 'react';
import { scorePassword } from '../validation/validators';
import { useDebounce } from '../../../shared/hooks/useDebounce';

interface PasswordStrengthMeterProps {
  password?: string;
}

export function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  // Debounce the calculation so we aren't running regex on every single keystroke
  const debouncedPassword = useDebounce(password, 300);

  const { score, label } = useMemo(() => scorePassword(debouncedPassword), [debouncedPassword]);

  const getColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  if (!debouncedPassword) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1 h-1.5 w-full">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`h-full flex-1 rounded-full transition-colors duration-300 ${
              score >= index ? getColor(score) : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-right text-gray-500 dark:text-gray-400 capitalize">
        {label}
      </p>
    </div>
  );
}
