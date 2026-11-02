CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#15202B',
    secondary_color VARCHAR(7) DEFAULT '#B3261E',
    enable_estimator BOOLEAN DEFAULT TRUE,
    enable_client_portal BOOLEAN DEFAULT TRUE,
    enable_change_orders BOOLEAN DEFAULT FALSE,
    estimator_pricing_matrix JSONB DEFAULT '{}'::jsonb,
    branding_config JSONB DEFAULT '{
      "typography": { "font_family": "Archivo", "base_size": "16px" },
      "layout": { "navbar_style": "ruled", "sidebar_position": "left", "border_radius": "0" },
      "assets": { "favicon_url": "/favicon.ico", "email_banner_url": "/email-banner.png" },
      "palette": { "background": "#F8F9F9", "surface": "#FFFFFF" }
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'field_staff', 'client')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
    current_phase VARCHAR(100) DEFAULT 'Permitting',
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cost_impact NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    signed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    signed_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_order_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    change_order_id UUID NOT NULL UNIQUE REFERENCES change_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    signer_name VARCHAR(255) NOT NULL,
    consent_text TEXT NOT NULL,
    signature_hash TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    signed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX IF NOT EXISTS idx_users_tenant_lookup ON users(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_lookup ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_client_lookup ON projects(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_tenant_lookup ON change_orders(tenant_id, project_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_lookup ON audit_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signatures_tenant_lookup ON change_order_signatures(tenant_id, signed_at DESC);
