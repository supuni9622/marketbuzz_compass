-- RLS Tripwire: block anon/authenticated access to internal tables
-- API uses service_role and bypasses these policies
-- Protects: direct Supabase client usage, accidental future exposure
-- Does NOT protect: API bugs (service_role bypasses RLS)
-- @see docs/progressql_supabase_rsl_decisions.md

ALTER TABLE charges_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charges_raw_tripwire" ON charges_raw FOR ALL USING (false);

ALTER TABLE ingestion_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingestion_uploads_tripwire" ON ingestion_uploads FOR ALL USING (false);

ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingestion_runs_tripwire" ON ingestion_runs FOR ALL USING (false);

ALTER TABLE monthly_revenue_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mrl_tripwire" ON monthly_revenue_lifecycle FOR ALL USING (false);

ALTER TABLE merchant_lifecycle_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mlm_tripwire" ON merchant_lifecycle_monthly FOR ALL USING (false);

ALTER TABLE nra_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nra_monthly_tripwire" ON nra_monthly FOR ALL USING (false);

ALTER TABLE nra_merchants_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nra_merchants_tripwire" ON nra_merchants_monthly FOR ALL USING (false);

ALTER TABLE refund_merchants_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refund_merchants_tripwire" ON refund_merchants_monthly FOR ALL USING (false);

ALTER TABLE uninstall_merchants_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uninstall_merchants_tripwire" ON uninstall_merchants_monthly FOR ALL USING (false);

ALTER TABLE high_risk_churn_merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "high_risk_churn_tripwire" ON high_risk_churn_merchants FOR ALL USING (false);

ALTER TABLE package_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_catalog_tripwire" ON package_catalog FOR ALL USING (false);

ALTER TABLE growth_forecast_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_forecast_tripwire" ON growth_forecast_monthly FOR ALL USING (false);

ALTER TABLE monthly_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_briefs_tripwire" ON monthly_briefs FOR ALL USING (false);
