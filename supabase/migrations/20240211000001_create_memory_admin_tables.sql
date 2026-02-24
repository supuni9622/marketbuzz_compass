-- Admin Memory Manager: items, versions, change-log.
-- @see docs/ADMIN_MEMORY_MANAGER_UI_SPEC.md, docs/MEMORY_FILE_STRUCTURE.md

CREATE TABLE memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  current_version_id UUID,
  owner TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_note TEXT,
  change_note TEXT,
  source TEXT DEFAULT 'manual',
  UNIQUE (item_id, version_number)
);

ALTER TABLE memory_items
  ADD CONSTRAINT memory_items_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES memory_versions(id);

CREATE TABLE memory_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES memory_items(id) ON DELETE SET NULL,
  version_id UUID REFERENCES memory_versions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX memory_versions_item_status ON memory_versions(item_id, status);
CREATE INDEX memory_change_log_item ON memory_change_log(item_id);
CREATE INDEX memory_change_log_created ON memory_change_log(created_at DESC);
