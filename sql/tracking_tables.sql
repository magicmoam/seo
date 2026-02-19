-- Tracked URLs for scheduled audit snapshots
CREATE TABLE IF NOT EXISTS tracked_urls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    url TEXT NOT NULL,
    ga4_property_id TEXT DEFAULT '',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, url)
);

-- Audit snapshots for score trend tracking
CREATE TABLE IF NOT EXISTS audit_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracked_url_id UUID REFERENCES tracked_urls(id),
    user_email TEXT NOT NULL,
    url TEXT NOT NULL,
    overall_score INTEGER NOT NULL DEFAULT 0,
    category_scores JSONB DEFAULT '{}',
    issues_summary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tracked_urls_user ON tracked_urls(user_email, active);
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_url ON audit_snapshots(user_email, url, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_tracked ON audit_snapshots(tracked_url_id, created_at DESC);

-- Enable RLS
ALTER TABLE tracked_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for service role key, which Vercel uses)
CREATE POLICY "Allow all for service role" ON tracked_urls FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON audit_snapshots FOR ALL USING (true);
