import test from 'node:test';
import assert from 'node:assert/strict';

import { applyThemePreference, getInitialTheme } from './theme';

test('uses stored theme preference when available', () => {
  const originalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => (key === 'gigflow_theme' ? 'light' : null),
      setItem: () => undefined,
      removeItem: () => undefined,
    },
    configurable: true,
  });

  assert.equal(getInitialTheme(), 'light');
  Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
});

test('applies theme to the document root', () => {
  const originalDocument = globalThis.document;
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          if (name === 'data-theme') {
            globalThis.__themeValue = value;
          }
        },
        style: {},
      },
    },
    configurable: true,
  });

  applyThemePreference('dark');
  assert.equal(globalThis.__themeValue, 'dark');
  Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true });
  delete (globalThis as { __themeValue?: string }).__themeValue;
});
