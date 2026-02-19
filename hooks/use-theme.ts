import { useCallback, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'gravity_theme';

const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: ThemeMode) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}

export function initializeTheme() {
  if (typeof window === 'undefined') return;
  applyTheme(resolveInitialTheme());
}
