-- refund_merchants_monthly, uninstall_merchants_monthly
-- @see docs/DATA_MODEL_SPEC.md

CREATE TABLE refund_merchants_monthly (
  month DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  refund_amount DECIMAL(14, 2) NOT NULL,
  charge_id TEXT NOT NULL,
  PRIMARY KEY (month, merchant_id, app_id, charge_id)
);

CREATE TABLE uninstall_merchants_monthly (
  uninstall_month DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  uninstall_date DATE NOT NULL,
  PRIMARY KEY (uninstall_month, merchant_id, app_id)
);
