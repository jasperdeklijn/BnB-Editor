/**
 * Theme Presets
 * Complete theme combinations for different business types and styles
 */

import type { ThemePreset } from './types';

export const THEME_PRESETS: ThemePreset[] = [
  // Professional & Corporate
  {
    id: 'corporate-classic',
    name: 'Corporate Classic',
    description: 'Professional and trustworthy, perfect for consulting and B2B services',
    paletteId: 'slate-modern',
    fontPairId: 'inter-system',
    spacing: 'comfortable',
    radius: 'medium',
    tags: ['professional', 'corporate', 'consulting', 'b2b'],
    preview: { primaryColor: '#1e293b', secondaryColor: '#64748b' },
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern and innovative, great for tech companies and startups',
    paletteId: 'steel-blue',
    fontPairId: 'space-grotesk',
    spacing: 'comfortable',
    radius: 'large',
    tags: ['tech', 'startup', 'modern', 'innovative'],
    preview: { primaryColor: '#1e40af', secondaryColor: '#3b82f6' },
  },
  // Wellness & Health
  {
    id: 'wellness-calm',
    name: 'Wellness Calm',
    description: 'Serene and balanced, ideal for health and wellness businesses',
    paletteId: 'teal-fresh',
    fontPairId: 'dm-sans',
    spacing: 'spacious',
    radius: 'large',
    tags: ['wellness', 'health', 'spa', 'yoga', 'coach'],
    preview: { primaryColor: '#0f766e', secondaryColor: '#14b8a6' },
  },
  {
    id: 'natural-organic',
    name: 'Natural Organic',
    description: 'Earthy and authentic, perfect for eco-friendly and natural products',
    paletteId: 'forest-green',
    fontPairId: 'merriweather-source',
    spacing: 'comfortable',
    radius: 'medium',
    tags: ['organic', 'natural', 'eco', 'gardening', 'sustainable'],
    preview: { primaryColor: '#166534', secondaryColor: '#22c55e' },
  },
  // Creative & Artistic
  {
    id: 'creative-bold',
    name: 'Creative Bold',
    description: 'Vibrant and expressive, great for creative professionals',
    paletteId: 'electric',
    fontPairId: 'poppins-inter',
    spacing: 'comfortable',
    radius: 'large',
    tags: ['creative', 'photography', 'design', 'art', 'portfolio'],
    preview: { primaryColor: '#7c3aed', secondaryColor: '#8b5cf6' },
  },
  {
    id: 'elegant-studio',
    name: 'Elegant Studio',
    description: 'Sophisticated and refined, ideal for premium creative services',
    paletteId: 'pure-minimal',
    fontPairId: 'playfair-lato',
    spacing: 'spacious',
    radius: 'small',
    tags: ['elegant', 'studio', 'photography', 'luxury', 'portfolio'],
    preview: { primaryColor: '#171717', secondaryColor: '#525252' },
  },
  // Food & Hospitality
  {
    id: 'restaurant-warm',
    name: 'Restaurant Warm',
    description: 'Inviting and appetizing, perfect for restaurants and cafes',
    paletteId: 'terracotta',
    fontPairId: 'cormorant-proza',
    spacing: 'comfortable',
    radius: 'medium',
    tags: ['restaurant', 'cafe', 'food', 'hospitality', 'bistro'],
    preview: { primaryColor: '#c2410c', secondaryColor: '#ea580c' },
  },
  {
    id: 'bistro-chic',
    name: 'Bistro Chic',
    description: 'Stylish and contemporary, great for modern dining establishments',
    paletteId: 'charcoal',
    fontPairId: 'raleway-roboto',
    spacing: 'comfortable',
    radius: 'small',
    tags: ['restaurant', 'bar', 'nightlife', 'modern', 'upscale'],
    preview: { primaryColor: '#f8fafc', secondaryColor: '#94a3b8' },
  },
  // Beauty & Personal Care
  {
    id: 'beauty-rose',
    name: 'Beauty Rose',
    description: 'Feminine and elegant, ideal for beauty and salon businesses',
    paletteId: 'rose-elegant',
    fontPairId: 'outfit-nunito',
    spacing: 'comfortable',
    radius: 'large',
    tags: ['beauty', 'salon', 'spa', 'hairdresser', 'cosmetics'],
    preview: { primaryColor: '#9f1239', secondaryColor: '#e11d48' },
  },
  {
    id: 'salon-modern',
    name: 'Salon Modern',
    description: 'Clean and contemporary, perfect for modern salons',
    paletteId: 'warm-neutral',
    fontPairId: 'work-sans',
    spacing: 'comfortable',
    radius: 'medium',
    tags: ['salon', 'hairdresser', 'barber', 'beauty', 'modern'],
    preview: { primaryColor: '#44403c', secondaryColor: '#78716c' },
  },
  // Construction & Trades
  {
    id: 'construction-bold',
    name: 'Construction Bold',
    description: 'Strong and reliable, great for construction and trade businesses',
    paletteId: 'warm-earth',
    fontPairId: 'montserrat-opensans',
    spacing: 'compact',
    radius: 'small',
    tags: ['construction', 'contractor', 'trades', 'industrial', 'builder'],
    preview: { primaryColor: '#92400e', secondaryColor: '#d97706' },
  },
  {
    id: 'professional-trade',
    name: 'Professional Trade',
    description: 'Trustworthy and dependable, ideal for service professionals',
    paletteId: 'ocean-blue',
    fontPairId: 'dm-sans',
    spacing: 'comfortable',
    radius: 'medium',
    tags: ['plumber', 'electrician', 'handyman', 'service', 'trades'],
    preview: { primaryColor: '#0369a1', secondaryColor: '#0ea5e9' },
  },
  // Dark & Premium
  {
    id: 'midnight-premium',
    name: 'Midnight Premium',
    description: 'Dark and luxurious, perfect for premium brands',
    paletteId: 'midnight',
    fontPairId: 'libre-baskerville',
    spacing: 'spacious',
    radius: 'small',
    tags: ['premium', 'luxury', 'dark', 'exclusive', 'nightlife'],
    preview: { primaryColor: '#818cf8', secondaryColor: '#6366f1' },
  },
  {
    id: 'dark-minimal',
    name: 'Dark Minimal',
    description: 'Sleek and modern dark theme for tech-forward brands',
    paletteId: 'charcoal',
    fontPairId: 'space-grotesk',
    spacing: 'comfortable',
    radius: 'medium',
    tags: ['dark', 'tech', 'modern', 'minimal', 'developer'],
    preview: { primaryColor: '#f8fafc', secondaryColor: '#38bdf8' },
  },
  // Warm & Friendly
  {
    id: 'sunset-energy',
    name: 'Sunset Energy',
    description: 'Warm and energetic, great for dynamic businesses',
    paletteId: 'sunset',
    fontPairId: 'poppins-inter',
    spacing: 'comfortable',
    radius: 'large',
    tags: ['energetic', 'fitness', 'coaching', 'dynamic', 'warm'],
    preview: { primaryColor: '#dc2626', secondaryColor: '#f97316' },
  },
  {
    id: 'classic-burgundy',
    name: 'Classic Burgundy',
    description: 'Traditional and refined, ideal for established businesses',
    paletteId: 'burgundy',
    fontPairId: 'playfair-lato',
    spacing: 'comfortable',
    radius: 'small',
    tags: ['classic', 'traditional', 'wine', 'restaurant', 'refined'],
    preview: { primaryColor: '#7f1d1d', secondaryColor: '#b91c1c' },
  },
];

