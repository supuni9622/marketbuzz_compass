-- nra_monthly, nra_merchants_monthly: New Revenue Added
-- @see docs/DATA_MODEL_SPEC.md

CREATE TABLE nra_monthly (
  month DATE NOT NULL,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  nra_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  nra_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (month, app_id)
);

CREATE TABLE nra_merchants_monthly (
  month DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (month, merchant_id, app_id)
);

CREATE INDEX idx_nra_merchants_month ON nra_merchants_monthly(month);
CREATE INDEX idx_nra_merchants_merchant ON nra_merchants_monthly(merchant_id);
