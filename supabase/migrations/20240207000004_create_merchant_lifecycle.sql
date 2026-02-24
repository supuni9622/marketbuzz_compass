-- merchant_lifecycle_monthly: Active / AtRisk / Lost
-- @see docs/DATA_MODEL_SPEC.md

CREATE TYPE lifecycle_state AS ENUM ('Active', 'AtRisk', 'Lost');

CREATE TABLE merchant_lifecycle_monthly (
  month DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  lifecycle_state lifecycle_state NOT NULL,
  PRIMARY KEY (month, merchant_id, app_id)
);

CREATE INDEX idx_mlm_month_state ON merchant_lifecycle_monthly(month, lifecycle_state);
CREATE INDEX idx_mlm_merchant_app ON merchant_lifecycle_monthly(merchant_id, app_id);
CREATE INDEX idx_mlm_app_month ON merchant_lifecycle_monthly(app_id, month);
