-- ============================================
-- ToxiQ AI - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
  is_admin BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. AI AGENTS TABLE
-- ============================================
CREATE TABLE public.ai_agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  api_type TEXT NOT NULL CHECK (api_type IN ('openai', 'gemini', 'openrouter', 'custom', 'huggingface', 'veo3api')),
  model TEXT NOT NULL,
  api_key_env TEXT NOT NULL,
  system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  supports_images BOOLEAN DEFAULT FALSE,
  supports_voice BOOLEAN DEFAULT FALSE,
  supports_image_generation BOOLEAN DEFAULT FALSE,
  supports_video_generation BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. USER AI ACCESS TABLE
-- ============================================
CREATE TABLE public.user_ai_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE NOT NULL,
  allowed_prompts INTEGER DEFAULT 100,
  used_prompts INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ai_agent_id)
);

-- ============================================
-- 4. CONVERSATIONS TABLE
-- ============================================
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'New Chat',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. MESSAGES TABLE
-- ============================================
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'image_generation', 'code')),
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. ADMIN SETTINGS TABLE
-- ============================================
CREATE TABLE public.admin_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT DEFAULT '',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. ACTIVITY LOG
-- ============================================
CREATE TABLE public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_updated ON public.conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_user_ai_access_user ON public.user_ai_access(user_id);
CREATE INDEX idx_user_ai_access_agent ON public.user_ai_access(ai_agent_id);
CREATE INDEX idx_activity_log_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI Agents
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active agents" ON public.ai_agents
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage agents" ON public.ai_agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- User AI Access
ALTER TABLE public.user_ai_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access" ON public.user_ai_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all access" ON public.user_ai_access
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage access" ON public.user_ai_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create messages in own conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Admin Settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.admin_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Activity Log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity" ON public.activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Anyone can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update conversation message count
CREATE OR REPLACE FUNCTION public.update_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET message_count = (SELECT COUNT(*) FROM public.messages WHERE conversation_id = NEW.conversation_id),
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_message_count();

-- Update prompt usage
CREATE OR REPLACE FUNCTION public.increment_prompt_usage(p_user_id UUID, p_agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_ai_access
  SET used_prompts = used_prompts + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND ai_agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default admin settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('admin_panel_visible', '"true"', 'Whether the admin panel tab is visible'),
  ('registration_enabled', '"true"', 'Whether new registrations are allowed'),
  ('require_email_verification', '"true"', 'Whether new users must verify their email before logging in'),
  ('default_theme', '"dark"', 'Default theme for new users'),
  ('maintenance_mode', '"false"', 'Whether the site is in maintenance mode'),
  ('max_messages_per_day', '1000', 'Maximum messages per user per day'),
  ('allow_image_upload', '"true"', 'Whether image uploads are allowed'),
  ('allow_voice_messages', '"true"', 'Whether voice messages are allowed'),
  ('allow_image_generation', '"true"', 'Whether AI image generation is allowed');

-- Default AI Agents
INSERT INTO public.ai_agents (name, description, image_url, api_type, model, api_key_env, system_prompt, supports_images, supports_voice, supports_image_generation) VALUES
  ('ChatGPT-4o', 'OpenAI''s most advanced model. Excellent for complex reasoning, coding, and creative tasks.', '/agents/chatgpt.svg', 'openai', 'gpt-4o', 'OPENAI_API_KEY', 'You are ChatGPT, a helpful AI assistant made by OpenAI. You are knowledgeable, creative, and helpful.', true, true, false),
  ('ChatGPT-4o Mini', 'Fast and efficient model for everyday tasks. Great balance of speed and quality.', '/agents/chatgpt-mini.svg', 'openai', 'gpt-4o-mini', 'OPENAI_API_KEY', 'You are ChatGPT, a helpful AI assistant made by OpenAI. You are fast, efficient, and helpful.', true, true, false),
  ('Gemini Pro', 'Google''s advanced AI model. Great for analysis, research, and multi-modal tasks.', '/agents/gemini.svg', 'gemini', 'gemini-1.5-pro', 'GOOGLE_GEMINI_API_KEY', 'You are Gemini, a helpful AI assistant made by Google. You are knowledgeable and versatile.', true, true, false),
  ('Gemini Flash', 'Google''s fastest model. Optimized for quick responses and efficiency.', '/agents/gemini-flash.svg', 'gemini', 'gemini-1.5-flash', 'GOOGLE_GEMINI_API_KEY', 'You are Gemini Flash, a fast AI assistant made by Google. You are quick and efficient.', true, true, false),
  ('DALL-E 3', 'OpenAI''s image generation model. Creates stunning images from text descriptions.', '/agents/dalle.svg', 'openai', 'dall-e-3', 'OPENAI_API_KEY', 'You are an AI image generator. Create detailed, accurate images based on user descriptions.', false, false, true),
  ('Qwen 3.6 Plus', 'Qwen 3.6 Plus is Alibaba''s most powerful free AI model. 1M context, excellent for reasoning and multilingual tasks.', '/agents/qwen.svg', 'openrouter', 'qwen/qwen3.6-plus:free', 'OPENROUTER_API_KEY', 'You are Qwen, an advanced AI assistant. You are helpful, accurate, and creative.', true, true, false);
