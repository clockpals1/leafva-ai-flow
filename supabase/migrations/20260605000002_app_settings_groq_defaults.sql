-- Switch default AI provider from Lovable gateway to Groq
-- Safe to run multiple times (UPDATE is idempotent when value hasn't been customised)

UPDATE public.app_settings
SET
  value       = 'https://api.groq.com/openai/v1/chat/completions',
  description = 'OpenAI-compatible /v1/chat/completions endpoint'
WHERE key = 'ai_gateway_url'
  AND (value = '' OR value = 'https://ai.gateway.lovable.dev/v1/chat/completions');

UPDATE public.app_settings
SET
  value       = 'llama-3.3-70b-versatile',
  description = 'Model identifier — Groq: llama-3.3-70b-versatile | OpenAI: gpt-4o | Anthropic: claude-3-5-sonnet'
WHERE key = 'ai_model'
  AND (value = '' OR value = 'google/gemini-2.5-flash');

UPDATE public.app_settings
SET description = 'API key for your AI provider (Groq, OpenAI, Anthropic, Together AI, etc.)'
WHERE key = 'ai_api_key';
