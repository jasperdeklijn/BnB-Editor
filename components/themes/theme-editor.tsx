'use client'

import * as React from 'react'
import { palettes } from './palettes'
import fontPairs from './fonts'
import type { ThemeTokens } from '../../lib/themes/theme-types'

export interface ThemeEditorProps {
  value?: ThemeTokens
  onChange?: (tokens: ThemeTokens) => void
}

export function ThemeEditor({ value, onChange }: ThemeEditorProps) {
  const [tokens, setTokens] = React.useState<ThemeTokens>(value ?? palettes.default)

  React.useEffect(() => {
    if (onChange) onChange(tokens)
  }, [tokens])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Palette</label>
      <select
        value={tokens.id}
        onChange={(e) => setTokens(palettes[e.target.value] ?? palettes.default)}
        className="w-full"
      >
        {Object.values(palettes).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium">Font Pair</label>
      <select
        value={tokens.fonts?.body ?? ''}
        onChange={(e) =>
          setTokens((t) => ({ ...t, fonts: { body: e.target.value, heading: e.target.value } }))
        }
        className="w-full"
      >
        {Object.values(fontPairs).map((f) => (
          <option key={f.id} value={f.body}>
            {f.name}
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium">Radius</label>
      <input
        value={tokens.radius}
        onChange={(e) => setTokens((t) => ({ ...t, radius: e.target.value }))}
        className="w-full"
      />

      <label className="block text-sm font-medium">Spacing</label>
      <input
        value={tokens.spacing}
        onChange={(e) => setTokens((t) => ({ ...t, spacing: e.target.value }))}
        className="w-full"
      />
    </div>
  )
}

export default ThemeEditor
