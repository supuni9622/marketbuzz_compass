-- monthly_revenue_lifecycle: baseline for growth tracking
-- @see docs/DATA_MODEL_SPEC.md

CREATE TABLE monthly_revenue_lifecycle (
  month DATE NOT NULL,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  billed_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  billed_count INTEGER NOT NULL DEFAULT 0,
  collected_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  deposited_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  refunded_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  net_statement_amount DECIMAL(14, 2),
  PRIMARY KEY (month, app_id)
);

CREATE INDEX idx_mrl_month ON monthly_revenue_lifecycle(month);
