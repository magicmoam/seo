-- Evidence traces table for storing full evidence chain per search
CREATE TABLE IF NOT EXISTS evidence_traces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    search_id UUID,
    user_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    jina_raw_responses JSONB,
    system_prompt TEXT,
    user_prompt TEXT,
    llm_raw_response TEXT,
    routing_prompt TEXT,
    routing_raw_response TEXT,
    routing_reasoning TEXT,
    tool_used TEXT NOT NULL,
    query TEXT NOT NULL,
    model TEXT,
    total_input_tokens INT DEFAULT 0,
    total_output_tokens INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_evidence_search_id ON evidence_traces(search_id);
CREATE INDEX IF NOT EXISTS idx_evidence_user ON evidence_traces(user_email);
