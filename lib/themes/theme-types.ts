export interface ColorTokens {
  background: string
  text: string
  primary: string
  accent: string
}

export interface FontTokens {
  body: string
  heading: string
}

export interface ThemeTokens {
  id?: string
  name?: string
  colors: ColorTokens
  fonts: FontTokens
  radius: string
  spacing: string
}

export interface ThemePreset {
  id: string
  name: string
  tokens: ThemeTokens
}

export default ThemeTokens
