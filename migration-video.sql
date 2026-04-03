-- Add supports_video_generation column to ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS supports_video_generation BOOLEAN DEFAULT FALSE;

-- Update api_type CHECK constraint to include 'veo3api'
ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_api_type_check;
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_api_type_check CHECK (api_type IN ('openai', 'gemini', 'openrouter', 'custom', 'huggingface', 'veo3api'));
