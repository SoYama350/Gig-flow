import React from 'react';

interface RememberMeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function RememberMeCheckbox({ checked, onChange, id = 'remember-me' }: RememberMeCheckboxProps) {
  return (
    <div className="flex items-center">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
      />
      <label htmlFor={id} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
        Remember me
      </label>
    </div>
  );
}
