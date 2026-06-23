/**
 * Font Pairings
 * Professional font combinations using Google Fonts
 */

import type { ThemeFontPair } from './types';

export const FONT_PAIRS: ThemeFontPair[] = [
  {
    id: 'inter-system',
    name: 'Inter (Modern)',
    headingFont: 'Inter',
    headingFontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Inter',
    bodyFontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    id: 'poppins-inter',
    name: 'Poppins + Inter',
    headingFont: 'Poppins',
    headingFontFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Inter',
    bodyFontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Poppins:wght@500;600;700&display=swap',
  },
  {
    id: 'playfair-lato',
    name: 'Playfair + Lato',
    headingFont: 'Playfair Display',
    headingFontFamily: '"Playfair Display", ui-serif, Georgia, serif',
    bodyFont: 'Lato',
    bodyFontFamily: '"Lato", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@500;600;700&display=swap',
  },
  {
    id: 'montserrat-opensans',
    name: 'Montserrat + Open Sans',
    headingFont: 'Montserrat',
    headingFontFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Open Sans',
    bodyFontFamily: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Open+Sans:wght@400;500&display=swap',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans (Clean)',
    headingFont: 'DM Sans',
    headingFontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'DM Sans',
    bodyFontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  },
  {
    id: 'raleway-roboto',
    name: 'Raleway + Roboto',
    headingFont: 'Raleway',
    headingFontFamily: '"Raleway", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Roboto',
    bodyFontFamily: '"Roboto", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700&family=Roboto:wght@400;500&display=swap',
  },
  {
    id: 'merriweather-source',
    name: 'Merriweather + Source Sans',
    headingFont: 'Merriweather',
    headingFontFamily: '"Merriweather", ui-serif, Georgia, serif',
    bodyFont: 'Source Sans 3',
    bodyFontFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;600&display=swap',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk (Tech)',
    headingFont: 'Space Grotesk',
    headingFontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Space Grotesk',
    bodyFontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
  {
    id: 'libre-baskerville',
    name: 'Libre Baskerville (Classic)',
    headingFont: 'Libre Baskerville',
    headingFontFamily: '"Libre Baskerville", ui-serif, Georgia, serif',
    bodyFont: 'Libre Baskerville',
    bodyFontFamily: '"Libre Baskerville", ui-serif, Georgia, serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
  },
  {
    id: 'outfit-nunito',
    name: 'Outfit + Nunito',
    headingFont: 'Outfit',
    headingFontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Nunito',
    bodyFontFamily: '"Nunito", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500&family=Outfit:wght@500;600;700&display=swap',
  },
  {
    id: 'work-sans',
    name: 'Work Sans (Friendly)',
    headingFont: 'Work Sans',
    headingFontFamily: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
    bodyFont: 'Work Sans',
    bodyFontFamily: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap',
  },
  {
    id: 'cormorant-proza',
    name: 'Cormorant + Proza Libre',
    headingFont: 'Cormorant Garamond',
    headingFontFamily: '"Cormorant Garamond", ui-serif, Georgia, serif',
    bodyFont: 'Proza Libre',
    bodyFontFamily: '"Proza Libre", ui-sans-serif, system-ui, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Proza+Libre:wght@400;500&display=swap',
  },
];

// Helper to get font pair by ID
export function getFontPairById(id: string): ThemeFontPair | undefined {
  return FONT_PAIRS.find((f) => f.id === id);
}

// Default font pair
export const DEFAULT_FONT_PAIR_ID = 'inter-system';
