CREATE TABLE IF NOT EXISTS project_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    summary VARCHAR(500) NOT NULL,
    details TEXT,
    weather VARCHAR(120),
    crew_size INT CHECK (crew_size IS NULL OR crew_size >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_project_lookup
    ON project_daily_logs(tenant_id, project_id, log_date DESC);