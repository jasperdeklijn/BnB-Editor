-- Add custom_domain column to websites table
ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS custom_domain TEXT DEFAULT NULL;

-- Add a unique constraint so two sites can't share the same custom domain
ALTER TABLE websites
  ADD CONSTRAINT websites_custom_domain_unique UNIQUE (custom_domain);

-- Index for fast custom-domain lookups in middleware
CREATE INDEX IF NOT EXISTS idx_websites_custom_domain ON websites (custom_domain)
  WHERE custom_domain IS NOT NULL;
