-- high_risk_churn_merchants: Refunded ∩ Uninstalled ∩ Lost
-- @see docs/DATA_MODEL_SPEC.md

CREATE TABLE high_risk_churn_merchants (
  month DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  refund_amount DECIMAL(14, 2) NOT NULL,
  uninstall_date DATE NOT NULL,
  last_active_month DATE NOT NULL,
  PRIMARY KEY (month, merchant_id, app_id)
);
