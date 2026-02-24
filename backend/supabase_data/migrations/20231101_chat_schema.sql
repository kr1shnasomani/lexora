-- Supabase Chat Sessions and Messages Schema

-- 1. Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Assuming usage of Supabase Auth
    title TEXT DEFAULT 'New Analysis Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own sessions (If using authenticated endpoints)
CREATE POLICY "Users can manage their own sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to manage messages in their own sessions
CREATE POLICY "Users can manage their own messages" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE id = chat_messages.session_id AND user_id = auth.uid()
        )
    );

-- Index for querying chat history quickly
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON public.chat_messages(session_id, created_at);
