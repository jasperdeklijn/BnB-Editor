import { ThemeTokens } from '../../lib/themes/theme-types'

export const defaultTheme: ThemeTokens = {
  id: 'default',
  name: 'Default',
  colors: {
    background: '#ffffff',
    text: '#0f172a',
    primary: '#0ea5a4',
    accent: '#06b6d4',
  },
  fonts: {
    body: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    heading: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  radius: '8px',
  spacing: '1rem',
}

export const warmNeutral: ThemeTokens = {
  id: 'warm-neutral',
  name: 'Warm Neutral',
  colors: {
    background: '#fffaf5',
    text: '#1f2937',
    primary: '#b45309',
    accent: '#f97316',
  },
  fonts: defaultTheme.fonts,
  radius: '10px',
  spacing: '1.125rem',
}

export const modernBold: ThemeTokens = {
  id: 'modern-bold',
  name: 'Modern Bold',
  colors: {
    background: '#0f172a',
    text: '#e6eef8',
    primary: '#06b6d4',
    accent: '#7c3aed',
  },
  fonts: {
    body: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    heading: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  radius: '6px',
  spacing: '0.875rem',
}

export const palettes = {
  default: defaultTheme,
  'warm-neutral': warmNeutral,
  'modern-bold': modernBold,
}

export default palettes