// Helper to get preset by ID
export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

// Get presets by tag
export function getPresetsByTag(tag: string): ThemePreset[] {
  return THEME_PRESETS.filter((p) => p.tags.includes(tag.toLowerCase()));
}

// Get recommended presets for a business category
export function getPresetsForCategory(category: string): ThemePreset[] {
  const categoryTagMap: Record<string, string[]> = {
    hairdresser: ['salon', 'beauty', 'hairdresser'],
    gardener: ['organic', 'natural', 'gardening'],
    coach: ['wellness', 'coaching', 'fitness'],
    restaurant: ['restaurant', 'food', 'cafe'],
    photographer: ['photography', 'creative', 'portfolio'],
    freelancer: ['professional', 'modern', 'portfolio'],
    construction: ['construction', 'trades', 'contractor'],
    general_service: ['professional', 'service', 'modern'],
  };

  const tags = categoryTagMap[category] || ['professional', 'modern'];
  const seen = new Set<string>();
  const results: ThemePreset[] = [];

  for (const tag of tags) {
    for (const preset of getPresetsByTag(tag)) {
      if (!seen.has(preset.id)) {
        seen.add(preset.id);
        results.push(preset);
      }
    }
  }

  return results;
}

// Default preset
export const DEFAULT_PRESET_ID = 'corporate-classic';
