-- Migration: Add 'huggingface' to ai_agents api_type constraint
-- Run this in Supabase SQL Editor

ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_api_type_check;
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_api_type_check
  CHECK (api_type IN ('openai', 'gemini', 'openrouter', 'custom', 'huggingface'));
