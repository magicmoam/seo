-- Users and billing tables for trySEO.ai SaaS
-- Run this migration after 001_evidence_traces.sql

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    picture TEXT DEFAULT '',
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    credits_remaining INTEGER DEFAULT 5,
    credits_reset_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    credits_used INTEGER NOT NULL,
    tool_used TEXT NOT NULL,
    query TEXT DEFAULT '',
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_email ON credit_transactions (user_email);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions (created_at);
