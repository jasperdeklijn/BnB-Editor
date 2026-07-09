'use client';

import { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Palette, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorLayout } from '@/components/editor/editor-layout-context';
import { StatusMessage } from '@/components/ui/status-message';
import {
  COLOR_PALETTES,
  FONT_PAIRS,
  THEME_PRESETS,
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

const PRESET_LABELS: Record<string, string> = {
  'corporate-classic': 'Zakelijk klassiek',
  'tech-startup': 'Moderne techniek',
  'wellness-calm': 'Rustige wellness',
  'natural-organic': 'Natuurlijk groen',
  'creative-bold': 'Creatief opvallend',
  'elegant-studio': 'Elegante studio',
  'restaurant-warm': 'Warm restaurant',
  'bistro-chic': 'Stijlvolle bistro',
  'beauty-rose': 'Zachte schoonheid',
  'salon-modern': 'Moderne salon',
  'construction-bold': 'Sterk vakwerk',
  'professional-trade': 'Betrouwbare dienst',
  'midnight-premium': 'Donker premium',
  'dark-minimal': 'Donker minimalistisch',
  'sunset-energy': 'Energiek warm',
  'classic-burgundy': 'Klassiek bordeaux',
};

const PALETTE_LABELS: Record<string, string> = {
  'slate-modern': 'Modern leigrijs',
  'ocean-blue': 'Oceaanblauw',
  'forest-green': 'Bosgroen',
  'warm-earth': 'Warme aarde',
  'rose-elegant': 'Zacht roos',
  midnight: 'Nachtblauw',
  charcoal: 'Antraciet',
  terracotta: 'Terracotta',
  burgundy: 'Bordeaux',
  'steel-blue': 'Staalblauw',
  'teal-fresh': 'Fris zeegroen',
  'pure-minimal': 'Puur minimalistisch',
  'warm-neutral': 'Warm neutraal',
  electric: 'Fel creatief',
  sunset: 'Zonsondergang',
};

const SPACING_LABELS: Record<ThemeSpacing, string> = {
  compact: 'Compact',
  comfortable: 'Comfortabel',
  spacious: 'Ruim',
};

const RADIUS_OPTIONS: Array<{ value: ThemeRadius; label: string }> = [
  { value: 'none', label: 'Recht' },
  { value: 'small', label: 'Klein' },
  { value: 'medium', label: 'Rond' },
  { value: 'large', label: 'Extra rond' },
];

function getPresetLabel(preset: (typeof THEME_PRESETS)[0]) {
  return PRESET_LABELS[preset.id] ?? preset.name;
}

function getPaletteLabel(palette: ThemePalette) {
  return PALETTE_LABELS[palette.id] ?? palette.name;
}

export function ThemePanel({
  websiteId,
  businessCategory,
  currentTheme,
  onThemeChange,
  className,
}: ThemePanelProps) {
  const [theme, setTheme] = useState<ThemeConfig>(currentTheme || DEFAULT_THEME);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('presets');
  const { setIsSaving: setHeaderSaving, setSaveState } = useEditorLayout();

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
        setHeaderSaving(true);
        setStatus(null);
        let failed = false;
        try {
          const response = await fetch('/api/themes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ websiteId, themeConfig: newTheme }),
          });

          if (!response.ok) {
            throw new Error('Failed to save theme');
          }

          setStatus({ tone: "success", text: "Thema opgeslagen." });
        } catch {
          failed = true;
          setStatus({ tone: "error", text: "Kon thema niet opslaan." });
        } finally {
          setIsSaving(false);
          setHeaderSaving(false);
          if (failed) setSaveState("error");
        }
      }
    },
    [websiteId, onThemeChange, setHeaderSaving, setSaveState]
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
  const visibleRecommendedPresets = recommendedPresets.slice(0, 4);
  const visibleRecommendedPresetIds = new Set(visibleRecommendedPresets.map((preset) => preset.id));
  const otherPresets = businessCategory
    ? THEME_PRESETS.filter((preset) => !visibleRecommendedPresetIds.has(preset.id))
    : THEME_PRESETS;
  const themePanelOptions = [
    { value: 'presets', label: 'Thema kiezen' },
    { value: 'colors', label: 'Kleuren kiezen' },
    { value: 'fonts', label: 'Letters kiezen' },
  ];

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 border-b sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="truncate font-medium text-sm">Website thema</span>
        </div>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {status ? <StatusMessage tone={status.tone} className="m-3 mb-0 sm:mx-4">{status.text}</StatusMessage> : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-3 mt-3 sm:mx-4 md:hidden">
          <label htmlFor="theme-panel-mobile-mode" className="sr-only">
            Website thema onderdeel
          </label>
          <select
            id="theme-panel-mobile-mode"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {themePanelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <TabsList className="mx-3 mt-3 hidden grid-cols-3 sm:mx-4 md:grid">
          <TabsTrigger value="presets" className="text-xs">
            Thema&apos;s
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs">
            Kleuren
          </TabsTrigger>
          <TabsTrigger value="fonts" className="text-xs">
            Letters
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 p-3 sm:p-4">
          <TabsContent value="presets" className="h-full min-h-0 mt-0 overflow-hidden">
            <ScrollArea className="h-full min-h-0">
              {businessCategory && recommendedPresets.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <Label className="text-xs text-muted-foreground">Aanbevolen voor jouw bedrijf</Label>
                  </div>
                  <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2">
                    {visibleRecommendedPresets.map((preset) => (
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

              <Label className="text-xs text-muted-foreground mb-3 block">
                {businessCategory && recommendedPresets.length > 0 ? 'Andere thema\'s' : 'Alle thema\'s'}
              </Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {otherPresets.map((preset) => (
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

          <TabsContent value="colors" className="h-full min-h-0 mt-0 overflow-hidden">
            <ScrollArea className="h-full min-h-0">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

          <TabsContent value="fonts" className="h-full min-h-0 mt-0 overflow-hidden">
            <ScrollArea className="h-full min-h-0">
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
      <div className="border-t p-3 space-y-4 sm:p-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Afstand</Label>
          <div className="grid grid-cols-1 gap-1 min-[360px]:grid-cols-3">
            {(['compact', 'comfortable', 'spacious'] as ThemeSpacing[]).map((s) => (
              <Button
                key={s}
                variant={theme.spacing === s ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => handleSpacingChange(s)}
              >
                {SPACING_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Hoeken</Label>
          <div className="grid grid-cols-2 gap-1 min-[420px]:grid-cols-4">
            {RADIUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={theme.radius === option.value ? 'default' : 'outline'}
                size="sm"
                className="h-auto flex-col gap-1 px-2 py-2 text-xs"
                onClick={() => handleRadiusChange(option.value)}
              >
                <div
                  className="w-4 h-4 border-2 border-current"
                  style={{ borderRadius: RADIUS_VALUES[option.value] }}
                />
                <span>{option.label}</span>
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

      <div className="font-medium text-xs truncate">{getPresetLabel(preset)}</div>
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

      <div className="font-medium text-xs truncate">{getPaletteLabel(palette)}</div>
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
