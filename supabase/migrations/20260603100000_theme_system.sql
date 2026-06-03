-- Milestone 11: Theme System
-- Add theme_config column to websites table for storing theme configuration

-- Add theme_config JSONB column to websites
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN websites.theme_config IS 'Theme configuration including paletteId, fontPairId, spacing, and radius';

-- Create index for efficient theme queries
CREATE INDEX IF NOT EXISTS idx_websites_theme_config 
ON websites USING GIN (theme_config);

-- Example theme_config structure:
-- {
--   "paletteId": "slate-modern",
--   "fontPairId": "inter-system",
--   "spacing": "comfortable",
--   "radius": "medium"
-- }
