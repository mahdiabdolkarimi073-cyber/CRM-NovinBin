-- Academy API Keys table for external integrations
CREATE TABLE IF NOT EXISTS academy_api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL,                          -- AcademyUser.id of the admin who owns this key
  label       TEXT NOT NULL DEFAULT 'افزونه',         -- human-readable label for this key
  api_key     TEXT NOT NULL UNIQUE,                    -- the actual API key (random token)
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_academy_api_keys_admin_id ON academy_api_keys(admin_id);
CREATE INDEX IF NOT EXISTS idx_academy_api_keys_api_key ON academy_api_keys(api_key);
