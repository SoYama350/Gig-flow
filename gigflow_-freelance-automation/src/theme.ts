export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'gigflow_theme';

export function getInitialTheme(): Theme {
  const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
  const stored = storage?.getItem(STORAGE_KEY);

  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  if (typeof globalThis !== 'undefined' && 'matchMedia' in globalThis) {
    return globalThis.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  return 'dark';
}

export function applyThemePreference(theme: Theme) {
  if (typeof globalThis === 'undefined' || !('document' in globalThis)) return;

  const root = globalThis.document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

export function toggleThemePreference(currentTheme: Theme): Theme {
  return currentTheme === 'dark' ? 'light' : 'dark';
}
