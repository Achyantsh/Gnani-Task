-- Migration: Add extracted actions table for AudioNote
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS extracted_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    person_or_party TEXT,
    quantity_value NUMERIC,
    quantity_unit TEXT,
    amount_minor_units INTEGER,
    currency TEXT,
    payment_method TEXT,
    due_date_text TEXT,
    due_at TIMESTAMPTZ,
    evidence_quote TEXT,
    evidence_start_char INTEGER,
    evidence_end_char INTEGER,
    extraction_confidence NUMERIC,
    grounding_status TEXT DEFAULT 'needs_review',
    user_status TEXT DEFAULT 'needs_review',
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    user_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extracted_actions_user ON extracted_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_actions_conversation ON extracted_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_extracted_actions_user_status ON extracted_actions(user_id, user_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extracted_actions_conversation_evidence
    ON extracted_actions(conversation_id, evidence_quote)
    WHERE conversation_id IS NOT NULL AND evidence_quote IS NOT NULL;

-- Row Level Security
ALTER TABLE extracted_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions"
    ON extracted_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions"
    ON extracted_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
    ON extracted_actions FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_extracted_actions_updated_at
    BEFORE UPDATE ON extracted_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();