'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { ThemeTokens } from '../lib/themes/theme-types'
import { defaultTheme } from './themes/palettes'

function applyThemeTokens(tokens: ThemeTokens) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const { colors, radius, spacing, fonts } = tokens
  // Use the same CSS variable names as `app/globals.css` so styles apply consistently
  root.style.setProperty('--background', colors.background)
  root.style.setProperty('--foreground', colors.text)
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--radius', radius)
  root.style.setProperty('--spacing', spacing)
  // Map font tokens to both theme-specific and global vars
  root.style.setProperty('--font-sans', fonts.body)
  root.style.setProperty('--font-mono', fonts.body)
  root.style.setProperty('--font-heading', fonts.heading)
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    applyThemeTokens(defaultTheme)
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
