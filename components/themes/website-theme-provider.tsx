'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import { resolveTheme, getDefaultThemeConfig, getGoogleFontsUrl, type ThemeConfig, type ResolvedTheme } from '@/lib/themes';

interface WebsiteThemeContextValue {
  themeConfig: ThemeConfig;
  resolvedTheme: ResolvedTheme;
  setThemeConfig: (config: ThemeConfig) => void;
  isLoading: boolean;
}

const WebsiteThemeContext = createContext<WebsiteThemeContextValue | null>(null);

interface WebsiteThemeProviderProps {
  children: ReactNode;
  initialConfig?: ThemeConfig;
  onConfigChange?: (config: ThemeConfig) => void;
}

export function WebsiteThemeProvider({ children, initialConfig, onConfigChange }: WebsiteThemeProviderProps) {
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>(initialConfig || getDefaultThemeConfig());
  const [isLoading, setIsLoading] = useState(false);

  // Resolve the theme whenever config changes
  const resolvedTheme = useMemo(() => resolveTheme(themeConfig), [themeConfig]);

  // Handle config changes
  const setThemeConfig = useCallback(
    (config: ThemeConfig) => {
      setIsLoading(true);
      setThemeConfigState(config);
      onConfigChange?.(config);
      // Small delay to allow fonts to load
      setTimeout(() => setIsLoading(false), 100);
    },
    [onConfigChange]
  );

  // Update when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setThemeConfigState(initialConfig);
    }
  }, [initialConfig]);

  // Load Google Fonts
  useEffect(() => {
    const fontUrl = getGoogleFontsUrl(resolvedTheme.fontPair);
    if (fontUrl) {
      // Check if font link already exists
      const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        link.setAttribute('data-theme-font', resolvedTheme.fontPair.id);
        document.head.appendChild(link);
      }
    }
  }, [resolvedTheme.fontPair]);

  // Apply CSS variables to document
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(resolvedTheme.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [resolvedTheme.cssVariables]);

  const value = useMemo(
    () => ({
      themeConfig,
      resolvedTheme,
      setThemeConfig,
      isLoading,
    }),
    [themeConfig, resolvedTheme, setThemeConfig, isLoading]
  );

  return <WebsiteThemeContext.Provider value={value}>{children}</WebsiteThemeContext.Provider>;
}

export function useWebsiteTheme() {
  const context = useContext(WebsiteThemeContext);
  if (!context) {
    throw new Error('useWebsiteTheme must be used within a WebsiteThemeProvider');
  }
  return context;
}

// Optional: Hook to just get resolved theme without full context
export function useResolvedTheme() {
  const context = useContext(WebsiteThemeContext);
  return context?.resolvedTheme || null;
}
