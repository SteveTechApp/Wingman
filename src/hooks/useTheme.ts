import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'light' | 'dark' | 'auto';

export const useTheme = () => {
  const [theme, setTheme] = useLocalStorage<Theme>('wingman-theme', 'auto');

  useEffect(() => {
    const root = document.documentElement;

    // Remove any existing theme attributes
    root.removeAttribute('data-theme');

    if (theme === 'auto') {
      // Let CSS media query handle it
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // We don't set data-theme, so CSS uses @media query
    } else {
      // Explicitly set theme
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  };

  const getCurrentTheme = (): 'light' | 'dark' => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    currentTheme: getCurrentTheme(),
  };
};
