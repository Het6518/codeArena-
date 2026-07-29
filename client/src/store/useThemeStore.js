import { create } from 'zustand';

const THEME_KEY = 'codearena_theme';

const canUseBrowserStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

const getInitialTheme = () => {
  if (!canUseBrowserStorage()) {
    return 'light';
  }

  return localStorage.getItem(THEME_KEY) || getSystemTheme();
};

const applyTheme = (theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
};

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  initializeTheme() {
    applyTheme(get().theme);
  },

  toggleTheme() {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';

    if (canUseBrowserStorage()) {
      localStorage.setItem(THEME_KEY, nextTheme);
    }

    applyTheme(nextTheme);
    set({ theme: nextTheme });
  },
}));
