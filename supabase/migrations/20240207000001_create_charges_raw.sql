-- charges_raw: latest snapshot per charge (internal only)
-- @see docs/DATA_MODEL_SPEC.md
CREATE TYPE charge_status AS ENUM ('BILLED', 'COLLECTED', 'DEPOSITED', 'REFUND', 'OTHER');

CREATE TABLE charges_raw (
  charge_id TEXT PRIMARY KEY,
  charge_date DATE NOT NULL,
  charge_month DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  plan_name TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  status_current charge_status NOT NULL,
  uninstall_date DATE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_file_id TEXT
);

CREATE INDEX idx_charges_raw_charge_month ON charges_raw(charge_month);
CREATE INDEX idx_charges_raw_merchant_app ON charges_raw(merchant_id, app_id);
CREATE INDEX idx_charges_raw_status ON charges_raw(status_current);
CREATE INDEX idx_charges_raw_last_seen ON charges_raw(last_seen_at);

COMMENT ON TABLE charges_raw IS 'Latest snapshot per charge. UPSERT by charge_id. Internal only.';
