'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Maximize2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COLOR_PALETTES,
  FONT_PAIRS,
  THEME_PRESETS,
  type ThemeConfig,
  type ThemeSpacing,
  type ThemeRadius,
} from '@/lib/themes';

interface ThemeEditorProps {
  value: ThemeConfig;
  onChange: (config: ThemeConfig) => void;
  className?: string;
}

export function ThemeEditor({ value, onChange, className }: ThemeEditorProps) {
  const [activeTab, setActiveTab] = useState('presets');

  const handlePaletteChange = useCallback(
    (paletteId: string) => {
      onChange({ ...value, paletteId });
    },
    [value, onChange]
  );

  const handleFontChange = useCallback(
    (fontPairId: string) => {
      onChange({ ...value, fontPairId });
    },
    [value, onChange]
  );

  const handleSpacingChange = useCallback(
    (spacing: ThemeSpacing) => {
      onChange({ ...value, spacing });
    },
    [value, onChange]
  );

  const handleRadiusChange = useCallback(
    (radius: ThemeRadius) => {
      onChange({ ...value, radius });
    },
    [value, onChange]
  );

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = THEME_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        onChange({
          paletteId: preset.paletteId,
          fontPairId: preset.fontPairId,
          spacing: preset.spacing,
          radius: preset.radius,
        });
      }
    },
    [onChange]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4 grid grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="presets" className="text-xs">
            Presets
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs">
            Colors
          </TabsTrigger>
          <TabsTrigger value="fonts" className="text-xs">
            Fonts
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            Layout
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <TabsContent value="presets" className="h-full mt-0">
            <PresetSelector value={value} onSelect={handlePresetSelect} />
          </TabsContent>

          <TabsContent value="colors" className="h-full mt-0">
            <PaletteSelector value={value.paletteId} onChange={handlePaletteChange} />
          </TabsContent>

          <TabsContent value="fonts" className="h-full mt-0">
            <FontSelector value={value.fontPairId} onChange={handleFontChange} />
          </TabsContent>

          <TabsContent value="layout" className="h-full mt-0">
            <LayoutEditor
              spacing={value.spacing}
              radius={value.radius}
              onSpacingChange={handleSpacingChange}
              onRadiusChange={handleRadiusChange}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Preset Selector Component
function PresetSelector({
  value,
  onSelect,
}: {
  value: ThemeConfig;
  onSelect: (presetId: string) => void;
}) {
  // Find matching preset
  const matchingPreset = THEME_PRESETS.find(
    (p) =>
      p.paletteId === value.paletteId &&
      p.fontPairId === value.fontPairId &&
      p.spacing === value.spacing &&
      p.radius === value.radius
  );

  return (
    <ScrollArea className="h-[400px] pr-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {THEME_PRESETS.map((preset) => {
          const isSelected = matchingPreset?.id === preset.id;
          const palette = COLOR_PALETTES.find((p) => p.id === preset.paletteId);

          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all hover:shadow-md',
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              {/* Color Preview */}
              <div className="flex gap-1 mb-2">
                <div
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: preset.preview?.primaryColor || palette?.colors.primary }}
                />
                <div
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: preset.preview?.secondaryColor || palette?.colors.secondary }}
                />
              </div>

              <div className="font-medium text-sm truncate">{preset.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{preset.description}</div>

              <div className="flex flex-wrap gap-1 mt-2">
                {preset.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Palette Selector Component
function PaletteSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (paletteId: string) => void;
}) {
  return (
    <ScrollArea className="h-[400px] pr-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COLOR_PALETTES.map((palette) => {
          const isSelected = value === palette.id;

          return (
            <button
              key={palette.id}
              onClick={() => onChange(palette.id)}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all hover:shadow-md',
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              {/* Color Swatches */}
              <div className="flex gap-1 mb-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: palette.colors.primary }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: palette.colors.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: palette.colors.accent }}
                  title="Accent"
                />
              </div>

              {/* Background Preview */}
              <div
                className="h-8 rounded border mb-2 flex items-center justify-center text-xs"
                style={{
                  backgroundColor: palette.colors.background,
                  color: palette.colors.foreground,
                  borderColor: palette.colors.border,
                }}
              >
                Aa
              </div>

              <div className="font-medium text-sm">{palette.name}</div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Font Selector Component
function FontSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (fontPairId: string) => void;
}) {
  // Load Google Fonts for preview
  useEffect(() => {
    const existingLinks = document.querySelectorAll('link[data-theme-font-preview]');
    existingLinks.forEach((link) => link.remove());

    FONT_PAIRS.forEach((pair) => {
      if (pair.googleFontsUrl) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = pair.googleFontsUrl;
        link.setAttribute('data-theme-font-preview', 'true');
        document.head.appendChild(link);
      }
    });
  }, []);

  return (
    <ScrollArea className="h-[400px] pr-3">
      <div className="space-y-3">
        {FONT_PAIRS.map((fontPair) => {
          const isSelected = value === fontPair.id;

          return (
            <button
              key={fontPair.id}
              onClick={() => onChange(fontPair.id)}
              className={cn(
                'relative w-full p-4 rounded-lg border-2 text-left transition-all hover:shadow-md',
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              <div className="text-xs text-muted-foreground mb-1">{fontPair.name}</div>

              {/* Font Preview */}
              <div
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: fontPair.headingFontFamily }}
              >
                Heading Text
              </div>
              <div
                className="text-sm text-muted-foreground"
                style={{ fontFamily: fontPair.bodyFontFamily }}
              >
                Body text looks like this. The quick brown fox jumps over the lazy dog.
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Layout Editor Component
function LayoutEditor({
  spacing,
  radius,
  onSpacingChange,
  onRadiusChange,
}: {
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  onSpacingChange: (spacing: ThemeSpacing) => void;
  onRadiusChange: (radius: ThemeRadius) => void;
}) {
  const spacingOptions: { value: ThemeSpacing; label: string; description: string }[] = [
    { value: 'compact', label: 'Compact', description: 'Tighter spacing for dense content' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing (recommended)' },
    { value: 'spacious', label: 'Spacious', description: 'More breathing room' },
  ];

  const radiusOptions: { value: ThemeRadius; label: string; preview: string }[] = [
    { value: 'none', label: 'Sharp', preview: '0' },
    { value: 'small', label: 'Subtle', preview: '4px' },
    { value: 'medium', label: 'Medium', preview: '8px' },
    { value: 'large', label: 'Rounded', preview: '16px' },
    { value: 'full', label: 'Pill', preview: '999px' },
  ];

  return (
    <div className="space-y-6">
      {/* Spacing */}
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <Maximize2 className="w-4 h-4" />
          Spacing
        </Label>
        <RadioGroup value={spacing} onValueChange={(value: string) => onSpacingChange(value as ThemeSpacing)}>
          {spacingOptions.map((option) => (
            <div
              key={option.value}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                spacing === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onSpacingChange(option.value)}
            >
              <RadioGroupItem value={option.value} id={`spacing-${option.value}`} />
              <div className="flex-1">
                <Label htmlFor={`spacing-${option.value}`} className="cursor-pointer font-medium">
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Border Radius */}
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <Circle className="w-4 h-4" />
          Corners
        </Label>
        <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-5">
          {radiusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onRadiusChange(option.value)}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                radius === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div
                className="w-8 h-8 bg-primary mb-2"
                style={{ borderRadius: option.preview }}
              />
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

