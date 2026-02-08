-- package_catalog, growth_forecast_monthly, monthly_briefs
-- @see docs/DATA_MODEL_SPEC.md, docs/INGESTION_WORKFLOW.md

CREATE TABLE package_catalog (
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  tier TEXT,
  PRIMARY KEY (app_id, plan_id)
);

CREATE TABLE growth_forecast_monthly (
  month DATE NOT NULL,
  app_id TEXT NOT NULL,
  projected_billed DECIMAL(14, 2),
  churn_rate DECIMAL(5, 4),
  renewal_rate DECIMAL(5, 4),
  assumptions TEXT,
  PRIMARY KEY (month, app_id)
);

CREATE TABLE monthly_briefs (
  month DATE PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'nova',
  headline_gross_billed DECIMAL(14, 2),
  mom_delta DECIMAL(14, 2),
  mom_delta_pct DECIMAL(8, 4),
  brief_markdown TEXT,
  evidence_links JSONB,
  flags JSONB
);
