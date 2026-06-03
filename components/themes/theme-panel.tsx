'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Palette, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  COLOR_PALETTES,
  FONT_PAIRS,
  THEME_PRESETS,
  SPACING_VALUES,
  RADIUS_VALUES,
  getPresetsForCategory,
  type ThemeConfig,
  type ThemeSpacing,
  type ThemeRadius,
  type ThemePalette,
} from '@/lib/themes';

interface ThemePanelProps {
  websiteId: string | null;
  businessCategory?: string;
  currentTheme?: ThemeConfig | null;
  onThemeChange?: (config: ThemeConfig) => void;
  className?: string;
}

const DEFAULT_THEME: ThemeConfig = {
  paletteId: 'slate-modern',
  fontPairId: 'inter-system',
  spacing: 'comfortable',
  radius: 'medium',
};

export function ThemePanel({
  websiteId,
  businessCategory,
  currentTheme,
  onThemeChange,
  className,
}: ThemePanelProps) {
  const [theme, setTheme] = useState<ThemeConfig>(currentTheme || DEFAULT_THEME);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('presets');

  // Sync with external theme changes
  useEffect(() => {
    if (currentTheme) {
      setTheme(currentTheme);
    }
  }, [currentTheme]);

  const handleThemeChange = useCallback(
    async (newTheme: ThemeConfig) => {
      setTheme(newTheme);
      onThemeChange?.(newTheme);

      // Auto-save to database
      if (websiteId) {
        setIsSaving(true);
        try {
          const response = await fetch('/api/themes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ websiteId, themeConfig: newTheme }),
          });

          if (!response.ok) {
            throw new Error('Failed to save theme');
          }

          toast.success('Thema opgeslagen', {
            position: 'bottom-right',
            duration: 2000,
          });
        } catch {
          toast.error('Kon thema niet opslaan', {
            position: 'bottom-right',
          });
        } finally {
          setIsSaving(false);
        }
      }
    },
    [websiteId, onThemeChange]
  );

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = THEME_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        handleThemeChange({
          paletteId: preset.paletteId,
          fontPairId: preset.fontPairId,
          spacing: preset.spacing,
          radius: preset.radius,
        });
      }
    },
    [handleThemeChange]
  );

  const handlePaletteChange = useCallback(
    (paletteId: string) => {
      handleThemeChange({ ...theme, paletteId });
    },
    [theme, handleThemeChange]
  );

  const handleFontChange = useCallback(
    (fontPairId: string) => {
      handleThemeChange({ ...theme, fontPairId });
    },
    [theme, handleThemeChange]
  );

  const handleSpacingChange = useCallback(
    (spacing: ThemeSpacing) => {
      handleThemeChange({ ...theme, spacing });
    },
    [theme, handleThemeChange]
  );

  const handleRadiusChange = useCallback(
    (radius: ThemeRadius) => {
      handleThemeChange({ ...theme, radius });
    },
    [theme, handleThemeChange]
  );

  // Get recommended presets for business category
  const recommendedPresets = businessCategory
    ? getPresetsForCategory(businessCategory)
    : THEME_PRESETS.slice(0, 6);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Website Thema</span>
        </div>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="presets" className="text-xs">
            Presets
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs">
            Kleuren
          </TabsTrigger>
          <TabsTrigger value="fonts" className="text-xs">
            Fonts
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 p-4">
          <TabsContent value="presets" className="h-full mt-0">
            <ScrollArea className="h-full">
              {businessCategory && recommendedPresets.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <Label className="text-xs text-muted-foreground">Aanbevolen voor jouw bedrijf</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {recommendedPresets.slice(0, 4).map((preset) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        isSelected={isPresetMatch(theme, preset)}
                        onSelect={() => handlePresetSelect(preset.id)}
                      />
                    ))}
                  </div>
                  <div className="border-b my-4" />
                </div>
              )}

              <Label className="text-xs text-muted-foreground mb-3 block">Alle thema&apos;s</Label>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={isPresetMatch(theme, preset)}
                    onSelect={() => handlePresetSelect(preset.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="colors" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PALETTES.map((palette) => (
                  <PaletteCard
                    key={palette.id}
                    palette={palette}
                    isSelected={theme.paletteId === palette.id}
                    onSelect={() => handlePaletteChange(palette.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="fonts" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {FONT_PAIRS.map((fontPair) => (
                  <FontCard
                    key={fontPair.id}
                    fontPair={fontPair}
                    isSelected={theme.fontPairId === fontPair.id}
                    onSelect={() => handleFontChange(fontPair.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {/* Layout Controls (always visible at bottom) */}
      <div className="border-t p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Afstand</Label>
          <div className="flex gap-1">
            {(['compact', 'comfortable', 'spacious'] as ThemeSpacing[]).map((s) => (
              <Button
                key={s}
                variant={theme.spacing === s ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleSpacingChange(s)}
              >
                {s === 'compact' ? 'Compact' : s === 'comfortable' ? 'Comfortabel' : 'Ruim'}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Hoeken</Label>
          <div className="flex gap-1">
            {(['none', 'small', 'medium', 'large'] as ThemeRadius[]).map((r) => (
              <Button
                key={r}
                variant={theme.radius === r ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs px-2"
                onClick={() => handleRadiusChange(r)}
              >
                <div
                  className="w-4 h-4 border-2 border-current"
                  style={{ borderRadius: RADIUS_VALUES[r] }}
                />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to check if current theme matches a preset
function isPresetMatch(
  theme: ThemeConfig,
  preset: { paletteId: string; fontPairId: string; spacing: ThemeSpacing; radius: ThemeRadius }
) {
  return (
    theme.paletteId === preset.paletteId &&
    theme.fontPairId === preset.fontPairId &&
    theme.spacing === preset.spacing &&
    theme.radius === preset.radius
  );
}

// Preset Card Component
function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: (typeof THEME_PRESETS)[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const palette = COLOR_PALETTES.find((p) => p.id === preset.paletteId);

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
      )}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex gap-1 mb-2">
        <div
          className="w-5 h-5 rounded-full border"
          style={{ backgroundColor: preset.preview?.primaryColor || palette?.colors.primary }}
        />
        <div
          className="w-5 h-5 rounded-full border"
          style={{ backgroundColor: preset.preview?.secondaryColor || palette?.colors.secondary }}
        />
      </div>

      <div className="font-medium text-xs truncate">{preset.name}</div>
    </button>
  );
}

// Palette Card Component
function PaletteCard({
  palette,
  isSelected,
  onSelect,
}: {
  palette: ThemePalette;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
      )}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex gap-1 mb-2">
        <div className="w-5 h-5 rounded border" style={{ backgroundColor: palette.colors.primary }} />
        <div className="w-5 h-5 rounded border" style={{ backgroundColor: palette.colors.secondary }} />
        <div className="w-5 h-5 rounded border" style={{ backgroundColor: palette.colors.accent }} />
      </div>

      <div className="font-medium text-xs truncate">{palette.name}</div>
    </button>
  );
}

// Font Card Component
function FontCard({
  fontPair,
  isSelected,
  onSelect,
}: {
  fontPair: (typeof FONT_PAIRS)[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative w-full p-3 rounded-lg border-2 text-left transition-all hover:shadow-md',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}

      <div className="text-xs text-muted-foreground mb-1">{fontPair.name}</div>
      <div className="text-lg font-bold truncate" style={{ fontFamily: fontPair.headingFontFamily }}>
        Aa Bb Cc
      </div>
    </button>
  );
}
